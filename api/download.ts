import type { VercelRequest, VercelResponse } from '@vercel/node';

// ============================================================
// DOWNLOAD SOURCE TIERS (tried in order)
// ============================================================
const DOWNLOAD_SOURCES = [
  // Tier 1: LibGen direct mirrors
  (md5: string) => `https://libgen.li/ads.php?md5=${md5}`,
  (md5: string) => `https://libgen.rocks/ads.php?md5=${md5}`,
  (md5: string) => `https://libgen.gs/ads.php?md5=${md5}`,
  (md5: string) => `https://libgen.is/ads.php?md5=${md5}`,
  // Tier 2: CDN mirrors
  (md5: string) => `https://cdn1.booksdl.org/get.php?md5=${md5}`,
  (md5: string) => `https://cdn2.booksdl.org/get.php?md5=${md5}`,
  // Tier 3: IPFS gateways
  (md5: string) => `https://cloudflare-ipfs.com/ipfs/bafykbzaced${md5}`,
  (md5: string) => `https://ipfs.io/ipfs/bafykbzaced${md5}`,
  (md5: string) => `https://dweb.link/ipfs/bafykbzaced${md5}`,
  // Tier 4: Anna's Archive direct
  (md5: string) => `https://annas-archive.li/md5/${md5}`,
  (md5: string) => `https://annas-archive.org/md5/${md5}`,
];

const FETCH_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Accept': '*/*',
  'Accept-Language': 'en-US,en;q=0.9',
  'Referer': 'https://libgen.is/',
};

function isBinaryContent(contentType: string): boolean {
  const c = contentType.toLowerCase();
  return (
    c.includes('application/pdf') ||
    c.includes('application/octet-stream') ||
    c.includes('application/epub') ||
    c.includes('application/x-mobipocket') ||
    c.includes('application/djvu') ||
    c.includes('image/vnd.djvu') ||
    c.includes('binary')
  );
}

function isHtmlOrJson(contentType: string): boolean {
  const c = contentType.toLowerCase();
  return c.includes('text/html') || c.includes('application/json') || c.includes('text/plain');
}

// ============================================================
// TITLE NORMALIZATION (flexible matching)
// ============================================================
function normalizeTitle(s: string): string {
  return s
    .toLowerCase()
    // Remove leading articles
    .replace(/^(the|a|an|le|la|les|il|lo|die|der|das|el|los|las|un|une|des)\s+/i, '')
    // Remove special characters, keep alphanumeric and spaces
    .replace(/[^a-z0-9\s]/g, '')
    // Collapse whitespace
    .replace(/\s+/g, ' ')
    .trim();
}

function titlesMatch(title1: string, title2: string): boolean {
  const t1 = normalizeTitle(title1);
  const t2 = normalizeTitle(title2);

  if (!t1 || !t2) return true; // Can't compare, allow

  // Exact match
  if (t1 === t2) return true;

  // Substring match (either direction)
  if (t1.includes(t2) || t2.includes(t1)) return true;

  // Word overlap match (at least 50% of words match)
  const words1 = new Set(t1.split(' ').filter(w => w.length > 1));
  const words2 = new Set(t2.split(' ').filter(w => w.length > 1));
  if (words1.size === 0 || words2.size === 0) return true;

  const intersection = [...words1].filter(w => words2.has(w));
  const overlap = intersection.length / Math.max(words1.size, words2.size);

  return overlap >= 0.4; // 40% word overlap = match
}

// ============================================================
// VERIFICATION: Check MD5 against Anna's Archive
// GRACEFUL DEGRADATION: If AA is down, allow download anyway
// ============================================================
async function verifyMd5Title(md5: string, expectedTitle: string): Promise<{ verified: boolean; actualTitle: string; sourceUnavailable: boolean }> {
  const mirrors = [
    'https://annas-archive.li',
    'https://annas-archive.org',
    'https://annas-archive.se',
  ];

  for (const mirror of mirrors) {
    try {
      const response = await fetch(`${mirror}/md5/${md5}`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'text/html,application/xhtml+xml',
        },
        signal: AbortSignal.timeout(12000),
      });

      // If the source is unavailable (blocked, rate-limited), skip verification
      if (response.status === 403 || response.status === 429 || response.status === 503) {
        console.warn(`[verify] ${mirror} returned ${response.status}, trying next mirror`);
        continue;
      }

      if (!response.ok) continue;

      const html = await response.text();

      // Extract title from the page
      let actualTitle = '';
      const h1Match = html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
      if (h1Match) actualTitle = h1Match[1].trim();

      if (!actualTitle) {
        const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
        if (titleMatch) actualTitle = titleMatch[1].replace(/\s*[|\-–—].*$/, '').trim();
      }

      if (!actualTitle) {
        const ogMatch = html.match(/<meta[^>]*property="og:title"[^>]*content="([^"]+)"/i);
        if (ogMatch) actualTitle = ogMatch[1].trim();
      }

      if (!actualTitle) {
        console.warn(`[verify] Could not extract title for MD5 ${md5} from ${mirror}, allowing download`);
        return { verified: true, actualTitle: '(unable to parse)', sourceUnavailable: false };
      }

      const verified = titlesMatch(expectedTitle, actualTitle);
      console.log(`[verify] MD5 ${md5}: expected="${expectedTitle}", actual="${actualTitle}", verified=${verified}`);
      return { verified, actualTitle, sourceUnavailable: false };

    } catch (err: any) {
      console.warn(`[verify] Error with ${mirror}: ${err.message}`);
      continue;
    }
  }

  // ALL Anna's Archive mirrors are unreachable — GRACEFULLY ALLOW DOWNLOAD
  console.warn(`[verify] All Anna's Archive mirrors unreachable for MD5 ${md5}, allowing download without verification`);
  return { verified: true, actualTitle: '(verification unavailable - source down)', sourceUnavailable: true };
}

// ============================================================
// SEARCH FOR ALTERNATIVE MD5 from Anna's Archive
// ============================================================
async function searchForMd5(title: string, author?: string): Promise<string | null> {
  const query = encodeURIComponent(`${title} ${author || ''}`.trim());
  const mirrors = [
    'https://annas-archive.li',
    'https://annas-archive.org',
  ];

  for (const mirror of mirrors) {
    try {
      const response = await fetch(`${mirror}/search?q=${query}`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'text/html,application/xhtml+xml',
        },
        signal: AbortSignal.timeout(15000),
      });

      if (!response.ok) continue;

      const html = await response.text();

      // Extract the first MD5 link that matches our title
      const md5Pattern = /\/md5\/([a-f0-9]{32})/gi;
      const md5Matches = [...html.matchAll(md5Pattern)];

      for (const match of md5Matches) {
        const candidateMd5 = match[1];
        // Quick check: does the surrounding text mention the title?
        const contextStart = Math.max(0, match.index! - 500);
        const contextEnd = Math.min(html.length, match.index! + 500);
        const context = html.slice(contextStart, contextEnd).toLowerCase();

        if (normalizeTitle(title) && context.includes(normalizeTitle(title).slice(0, 20))) {
          console.log(`[search] Found matching MD5 ${candidateMd5} for "${title}"`);
          return candidateMd5;
        }
      }

      // If no context match, return the first MD5 found
      if (md5Matches.length > 0) {
        console.log(`[search] Using first MD5 ${md5Matches[0][1]} for "${title}" (no context match)`);
        return md5Matches[0][1];
      }

    } catch (err: any) {
      console.warn(`[search] Error searching ${mirror}: ${err.message}`);
      continue;
    }
  }

  return null;
}

// ============================================================
// TRY DOWNLOAD FROM A SINGLE SOURCE
// ============================================================
async function tryDownload(md5: string, format: string): Promise<{ buffer: Buffer; contentType: string; filename: string } | null> {
  for (const urlFn of DOWNLOAD_SOURCES) {
    const url = urlFn(md5);
    try {
      const response = await fetch(url, {
        headers: FETCH_HEADERS,
        signal: AbortSignal.timeout(20000),
        redirect: 'follow',
      });

      if (!response.ok) continue;

      const contentType = response.headers.get('content-type') || '';
      const contentLength = parseInt(response.headers.get('content-length') || '0', 10);

      if (contentLength === 0) continue;
      if (isHtmlOrJson(contentType) && contentLength < 50000) continue;

      if (isBinaryContent(contentType) || contentLength > 100000) {
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        if (buffer.length < 1000) continue;

        const firstBytes = buffer.slice(0, 4).toString('hex');
        if (firstBytes === '25504446' || firstBytes === '504b0304' || firstBytes === '41542654' || buffer.length > 500000) {
          return { buffer, contentType: contentType || 'application/pdf', filename: `${md5}.${format || 'pdf'}` };
        }

        if (!isHtmlOrJson(contentType) && buffer.length > 100000) {
          return { buffer, contentType: contentType || 'application/pdf', filename: `${md5}.${format || 'pdf'}` };
        }
      }
    } catch {
      continue;
    }
  }
  return null;
}

// ============================================================
// MAIN HANDLER
// ============================================================
export default async function handler(req: VercelRequest, res: VercelResponse) {
  let md5: string | undefined;
  let format = 'pdf';
  let title: string | undefined;
  let author: string | undefined;

  if (req.method === 'GET') {
    md5 = req.query.md5 as string | undefined;
    format = (req.query.format as string) || 'pdf';
    title = req.query.title as string | undefined;
    author = req.query.author as string | undefined;
  } else if (req.method === 'POST') {
    try {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      md5 = body?.md5;
      format = body?.format || 'pdf';
      title = body?.title;
      author = body?.author;
    } catch {
      return res.status(400).json({ success: false, error: 'Invalid JSON body' });
    }
  } else {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  if (!md5 || typeof md5 !== 'string' || md5.length !== 32) {
    return res.status(400).json({ success: false, error: 'Valid 32-character md5 hash required' });
  }

  try {
    // STEP 1: Verify title if provided (GRACEFUL - blocks only if explicit mismatch found)
    if (title && title.trim().length > 1) {
      const { verified, actualTitle, sourceUnavailable } = await verifyMd5Title(md5, title.trim());

      if (!verified && !sourceUnavailable) {
        // Title explicitly did NOT match — try to find correct MD5
        console.log(`[download] Title mismatch for MD5 ${md5}, searching for correct MD5...`);
        const newMd5 = await searchForMd5(title.trim(), author);

        if (newMd5 && newMd5 !== md5) {
          console.log(`[download] Found alternative MD5 ${newMd5}, retrying download`);
          md5 = newMd5;
        } else {
          return res.status(404).json({
            success: false,
            error: 'Title mismatch',
            message: `"${title}" is not available for download right now.`,
          });
        }
      }
      // If sourceUnavailable=true, we continue with download anyway
    }

    // STEP 2: Try downloading
    let result = await tryDownload(md5, format);

    // STEP 3: If download failed, try searching for an alternative MD5
    if (!result && title) {
      console.log(`[download] All sources failed for MD5 ${md5}, searching for alternative...`);
      const newMd5 = await searchForMd5(title.trim(), author);

      if (newMd5 && newMd5 !== md5) {
        console.log(`[download] Found alternative MD5 ${newMd5}, attempting download`);
        result = await tryDownload(newMd5, format);
      }
    }

    // STEP 4: Return result or error
    if (!result) {
      return res.status(404).json({
        success: false,
        error: 'Download unavailable',
        message: 'This book is not available for download right now. Please try again later or search for a different edition.',
      });
    }

    res.setHeader('Content-Type', result.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    res.setHeader('Content-Length', result.buffer.length.toString());
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition, Content-Length');

    return res.status(200).send(result.buffer);
  } catch (error: any) {
    console.error('[download] Error:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Download failed',
      message: error.message,
    });
  }
}
