import type { VercelRequest, VercelResponse } from '@vercel/node';

const FETCH_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Accept': '*/*',
  'Accept-Language': 'en-US,en;q=0.9',
};

// ============================================================
// Language normalization helpers
// ============================================================

// Map of language names/codes to canonical ISO codes
const LANG_MAP: Record<string, string> = {
  // Swahili
  'swahili': 'sw', 'kiswahili': 'sw', 'sw': 'sw',
  // English
  'english': 'en', 'en': 'en',
  // French
  'french': 'fr', 'français': 'fr', 'fr': 'fr',
  // German
  'german': 'de', 'deutsch': 'de', 'de': 'de',
  // Spanish
  'spanish': 'es', 'español': 'es', 'es': 'es',
  // Portuguese
  'portuguese': 'pt', 'português': 'pt', 'pt': 'pt',
  // Arabic
  'arabic': 'ar', 'ar': 'ar',
  // Chinese
  'chinese': 'zh', 'zh': 'zh',
  // Russian
  'russian': 'ru', 'ru': 'ru',
  // Italian
  'italian': 'it', 'italiano': 'it', 'it': 'it',
  // Japanese
  'japanese': 'ja', 'ja': 'ja',
};

function normalizeLanguage(lang: string | undefined | null): string | null {
  if (!lang) return null;
  const lower = lang.toLowerCase().trim();
  return LANG_MAP[lower] || lower.slice(0, 2) || null;
}

function languagesMatch(expected: string | null, found: string | null): boolean {
  if (!expected || !found) return true; // no constraint → allow
  const e = normalizeLanguage(expected);
  const f = normalizeLanguage(found);
  if (!e || !f) return true;
  return e === f;
}

// ============================================================
// Utility helpers
// ============================================================

function isBinaryContent(ct: string): boolean {
  const c = ct.toLowerCase();
  return c.includes('application/pdf') || c.includes('application/octet-stream')
    || c.includes('application/epub') || c.includes('application/x-mobipocket')
    || c.includes('application/djvu') || c.includes('binary');
}

function normalized(s: string): string {
  return s.toLowerCase()
    .replace(/^(the|a|an|le|la|les|il|lo|die|der|das|el|los|las|un|une|des)\s+/i, '')
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
  // PDF magic: %PDF = 25504446, ZIP (epub): 504b0304, large enough file
  if (magic === '25504446' || magic === '504b0304' || magic === '41542654' || buf.length > 500000) {
    return { buffer: buf, ct: r.headers.get('content-type') || 'application/pdf' };
  }
  return null;
}

// ============================================================
// Extract language from Anna's Archive MD5 page HTML
// ============================================================
function extractLanguageFromHtml(html: string): string | null {
  // Anna's Archive shows language in a structured way
  const patterns = [
    /language[^:]*:\s*([a-zA-Z\s]+?)(?:<|,|\n|;)/i,
    /"language"\s*:\s*"([^"]+)"/i,
    /\blang(?:uage)?\b[^>]*>\s*([a-zA-Z\s]+?)\s*</i,
  ];
  for (const p of patterns) {
    const m = html.match(p);
    if (m && m[1]) {
      const lang = m[1].trim().toLowerCase();
      if (lang.length > 1 && lang.length < 30) {
        return normalizeLanguage(lang);
      }
    }
  }
  // Fallback: detect language name in text
  const lower = html.toLowerCase();
  if (lower.includes('swahili') || lower.includes('kiswahili')) return 'sw';
  if (lower.includes('english')) return 'en';
  if (lower.includes('french') || lower.includes('français')) return 'fr';
  if (lower.includes('german') || lower.includes('deutsch')) return 'de';
  if (lower.includes('spanish') || lower.includes('español')) return 'es';
  if (lower.includes('portuguese') || lower.includes('português')) return 'pt';
  if (lower.includes('arabic')) return 'ar';
  if (lower.includes('chinese')) return 'zh';
  if (lower.includes('russian')) return 'ru';
  return null;
}

// ============================================================
// TYPE DEFINITIONS
// ============================================================
type DownloadResult = {
  buffer: Buffer;
  ct: string;
  filename: string;
  source: string;
  foundMd5?: string;
  foundUrl?: string;
  detectedLanguage?: string;
};

// ============================================================
// DOWNLOAD BY MD5 — with language verification
// ============================================================
async function downloadByMd5(
  md5: string,
  expectedLanguage?: string | null,
): Promise<{ buffer: Buffer; ct: string; filename: string; detectedLanguage?: string } | null> {

  // ── Try Anna's Archive first (scrape MD5 page for links + language) ──
  for (const mirror of ['https://annas-archive.li', 'https://annas-archive.org']) {
    try {
      const ir = await fetch(`${mirror}/md5/${md5}`, {
        headers: { ...FETCH_HEADERS, 'Accept': 'text/html' },
        signal: AbortSignal.timeout(12000),
      });
      if (!ir.ok) continue;
      const html = await ir.text();

      // Check language if requested
      const detectedLang = extractLanguageFromHtml(html);
      if (expectedLanguage && detectedLang && !languagesMatch(expectedLanguage, detectedLang)) {
        console.warn(`[md5] Language mismatch for MD5 ${md5}: expected=${expectedLanguage}, found=${detectedLang}`);
        return null; // Wrong language — do NOT download
      }

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
            return { ...buf, filename: `${md5}.pdf`, detectedLanguage: detectedLang || undefined };
          }
        } catch { continue; }
      }
    } catch (e: any) { console.warn(`[md5] AA mirror ${mirror}: ${e.message}`); }
  }

  // ── Try LibGen mirrors (proxy approach — direct HTTP fetch from Vercel) ──
  const lgUrls = [
    `https://libgen.li/ads.php?md5=${md5}`,
    `https://libgen.rocks/ads.php?md5=${md5}`,
    `https://cdn1.booksdl.org/get.php?md5=${md5}`,
    `https://libgen.gs/ads.php?md5=${md5}`,
  ];

  for (const adsUrl of lgUrls) {
    try {
      // First fetch the ads page to find the real download link
      const adsResp = await fetch(adsUrl, {
        headers: { ...FETCH_HEADERS, 'Referer': 'https://libgen.is/' },
        signal: AbortSignal.timeout(15000),
        redirect: 'follow',
      });
      if (!adsResp.ok) continue;

      const adsHtml = await adsResp.text();
      // Extract direct download link from ads page
      const dlMatch = adsHtml.match(/href="(https?:\/\/[^"]*(?:get\.php|download)[^"]*)"/i);
      if (dlMatch) {
        const directUrl = dlMatch[1];
        const dr = await fetch(directUrl, {
          headers: { ...FETCH_HEADERS, 'Referer': adsUrl },
          signal: AbortSignal.timeout(30000),
          redirect: 'follow',
        });
        if (!dr.ok) continue;
        const buf = await bufferFromResponse(dr);
        if (buf) {
          console.log(`[md5] ✅ Downloaded from LibGen proxy: ${adsUrl.substring(0, 60)}`);
          return { ...buf, filename: `${md5}.pdf` };
        }
      }

      // Fallback: try direct download from the ads URL itself
      const buf = await bufferFromResponse(adsResp);
      if (buf) {
        console.log(`[md5] ✅ Downloaded directly from LibGen: ${adsUrl.substring(0, 60)}`);
        return { ...buf, filename: `${md5}.pdf` };
      }
    } catch { continue; }
  }

  return null;
}

// ============================================================
// SEARCH ALL SOURCES — with language awareness
// ============================================================
async function searchAndDownload(
  title: string,
  author?: string,
  expectedLanguage?: string | null,
): Promise<DownloadResult | null> {
  const q = encodeURIComponent(`${title} ${author || ''}`.trim());
  const langNote = expectedLanguage ? ` [lang: ${expectedLanguage}]` : '';

  // ── SOURCE 1: Anna's Archive search ──
  console.log(`[search] Trying Anna's Archive for "${title}"${langNote}...`);
  for (const mirror of ['https://annas-archive.li', 'https://annas-archive.org']) {
    try {
      const sr = await fetch(`${mirror}/search?q=${q}`, {
        headers: { ...FETCH_HEADERS, 'Accept': 'text/html' },
        signal: AbortSignal.timeout(15000),
      });
      if (!sr.ok) continue;
      const html = await sr.text();

      const md5Pattern = /\/md5\/([a-f0-9]{32})/gi;
      const seen = new Set<string>();

      for (const m of html.matchAll(md5Pattern)) {
        const candidateMd5 = m[1];
        if (seen.has(candidateMd5)) continue;
        seen.add(candidateMd5);

        // Quick title check from surrounding context
        const ctx = html.slice(Math.max(0, m.index! - 400), Math.min(html.length, m.index! + 400));
        if (!fuzzyMatch(title, ctx)) continue;

        console.log(`[search] Found candidate MD5 ${candidateMd5} on ${mirror}`);

        // Get the MD5 info page for language + title verification
        const ir = await fetch(`${mirror}/md5/${candidateMd5}`, {
          headers: { ...FETCH_HEADERS, 'Accept': 'text/html' },
          signal: AbortSignal.timeout(12000),
        });
        if (!ir.ok) continue;
        const pageHtml = await ir.text();

        // Title verification
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

        // Language verification
        const detectedLang = extractLanguageFromHtml(pageHtml);
        if (expectedLanguage && detectedLang && !languagesMatch(expectedLanguage, detectedLang)) {
          console.warn(`[search] Language mismatch for MD5 ${candidateMd5}: expected=${expectedLanguage}, found=${detectedLang}`);
          continue; // Skip this MD5 — wrong language
        }

        // Extract download URLs
        const linkPattern = /href="((?:https?:\/\/[^"]*(?:libgen|ipfs|slow_download|cloudflare)[^"]*)|(?:\/[^"]*(?:slow_download|ds\/)[^"]*))"/gi;
        const dlUrls: string[] = [];
        for (const lm of pageHtml.matchAll(linkPattern)) {
          let u = lm[1];
          if (u.startsWith('/')) u = `${mirror}${u}`;
          if (!dlUrls.includes(u)) dlUrls.push(u);
        }

        console.log(`[search] Found ${dlUrls.length} download URLs for MD5 ${candidateMd5}`);

        for (const dlUrl of dlUrls) {
          try {
            const dr = await fetch(dlUrl, {
              headers: { ...FETCH_HEADERS, 'Referer': `${mirror}/md5/${candidateMd5}` },
              signal: AbortSignal.timeout(30000),
              redirect: 'follow',
            });
            if (!dr.ok) continue;
            const buf = await bufferFromResponse(dr);
            if (buf) {
              console.log(`[search] ✅ Downloaded from Anna's Archive: ${dlUrl.substring(0, 70)}`);
              return {
                ...buf,
                filename: `${candidateMd5}.pdf`,
                source: 'annas_archive',
                foundMd5: candidateMd5,
                detectedLanguage: detectedLang || undefined,
              };
            }
          } catch { continue; }
        }
      }
    } catch (e: any) { console.warn(`[search] AA mirror ${mirror}: ${e.message}`); }
  }

  // ── SOURCE 2: Internet Archive ──
  console.log(`[search] Trying Internet Archive for "${title}"${langNote}...`);
  try {
    // Add language to IA search if specified
    let iaQuery = `${title}`;
    if (author) iaQuery += ` ${author}`;
    if (expectedLanguage) {
      const langName = Object.entries(LANG_MAP).find(([k, v]) => v === normalizeLanguage(expectedLanguage) && k.length > 2)?.[0];
      if (langName) iaQuery += ` language:${langName}`;
    }
    const iaUrl = `https://archive.org/advancedsearch.php?q=${encodeURIComponent(iaQuery)}+AND+mediatype:texts&fl[]=identifier,title,creator,language&rows=15&output=json`;
    const sr = await fetch(iaUrl, { headers: FETCH_HEADERS, signal: AbortSignal.timeout(15000) });
    if (sr.ok) {
      const docs = (await sr.json())?.response?.docs || [];
      for (const doc of docs) {
        if (!fuzzyMatch(title, doc.title || '')) continue;
        // Language check for IA results
        if (expectedLanguage && doc.language) {
          const docLang = Array.isArray(doc.language) ? doc.language[0] : doc.language;
          if (!languagesMatch(expectedLanguage, docLang)) {
            console.warn(`[search] IA language mismatch: expected=${expectedLanguage}, found=${docLang}`);
            continue;
          }
        }
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
  console.log(`[search] Trying Open Library for "${title}"${langNote}...`);
  try {
    let olQuery = title;
    if (expectedLanguage) {
      const langName = Object.entries(LANG_MAP).find(([k, v]) => v === normalizeLanguage(expectedLanguage) && k.length > 2)?.[0];
      if (langName) olQuery += ` ${langName}`;
    }
    const olUrl = `https://openlibrary.org/search.json?q=${encodeURIComponent(olQuery)}&has_fulltext=true&limit=10&fields=key,title,author_name,language`;
    const sr = await fetch(olUrl, { headers: FETCH_HEADERS, signal: AbortSignal.timeout(15000) });
    if (sr.ok) {
      const docs = (await sr.json())?.docs || [];
      for (const doc of docs) {
        if (!fuzzyMatch(title, doc.title || '')) continue;
        // Language check
        if (expectedLanguage && doc.language && doc.language.length > 0) {
          const docLangs = doc.language as string[];
          const hasMatch = docLangs.some(l => languagesMatch(expectedLanguage, l));
          if (!hasMatch) {
            console.warn(`[search] OL language mismatch: expected=${expectedLanguage}, found=${docLangs.join(',')}`);
            continue;
          }
        }
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
              return { ...buf, filename: `${normalized(title).replace(/\s+/g, '_')}.pdf`, source: 'open_library', foundUrl: url };
            }
          }
        } catch { continue; }
      }
    }
  } catch (e: any) { console.warn(`[search] OL: ${e.message}`); }

  // ── SOURCE 4: LibGen (via Anna's Archive search with language filter) ──
  console.log(`[search] Trying LibGen/Anna's Archive with language filter for "${title}"${langNote}...`);
  try {
    let lgQuery = title;
    if (author) lgQuery += ` ${author}`;
    // Add language keyword to search
    if (expectedLanguage) {
      const langName = Object.entries(LANG_MAP).find(([k, v]) => v === normalizeLanguage(expectedLanguage) && k.length > 2)?.[0];
      if (langName) lgQuery += ` ${langName}`;
    }

    const lgMirrors = [
      `https://libgen.li/index.php?req=${encodeURIComponent(lgQuery)}&lg_topic=libgen&open=0&view=simple&res=25&phrase=1&column=def`,
      `https://libgen.rs/index.php?req=${encodeURIComponent(lgQuery)}&lg_topic=libgen&open=0&view=simple&res=25&phrase=1&column=def`,
    ];

    for (const lgUrl of lgMirrors) {
      try {
        const lgResp = await fetch(lgUrl, {
          headers: { ...FETCH_HEADERS },
          signal: AbortSignal.timeout(15000),
        });
        if (!lgResp.ok) continue;
        const lgHtml = await lgResp.text();

        // Extract MD5 hashes from LibGen results
        const md5Matches = [...lgHtml.matchAll(/md5=([a-f0-9]{32})/gi)];
        for (const match of md5Matches.slice(0, 10)) {
          const candidateMd5 = match[1];
          // Try to download via Anna's Archive (which works from Vercel)
          const result = await downloadByMd5(candidateMd5, expectedLanguage);
          if (result) {
            console.log(`[search] ✅ Downloaded via LibGen MD5 ${candidateMd5} through Anna's Archive`);
            return { ...result, source: 'libgen_via_anna', foundMd5: candidateMd5 };
          }
        }
      } catch { continue; }
    }
  } catch (e: any) { console.warn(`[search] LibGen: ${e.message}`); }

  console.log(`[search] All sources exhausted for "${title}"${langNote}`);
  return null;
}

// ============================================================
// Fetch cover image URL for a book
// ============================================================
async function fetchCoverUrl(title: string, author?: string, isbn?: string): Promise<string | null> {
  // 1. Try Open Library Covers API by ISBN
  if (isbn) {
    const cleanIsbn = isbn.replace(/[^0-9X]/gi, '');
    if (cleanIsbn.length >= 10) {
      const url = `https://covers.openlibrary.org/b/isbn/${cleanIsbn}-L.jpg`;
      try {
        const r = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(5000) });
        if (r.ok && (r.headers.get('content-type') || '').includes('image')) {
          return url;
        }
      } catch {}
    }
  }

  // 2. Try Open Library search to get ISBN then cover
  try {
    const q = encodeURIComponent(`${title} ${author || ''}`.trim());
    const r = await fetch(`https://openlibrary.org/search.json?q=${q}&limit=1&fields=isbn,cover_i`, {
      headers: FETCH_HEADERS, signal: AbortSignal.timeout(8000),
    });
    if (r.ok) {
      const data = await r.json();
      const doc = data?.docs?.[0];
      if (doc?.cover_i) {
        return `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg`;
      }
      if (doc?.isbn?.[0]) {
        return `https://covers.openlibrary.org/b/isbn/${doc.isbn[0]}-L.jpg`;
      }
    }
  } catch {}

  // 3. Try Google Books API
  try {
    const q = encodeURIComponent(`${title} ${author || ''}`.trim());
    const r = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${q}&maxResults=1`, {
      headers: FETCH_HEADERS, signal: AbortSignal.timeout(8000),
    });
    if (r.ok) {
      const data = await r.json();
      const imgLinks = data?.items?.[0]?.volumeInfo?.imageLinks;
      if (imgLinks?.thumbnail) {
        return imgLinks.thumbnail.replace('http://', 'https://').replace('zoom=1', 'zoom=2');
      }
    }
  } catch {}

  return null;
}

// ============================================================
// Update Supabase with found MD5 (best-effort)
// ============================================================
async function updateBookMd5(bookId: number, md5: string, coverUrl?: string) {
  try {
    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!SUPABASE_URL || !SUPABASE_KEY) return;

    const patch: Record<string, unknown> = {
      formats: JSON.stringify({ pdf: `md5:${md5}` }),
      directDownloadAllowed: true,
      rightsStatus: 'open_access',
    };
    if (coverUrl) patch.coverUrl = coverUrl;

    await fetch(`${SUPABASE_URL}/rest/v1/books?id=eq.${bookId}`, {
      method: 'PATCH',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify(patch),
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
  // Handle CORS preflight
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');
  if (req.method === 'OPTIONS') return res.status(200).end();

  let md5: string | undefined;
  let title: string | undefined;
  let author: string | undefined;
  let bookId: number | undefined;
  let language: string | undefined;
  let isbn: string | undefined;

  if (req.method === 'GET') {
    md5 = req.query.md5 as string | undefined;
    title = req.query.title as string | undefined;
    author = req.query.author as string | undefined;
    bookId = req.query.bookId ? parseInt(req.query.bookId as string) : undefined;
    language = req.query.language as string | undefined;
    isbn = req.query.isbn as string | undefined;
  } else if (req.method === 'POST') {
    try {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      md5 = body?.md5;
      title = body?.title;
      author = body?.author;
      bookId = body?.bookId ? parseInt(String(body.bookId)) : undefined;
      language = body?.language;
      isbn = body?.isbn;
    } catch {
      return res.status(400).json({ success: false, error: 'Invalid JSON body' });
    }
  } else {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  // Require at least one of: md5, title
  if (!md5 && !title) {
    return res.status(400).json({ success: false, error: 'md5 or title required' });
  }

  // Normalize requested language
  const requestedLang = normalizeLanguage(language);
  console.log(`[download] Request: title="${title}", md5=${md5 || 'none'}, lang=${requestedLang || 'any'}`);

  try {
    let result: DownloadResult | null = null;

    // STEP 1: If MD5 provided, try direct download with language verification
    if (md5 && /^[a-f0-9]{32}$/i.test(md5)) {
      console.log(`[download] Trying direct MD5: ${md5} (lang check: ${requestedLang || 'none'})`);
      const r = await downloadByMd5(md5, requestedLang);
      if (r) {
        result = { ...r, source: 'md5_direct' };
      } else if (requestedLang) {
        // MD5 failed language check — don't fall through to title search with wrong MD5
        console.warn(`[download] MD5 ${md5} failed language check for ${requestedLang}`);
      }
    }

    // STEP 2: Search-and-download (if no MD5 or MD5 failed)
    if (!result && title && title.trim().length > 1) {
      console.log(`[download] Searching sources for "${title}" (lang: ${requestedLang || 'any'})...`);
      const r = await searchAndDownload(title.trim(), author, requestedLang);
      if (r) result = r;
    }

    // STEP 3: Update database if we found a new MD5
    if (result?.foundMd5 && bookId) {
      // Optionally fetch a cover image
      const coverUrl = await fetchCoverUrl(title || '', author, isbn).catch(() => undefined);
      await updateBookMd5(bookId, result.foundMd5, coverUrl || undefined);
    }

    // STEP 4: Return result or 404
    if (!result) {
      const langMsg = requestedLang
        ? `Book not available in ${requestedLang.toUpperCase()} language, or could not be found.`
        : 'Could not find this book for download. Please try again later.';
      return res.status(404).json({
        success: false,
        error: 'Download unavailable',
        message: langMsg,
      });
    }

    const filename = result.filename || `${(title || 'document').replace(/[^a-z0-9]/gi, '_').slice(0, 60)}.pdf`;

    res.setHeader('Content-Type', result.ct || 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', result.buffer.length.toString());
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition, Content-Length, X-Download-Source, X-Detected-Language');
    res.setHeader('X-Download-Source', result.source || 'unknown');
    if (result.detectedLanguage) {
      res.setHeader('X-Detected-Language', result.detectedLanguage);
    }

    return res.status(200).send(result.buffer);

  } catch (error: any) {
    console.error('[download] Error:', error.message);
    return res.status(500).json({ success: false, error: 'Download failed', message: error.message });
  }
}
