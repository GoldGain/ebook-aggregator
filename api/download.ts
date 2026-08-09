import type { VercelRequest, VercelResponse } from '@vercel/node';

const FETCH_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Accept': '*/*',
  'Accept-Language': 'en-US,en;q=0.9',
};

function isBinaryContent(ct: string): boolean {
  const c = ct.toLowerCase();
  return c.includes('application/pdf') || c.includes('application/octet-stream')
    || c.includes('application/epub') || c.includes('application/x-mobipocket')
    || c.includes('application/djvu') || c.includes('binary');
}

function normalized(s: string): string {
  return s.toLowerCase().replace(/^(the|a|an|le|la|les|il|lo|die|der|das|el|los|las|un|une|des)\s+/i, '')
    .replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
}

function fuzzyMatch(a: string, b: string): boolean {
  const t1 = normalized(a), t2 = normalized(b);
  if (!t1 || !t2) return true;
  if (t1 === t2 || t1.includes(t2) || t2.includes(t1)) return true;
  const w1 = new Set(t1.split(' ').filter(w => w.length > 1));
  const w2 = new Set(t2.split(' ').filter(w => w.length > 1));
  if (w1.size === 0 || w2.size === 0) return true;
  return [...w1].filter(w => w2.has(w)).length / Math.max(w1.size, w2.size) >= 0.4;
}

async function bufferFromResponse(r: Response): Promise<{ buffer: Buffer; ct: string } | null> {
  const ab = await r.arrayBuffer();
  const buf = Buffer.from(ab);
  if (buf.length < 1000) return null;
  const magic = buf.slice(0, 4).toString('hex');
  if (magic === '25504446' || magic === '504b0304' || magic === '41542654' || buf.length > 500000) {
    return { buffer: buf, ct: r.headers.get('content-type') || 'application/pdf' };
  }
  return null;
}

// ============================================================
// SEARCH ALL SOURCES for a book by title/author → return best download
// ============================================================
type DownloadResult = { buffer: Buffer; ct: string; filename: string; source: string; foundMd5?: string; foundUrl?: string };

async function searchAndDownload(title: string, author?: string): Promise<DownloadResult | null> {
  const q = encodeURIComponent(`${title} ${author || ''}`.trim());

  // ── SOURCE 1: Anna's Archive search → get MD5 → scrape download links ──
  console.log(`[search] Trying Anna's Archive for "${title}"...`);
  for (const mirror of ['https://annas-archive.li', 'https://annas-archive.org']) {
    try {
      // Search
      const sr = await fetch(`${mirror}/search?q=${q}`, {
        headers: { ...FETCH_HEADERS, 'Accept': 'text/html' },
        signal: AbortSignal.timeout(15000),
      });
      if (!sr.ok) continue;
      const html = await sr.text();

      // Extract MD5 links from search results
      const md5Pattern = /\/md5\/([a-f0-9]{32})/gi;
      const seen = new Set<string>();

      for (const m of html.matchAll(md5Pattern)) {
        const candidateMd5 = m[1];
        if (seen.has(candidateMd5)) continue;
        seen.add(candidateMd5);

        // Quick title check from surrounding context
        const ctx = html.slice(Math.max(0, m.index! - 400), Math.min(html.length, m.index! + 400)).toLowerCase();
        if (!fuzzyMatch(title, ctx)) continue;

        console.log(`[search] Found candidate MD5 ${candidateMd5} on ${mirror}`);

        // Get the MD5 info page
        const ir = await fetch(`${mirror}/md5/${candidateMd5}`, {
          headers: { ...FETCH_HEADERS, 'Accept': 'text/html' },
          signal: AbortSignal.timeout(12000),
        });
        if (!ir.ok) continue;

        const pageHtml = await ir.text();

        // Title verification on the detail page
        let pageTitle = '';
        const h1 = pageHtml.match(/<h1[^>]*>([^<]+)<\/h1>/i);
        if (h1) pageTitle = h1[1].trim();
        if (!pageTitle) {
          const tm = pageHtml.match(/<title[^>]*>([^<]+)<\/title>/i);
          if (tm) pageTitle = tm[1].replace(/\s*[|\-–—].*$/, '').trim();
        }
        if (pageTitle && !fuzzyMatch(title, pageTitle)) {
          console.warn(`[search] Title mismatch: "${pageTitle}" ≠ "${title}"`);
          continue;
        }

        // Extract download URLs from the page
        const linkPattern = /href="((?:https?:\/\/[^"]*(?:libgen|ipfs|slow_download|cloudflare)[^"]*)|(?:\/[^"]*(?:slow_download|ds\/)[^"]*))"/gi;
        const dlUrls: string[] = [];
        for (const lm of pageHtml.matchAll(linkPattern)) {
          let u = lm[1];
          if (u.startsWith('/')) u = `${mirror}${u}`;
          if (!dlUrls.includes(u)) dlUrls.push(u);
        }

        console.log(`[search] Found ${dlUrls.length} download URLs for MD5 ${candidateMd5}`);

        // Try each download URL
        for (const dlUrl of dlUrls) {
          try {
            const dr = await fetch(dlUrl, {
              headers: { ...FETCH_HEADERS, 'Referer': `${mirror}/md5/${candidateMd5}` },
              signal: AbortSignal.timeout(30000),
              redirect: 'follow',
            });
            if (!dr.ok) continue;
            const ct = dr.headers.get('content-type') || '';
            const buf = await bufferFromResponse(dr);
            if (buf) {
              console.log(`[search] ✅ Downloaded from Anna's Archive: ${dlUrl.substring(0,70)}`);
              return { ...buf, filename: `${candidateMd5}.pdf`, source: 'annas_archive', foundMd5: candidateMd5 };
            }
          } catch { continue; }
        }
      }
    } catch (e: any) { console.warn(`[search] AA mirror ${mirror}: ${e.message}`); }
  }

  // ── SOURCE 2: Internet Archive ──
  console.log(`[search] Trying Internet Archive for "${title}"...`);
  try {
    const iaUrl = `https://archive.org/advancedsearch.php?q=${encodeURIComponent(title)}+AND+mediatype:texts&fl[]=identifier,title,creator&rows=10&output=json`;
    const sr = await fetch(iaUrl, { headers: FETCH_HEADERS, signal: AbortSignal.timeout(15000) });
    if (sr.ok) {
      const docs = (await sr.json())?.response?.docs || [];
      for (const doc of docs) {
        if (!fuzzyMatch(title, doc.title || '')) continue;
        const id = doc.identifier;
        if (!id) continue;
        const pdfUrl = `https://archive.org/download/${id}/${id}.pdf`;
        try {
          const dr = await fetch(pdfUrl, { headers: FETCH_HEADERS, signal: AbortSignal.timeout(30000), redirect: 'follow' });
          if (!dr.ok) continue;
          const buf = await bufferFromResponse(dr);
          if (buf) {
            console.log(`[search] ✅ Downloaded from Internet Archive: ${id}`);
            return { ...buf, filename: `${id}.pdf`, source: 'internet_archive', foundUrl: pdfUrl };
          }
        } catch { continue; }
      }
    }
  } catch (e: any) { console.warn(`[search] IA: ${e.message}`); }

  // ── SOURCE 3: Open Library ──
  console.log(`[search] Trying Open Library for "${title}"...`);
  try {
    const olUrl = `https://openlibrary.org/search.json?q=${encodeURIComponent(title)}&has_fulltext=true&limit=10&fields=key,title,author_name`;
    const sr = await fetch(olUrl, { headers: FETCH_HEADERS, signal: AbortSignal.timeout(15000) });
    if (sr.ok) {
      const docs = (await sr.json())?.docs || [];
      for (const doc of docs) {
        if (!fuzzyMatch(title, doc.title || '')) continue;
        const key = doc.key;
        if (!key) continue;
        try {
          const er = await fetch(`https://openlibrary.org${key}.json`, { headers: FETCH_HEADERS, signal: AbortSignal.timeout(10000) });
          if (!er.ok) continue;
          const ed = await er.json();
          for (const ebook of ed?.ebooks || []) {
            const url = ebook?.formats?.pdf?.url;
            if (!url) continue;
            const dr = await fetch(url, { headers: FETCH_HEADERS, signal: AbortSignal.timeout(30000), redirect: 'follow' });
            if (!dr.ok) continue;
            const buf = await bufferFromResponse(dr);
            if (buf) {
              console.log(`[search] ✅ Downloaded from Open Library`);
              return { ...buf, filename: `${normalized(title).replace(/\s+/g,'_')}.pdf`, source: 'open_library', foundUrl: url };
            }
          }
        } catch { continue; }
      }
    }
  } catch (e: any) { console.warn(`[search] OL: ${e.message}`); }

  console.log(`[search] All sources exhausted for "${title}"`);
  return null;
}

// ============================================================
// Download by MD5 (existing sources)
// ============================================================
async function downloadByMd5(md5: string): Promise<{ buffer: Buffer; ct: string; filename: string } | null> {
  // Try Anna's Archive first (scrape MD5 page for links)
  for (const mirror of ['https://annas-archive.li', 'https://annas-archive.org']) {
    try {
      const ir = await fetch(`${mirror}/md5/${md5}`, {
        headers: { ...FETCH_HEADERS, 'Accept': 'text/html' },
        signal: AbortSignal.timeout(12000),
      });
      if (!ir.ok) continue;
      const html = await ir.text();

      const linkPattern = /href="((?:https?:\/\/[^"]*(?:libgen|ipfs|slow_download|cloudflare)[^"]*)|(?:\/[^"]*(?:slow_download|ds\/)[^"]*))"/gi;
      const dlUrls: string[] = [];
      for (const m of html.matchAll(linkPattern)) {
        let u = m[1]; if (u.startsWith('/')) u = `${mirror}${u}`;
        if (!dlUrls.includes(u)) dlUrls.push(u);
      }

      for (const dlUrl of dlUrls) {
        try {
          const dr = await fetch(dlUrl, {
            headers: { ...FETCH_HEADERS, 'Referer': `${mirror}/md5/${md5}` },
            signal: AbortSignal.timeout(30000), redirect: 'follow',
          });
          if (!dr.ok) continue;
          const buf = await bufferFromResponse(dr);
          if (buf) {
            console.log(`[md5] ✅ Downloaded MD5 ${md5} from ${mirror}`);
            return { ...buf, filename: `${md5}.pdf` };
          }
        } catch { continue; }
      }
    } catch (e: any) { console.warn(`[md5] AA mirror ${mirror}: ${e.message}`); }
  }

  // Try LibGen mirrors
  const lgUrls = [
    `https://libgen.li/ads.php?md5=${md5}`,
    `https://libgen.rocks/ads.php?md5=${md5}`,
    `https://cdn1.booksdl.org/get.php?md5=${md5}`,
  ];
  for (const url of lgUrls) {
    try {
      const dr = await fetch(url, {
        headers: { ...FETCH_HEADERS, 'Referer': 'https://libgen.is/' },
        signal: AbortSignal.timeout(20000), redirect: 'follow',
      });
      if (!dr.ok) continue;
      const buf = await bufferFromResponse(dr);
      if (buf) {
        console.log(`[md5] ✅ Downloaded from LibGen: ${url.substring(0,60)}`);
        return { ...buf, filename: `${md5}.pdf` };
      }
    } catch { continue; }
  }

  return null;
}

// ============================================================
// Update Supabase with found MD5 (best-effort)
// ============================================================
async function updateBookMd5(bookId: number, md5: string) {
  try {
    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!SUPABASE_URL || !SUPABASE_KEY) return;

    await fetch(`${SUPABASE_URL}/rest/v1/books?id=eq.${bookId}`, {
      method: 'PATCH',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify({
        formats: JSON.stringify({ pdf: `md5:${md5}` }),
        directDownloadAllowed: true,
        rightsStatus: 'open_access',
      }),
    });
    console.log(`[db] Updated book ${bookId} with MD5 ${md5}`);
  } catch (e: any) {
    console.warn(`[db] Failed to update book ${bookId}: ${e.message}`);
  }
}

// ============================================================
// MAIN HANDLER
// ============================================================
export default async function handler(req: VercelRequest, res: VercelResponse) {
  let md5: string | undefined;
  let title: string | undefined;
  let author: string | undefined;
  let bookId: number | undefined;

  if (req.method === 'GET') {
    md5 = req.query.md5 as string | undefined;
    title = req.query.title as string | undefined;
    author = req.query.author as string | undefined;
    bookId = req.query.bookId ? parseInt(req.query.bookId as string) : undefined;
  } else if (req.method === 'POST') {
    try {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      md5 = body?.md5;
      title = body?.title;
      author = body?.author;
      bookId = body?.bookId ? parseInt(String(body.bookId)) : undefined;
    } catch {
      return res.status(400).json({ success: false, error: 'Invalid JSON body' });
    }
  } else {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  // Require at least one of: md5, title, bookId
  if (!md5 && !title) {
    return res.status(400).json({ success: false, error: 'md5 or title required' });
  }

  try {
    let result: { buffer: Buffer; ct: string; filename: string; source?: string; foundMd5?: string; foundUrl?: string } | null = null;

    // STEP 1: If MD5 provided, try direct download
    if (md5 && /^[a-f0-9]{32}$/i.test(md5)) {
      console.log(`[download] Trying direct MD5: ${md5}`);
      const r = await downloadByMd5(md5);
      if (r) result = { ...r, source: 'md5_direct' };
    }

    // STEP 2: Search-and-download (if no MD5 or MD5 failed)
    if (!result && title && title.trim().length > 1) {
      console.log(`[download] Searching sources for "${title}"...`);
      const r = await searchAndDownload(title.trim(), author);
      if (r) result = r;
    }

    // STEP 3: Update database if we found a new MD5
    if (result?.foundMd5 && bookId) {
      await updateBookMd5(bookId, result.foundMd5);
    }

    // STEP 4: Return result
    if (!result) {
      return res.status(404).json({
        success: false,
        error: 'Download unavailable',
        message: 'Could not find this book for download. Please try again later.',
      });
    }

    res.setHeader('Content-Type', result.ct);
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    res.setHeader('Content-Length', result.buffer.length.toString());
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition, Content-Length');
    // Let client know the source
    res.setHeader('X-Download-Source', result.source || 'unknown');

    return res.status(200).send(result.buffer);

  } catch (error: any) {
    console.error('[download] Error:', error.message);
    return res.status(500).json({ success: false, error: 'Download failed', message: error.message });
  }
}
