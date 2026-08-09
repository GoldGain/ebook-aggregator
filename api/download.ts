import type { VercelRequest, VercelResponse } from '@vercel/node';

const FETCH_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Accept': '*/*',
  'Accept-Language': 'en-US,en;q=0.9',
};

// ============================================================
// HELPERS
// ============================================================
function isBinaryContent(contentType: string): boolean {
  const c = contentType.toLowerCase();
  return c.includes('application/pdf') || c.includes('application/octet-stream')
    || c.includes('application/epub') || c.includes('application/x-mobipocket')
    || c.includes('application/djvu') || c.includes('binary');
}

function isHtmlOrJson(contentType: string): boolean {
  const c = contentType.toLowerCase();
  return c.includes('text/html') || c.includes('application/json') || c.includes('text/plain');
}

function normalizeTitle(s: string): string {
  return s.toLowerCase().replace(/^(the|a|an|le|la|les|il|lo|die|der|das|el|los|las|un|une|des)\s+/i, '')
    .replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
}

function titlesFuzzyMatch(title1: string, title2: string): boolean {
  const t1 = normalizeTitle(title1);
  const t2 = normalizeTitle(title2);
  if (!t1 || !t2) return true;
  if (t1 === t2 || t1.includes(t2) || t2.includes(t1)) return true;
  const w1 = new Set(t1.split(' ').filter(w => w.length > 1));
  const w2 = new Set(t2.split(' ').filter(w => w.length > 1));
  if (w1.size === 0 || w2.size === 0) return true;
  const overlap = [...w1].filter(w => w2.has(w)).length / Math.max(w1.size, w2.size);
  return overlap >= 0.4;
}

async function streamToBuffer(response: Response): Promise<{ buffer: Buffer; contentType: string } | null> {
  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  if (buffer.length < 1000) return null;
  const firstBytes = buffer.slice(0, 4).toString('hex');
  // PDF: %PDF, EPUB/ZIP: PK, DJVU: AT&T
  if (firstBytes === '25504446' || firstBytes === '504b0304' || firstBytes === '41542654' || buffer.length > 500000) {
    return { buffer, contentType: response.headers.get('content-type') || 'application/pdf' };
  }
  return null;
}

// ============================================================
// STRATEGY 1: ANNA'S ARCHIVE (PRIMARY — not blocked by Vercel)
// ============================================================
async function downloadFromAnnasArchive(md5: string, title?: string): Promise<{ buffer: Buffer; contentType: string; filename: string } | null> {
  const mirrors = ['https://annas-archive.li', 'https://annas-archive.org', 'https://annas-archive.se'];

  for (const mirror of mirrors) {
    try {
      // Step 1: Get the MD5 info page
      const infoResp = await fetch(`${mirror}/md5/${md5}`, {
        headers: { ...FETCH_HEADERS, 'Accept': 'text/html,application/xhtml+xml' },
        signal: AbortSignal.timeout(15000),
        redirect: 'follow',
      });
      if (!infoResp.ok) continue;

      const html = await infoResp.text();

      // Step 1b: Verify title if provided
      if (title) {
        let pageTitle = '';
        const h1M = html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
        if (h1M) pageTitle = h1M[1].trim();
        if (!pageTitle) {
          const tM = html.match(/<title[^>]*>([^<]+)<\/title>/i);
          if (tM) pageTitle = tM[1].replace(/\s*[|\-–—].*$/, '').trim();
        }
        if (pageTitle && !titlesFuzzyMatch(title, pageTitle)) {
          console.warn(`[AA] Title mismatch: expected="${title}", found="${pageTitle}"`);
          return null; // Wrong book — don't download
        }
      }

      // Step 2: Extract actual download URLs from the page
      const downloadUrls: string[] = [];

      // Anna's Archive provides links to download sources
      // Look for links to LibGen, IPFS, and slow_download
      const linkPatterns = [
        /href="(https?:\/\/[^"]*libgen[^"]*)"/gi,
        /href="(https?:\/\/[^"]*ipfs[^"]*)"/gi,
        /href="(https?:\/\/[^"]*cloudflare-ipfs[^"]*)"/gi,
        /href="([^"]*slow_download[^"]*)"/gi,
        /href="([^"]*\/ds\/[^"]*)"/gi,
      ];

      for (const pattern of linkPatterns) {
        const matches = [...html.matchAll(pattern)];
        for (const m of matches) {
          let url = m[1];
          if (url.startsWith('/')) url = `${mirror}${url}`;
          if (!downloadUrls.includes(url)) downloadUrls.push(url);
        }
      }

      console.log(`[AA] Found ${downloadUrls.length} download URLs on ${mirror}`);

      // Step 3: Try each download URL
      for (const dlUrl of downloadUrls) {
        try {
          // If it's a slow_download link, we need to follow it to get the actual file
          const dlResp = await fetch(dlUrl, {
            headers: { ...FETCH_HEADERS, 'Referer': `${mirror}/md5/${md5}` },
            signal: AbortSignal.timeout(30000),
            redirect: 'follow',
          });

          if (!dlResp.ok) continue;

          const ct = dlResp.headers.get('content-type') || '';
          const cl = parseInt(dlResp.headers.get('content-length') || '0', 10);

          if (cl === 0) continue;
          if (isHtmlOrJson(ct) && cl < 50000) continue;

          if (isBinaryContent(ct) || cl > 100000) {
            const result = await streamToBuffer(dlResp);
            if (result) {
              console.log(`[AA] ✅ Downloaded from ${dlUrl.substring(0, 80)}`);
              return { ...result, filename: `${md5}.pdf` };
            }
          }
        } catch (err: any) {
          console.warn(`[AA] Failed download URL ${dlUrl.substring(0, 60)}: ${err.message}`);
          continue;
        }
      }
    } catch (err: any) {
      console.warn(`[AA] Mirror ${mirror} failed: ${err.message}`);
      continue;
    }
  }

  return null;
}

// ============================================================
// STRATEGY 2: INTERNET ARCHIVE (SECONDARY — not blocked)
// ============================================================
async function downloadFromInternetArchive(title: string, author?: string): Promise<{ buffer: Buffer; contentType: string; filename: string } | null> {
  try {
    // Search Internet Archive for the title
    const query = encodeURIComponent(`${title} ${author || ''}`.trim());
    const searchUrl = `https://archive.org/advancedsearch.php?q=${query}+AND+mediatype:texts&fl[]=identifier,title,creator&rows=10&output=json`;

    const searchResp = await fetch(searchUrl, {
      headers: FETCH_HEADERS,
      signal: AbortSignal.timeout(15000),
    });

    if (!searchResp.ok) return null;

    const data = await searchResp.json();
    const docs = data?.response?.docs || [];

    // Find the best matching document
    for (const doc of docs) {
      const docTitle = doc.title || '';
      if (!titlesFuzzyMatch(title, docTitle)) continue;

      const identifier = doc.identifier;
      if (!identifier) continue;

      // Try PDF download
      const pdfUrl = `https://archive.org/download/${identifier}/${identifier}.pdf`;
      console.log(`[IA] Trying: ${pdfUrl}`);

      try {
        const dlResp = await fetch(pdfUrl, {
          headers: FETCH_HEADERS,
          signal: AbortSignal.timeout(30000),
          redirect: 'follow',
        });

        if (!dlResp.ok) continue;

        const ct = dlResp.headers.get('content-type') || '';
        const result = await streamToBuffer(dlResp);
        if (result) {
          console.log(`[IA] ✅ Downloaded ${identifier}.pdf`);
          return { ...result, filename: `${identifier}.pdf` };
        }
      } catch {
        continue;
      }
    }

  } catch (err: any) {
    console.warn(`[IA] Search failed: ${err.message}`);
  }

  return null;
}

// ============================================================
// STRATEGY 3: OPEN LIBRARY (TERTIARY — not blocked)
// ============================================================
async function downloadFromOpenLibrary(title: string, author?: string): Promise<{ buffer: Buffer; contentType: string; filename: string } | null> {
  try {
    const query = encodeURIComponent(`${title} ${author || ''}`.trim());
    const searchUrl = `https://openlibrary.org/search.json?q=${query}&has_fulltext=true&limit=10&fields=key,title,author_name,editions`;

    const searchResp = await fetch(searchUrl, {
      headers: FETCH_HEADERS,
      signal: AbortSignal.timeout(15000),
    });

    if (!searchResp.ok) return null;

    const data = await searchResp.json();
    const docs = data?.docs || [];

    for (const doc of docs) {
      const docTitle = doc.title || '';
      if (!titlesFuzzyMatch(title, docTitle)) continue;

      const key = doc.key; // e.g., "/works/OL123W"
      if (!key) continue;

      // Try to get the edition with PDF
      const editionUrl = `https://openlibrary.org${key}.json`;
      try {
        const edResp = await fetch(editionUrl, {
          headers: FETCH_HEADERS,
          signal: AbortSignal.timeout(10000),
        });
        if (!edResp.ok) continue;

        const edData = await edResp.json();
        // Check for PDF links in ebooks
        const ebooks = edData?.ebooks || [];
        for (const ebook of ebooks) {
          if (ebook.formats?.pdf?.url) {
            const pdfUrl = ebook.formats.pdf.url;
            console.log(`[OL] Trying PDF: ${pdfUrl}`);
            try {
              const dlResp = await fetch(pdfUrl, {
                headers: FETCH_HEADERS,
                signal: AbortSignal.timeout(30000),
                redirect: 'follow',
              });
              if (dlResp.ok) {
                const result = await streamToBuffer(dlResp);
                if (result) {
                  console.log(`[OL] ✅ Downloaded from Open Library`);
                  return { ...result, filename: `${docTitle.replace(/[^a-z0-9]+/gi, '_')}.pdf` };
                }
              }
            } catch { continue; }
          }
        }
      } catch { continue; }
    }

  } catch (err: any) {
    console.warn(`[OL] Search failed: ${err.message}`);
  }

  return null;
}

// ============================================================
// STRATEGY 4: LIBGEN MIRRORS (LAST RESORT — likely blocked)
// ============================================================
async function downloadFromLibGen(md5: string): Promise<{ buffer: Buffer; contentType: string; filename: string } | null> {
  const sources = [
    `https://libgen.li/ads.php?md5=${md5}`,
    `https://libgen.rocks/ads.php?md5=${md5}`,
    `https://libgen.gs/ads.php?md5=${md5}`,
    `https://libgen.is/ads.php?md5=${md5}`,
    `https://cdn1.booksdl.org/get.php?md5=${md5}`,
  ];

  for (const url of sources) {
    try {
      const resp = await fetch(url, {
        headers: { ...FETCH_HEADERS, 'Referer': 'https://libgen.is/' },
        signal: AbortSignal.timeout(20000),
        redirect: 'follow',
      });
      if (!resp.ok) continue;

      const ct = resp.headers.get('content-type') || '';
      const cl = parseInt(resp.headers.get('content-length') || '0', 10);
      if (cl === 0 || (isHtmlOrJson(ct) && cl < 50000)) continue;

      if (isBinaryContent(ct) || cl > 100000) {
        const result = await streamToBuffer(resp);
        if (result) {
          console.log(`[LG] ✅ Downloaded from ${url.substring(0, 60)}`);
          return { ...result, filename: `${md5}.pdf` };
        }
      }
    } catch { continue; }
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
    // ============================================================
    // DOWNLOAD FLOW: Try sources in priority order
    // ============================================================
    let result: { buffer: Buffer; contentType: string; filename: string } | null = null;

    // STRATEGY 1: Anna's Archive (PRIMARY — not blocked by Vercel)
    console.log(`[download] Strategy 1: Anna's Archive for MD5 ${md5}`);
    result = await downloadFromAnnasArchive(md5, title);

    // STRATEGY 2: Internet Archive (SECONDARY)
    if (!result && title) {
      console.log(`[download] Strategy 2: Internet Archive for "${title}"`);
      result = await downloadFromInternetArchive(title.trim(), author);
    }

    // STRATEGY 3: Open Library (TERTIARY)
    if (!result && title) {
      console.log(`[download] Strategy 3: Open Library for "${title}"`);
      result = await downloadFromOpenLibrary(title.trim(), author);
    }

    // STRATEGY 4: LibGen mirrors (LAST RESORT)
    if (!result) {
      console.log(`[download] Strategy 4: LibGen mirrors for MD5 ${md5}`);
      result = await downloadFromLibGen(md5);
    }

    // ============================================================
    // RETURN
    // ============================================================
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
