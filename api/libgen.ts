import type { VercelRequest, VercelResponse } from '@vercel/node';
import * as cheerio from 'cheerio';

interface LibGenBook {
  title: string; author: string; publisher: string;
  year: string; language: string; pages: string;
  size: string; format: string; md5: string;
  fileId: string; downloadUrl: string;
  annaArchiveUrl: string; libgenPwUrl: string;
  filesize: string; source: string; sourceUrl: string;
  annaUrl: string;
}

async function searchLibGen(query: string, limit: number, language?: string): Promise<LibGenBook[]> {
  const resCount = Math.min(Number(limit), 100);
  const params = `req=${encodeURIComponent(query)}&lg_topic=libgen&open=0&view=simple&res=${resCount}&phrase=1&column=def`;
  
  let html = '';
  const mirrors = [
    `http://libgen.li/index.php?${params}`,
    `http://libgen.rs/index.php?${params}`,
    `http://libgen.is/index.php?${params}`,
    `http://libgen.st/index.php?${params}`,
    `http://libgen.gs/index.php?${params}`,
  ];

  for (const url of mirrors) {
    try {
      const response = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
        signal: AbortSignal.timeout(15000),
      });
      if (response.ok) { html = await response.text(); break; }
    } catch { continue; }
  }

  if (!html) return [];

  const $ = cheerio.load(html);
  const tables = $('table');
  if (tables.length < 2) return [];

  const rows = $(tables[1]).find('tr').slice(1);
  const books: LibGenBook[] = [];

  rows.each((_, row) => {
    const cells = $(row).find('td');
    if (cells.length < 8) return;

    const title = $(cells[0]).text().replace(/^\d+/, '').trim();
    const author = $(cells[1]).text().trim() || 'Unknown';
    const publisher = $(cells[2]).text().trim();
    const year = $(cells[3]).text().trim();
    const lang = $(cells[4]).text().trim();
    const pages = $(cells[5]).text().trim();
    const size = $(cells[6]).text().trim();
    const format = $(cells[7]).text().trim();
    
    const fileIdHref = $(cells[6]).find('a').attr('href') || '';
    const fileIdMatch = fileIdHref.match(/id=(\d+)/);
    const fileId = fileIdMatch ? fileIdMatch[1] : '';
    
    const md5Href = $(cells[8]).find('a').first().attr('href') || '';
    const md5Match = md5Href.match(/md5=([a-f0-9]{32})/);
    const md5 = md5Match ? md5Match[1] : '';

    if (!title || !md5) return;
    if (language && language !== 'all' && lang.toLowerCase() !== language.toLowerCase()) return;
    if (format.toLowerCase() !== 'pdf') return;

    books.push({
      title, author, publisher, year, language: lang, pages, size, format, md5, fileId,
      downloadUrl: fileId ? `https://libgen.li/file.php?id=${fileId}` : '',
      annaArchiveUrl: `https://annas-archive.org/md5/${md5}`,
      libgenPwUrl: `https://libgen.pw/book/${md5}`,
      filesize: size,
      source: 'libgen',
      sourceUrl: `https://library.lol/main/${md5}`,
      annaUrl: `https://annas-archive.org/md5/${md5}`,
    });
  });

  return books;
}

async function searchAnnasArchive(query: string, limit: number): Promise<LibGenBook[]> {
  try {
    const response = await fetch(
      `https://annas-archive.org/search?q=${encodeURIComponent(query)}`,
      {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
        signal: AbortSignal.timeout(15000),
      }
    );
    if (!response.ok) return [];

    const html = await response.text();
    const $ = cheerio.load(html);
    const books: LibGenBook[] = [];

    $('a[href*="/md5/"]').each((_, el) => {
      if (books.length >= limit) return false;
      const href = $(el).attr('href') || '';
      const md5Match = href.match(/\/md5\/([a-f0-9]{32})/);
      if (!md5Match) return;
      const md5 = md5Match[1];

      // Try to find title in parent elements
      const parent = $(el).closest('div, li, tr');
      const titleEl = parent.find('h3, h4, .text-lg, .font-bold, a[href*="/md5/"]').first();
      const title = titleEl.text().trim() || $(el).text().trim() || 'Unknown Title';

      const authorEl = parent.find('.text-gray-500, .text-sm, .italic').first();
      const author = authorEl.text().trim() || 'Unknown';

      const sizeEl = parent.find('span:contains("MB"), span:contains("KB"), span:contains("GB")').first();
      const size = sizeEl.text().trim() || 'Unknown';

      const formatEl = parent.find('span:contains("pdf"), span:contains("epub"), span:contains("mobi")').first();
      const format = formatEl.text().trim().toLowerCase() || 'pdf';
      if (format !== 'pdf') return;

      if (title && title.length > 1) {
        books.push({
          title: title.substring(0, 200),
          author,
          publisher: '',
          year: '',
          language: 'en',
          pages: '',
          size,
          format,
          md5,
          fileId: '',
          downloadUrl: `https://annas-archive.org/md5/${md5}`,
          annaArchiveUrl: `https://annas-archive.org/md5/${md5}`,
          libgenPwUrl: '',
          filesize: size,
          source: 'annas_archive',
          sourceUrl: `https://annas-archive.org/md5/${md5}`,
          annaUrl: `https://annas-archive.org/md5/${md5}`,
        });
      }
    });

    return books;
  } catch {
    return [];
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const { q, limit = 50, language, page = 1 } = req.query;
  if (!q) return res.status(400).json({ error: 'Query "q" is required' });

  try {
    // Search both LibGen and Anna's Archive in parallel
    const numLimit = Math.min(Number(limit), 100);
    const [libgenBooks, annaBooks] = await Promise.allSettled([
      searchLibGen(q as string, numLimit, language as string | undefined),
      searchAnnasArchive(q as string, numLimit),
    ]);

    const allBooks: LibGenBook[] = [];
    const seenMd5s = new Set<string>();

    // LibGen results first (more reliable)
    if (libgenBooks.status === 'fulfilled') {
      for (const book of libgenBooks.value) {
        if (!seenMd5s.has(book.md5)) {
          seenMd5s.add(book.md5);
          allBooks.push(book);
        }
      }
    }

    // Anna's Archive results (deduped)
    if (annaBooks.status === 'fulfilled') {
      for (const book of annaBooks.value) {
        if (!seenMd5s.has(book.md5)) {
          seenMd5s.add(book.md5);
          allBooks.push(book);
        }
      }
    }

    const totalSources = (libgenBooks.status === 'fulfilled' ? 1 : 0) + (annaBooks.status === 'fulfilled' ? 1 : 0);

    const pdfOnlyBooks = allBooks.filter(b => b.format?.toLowerCase() === 'pdf');
    return res.status(200).json({
      success: true,
      source: `libgen${totalSources > 1 ? '+annas_archive' : ''}`,
      query: q,
      total: pdfOnlyBooks.length,
      page: Number(page),
      books: pdfOnlyBooks.slice(0, numLimit),
      sourcesSearched: totalSources,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: 'Search failed', message: error.message });
  }
}
