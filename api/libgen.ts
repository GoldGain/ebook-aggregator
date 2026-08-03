import type { VercelRequest, VercelResponse } from '@vercel/node';
import * as cheerio from 'cheerio';

interface LibGenBook {
  title: string; author: string; publisher: string;
  year: string; language: string; pages: string;
  size: string; format: string; md5: string;
  fileId: string; downloadUrl: string;
  annaArchiveUrl: string; libgenPwUrl: string;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const { q, limit = 50, language, page = 1 } = req.query;
  if (!q) return res.status(400).json({ error: 'Query "q" is required' });

  try {
    const resCount = Math.min(Number(limit), 100);
    const params = `req=${encodeURIComponent(q as string)}&lg_topic=libgen&open=0&view=simple&res=${resCount}&phrase=1&column=def`;
    
    let html = '';
    const mirrors = [
      `http://libgen.li/index.php?${params}`,
      `http://libgen.rs/index.php?${params}`,
      `http://libgen.is/index.php?${params}`,
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

    if (!html) return res.status(502).json({ success: false, error: 'All LibGen mirrors unavailable' });

    const $ = cheerio.load(html);
    const tables = $('table');
    if (tables.length < 2) return res.json({ success: true, source: 'libgen', total: 0, books: [] });

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
      if (language && language !== 'all' && lang.toLowerCase() !== (language as string).toLowerCase()) return;

      books.push({
        title, author, publisher, year, language: lang, pages, size, format, md5, fileId,
        downloadUrl: fileId ? `https://libgen.li/file.php?id=${fileId}` : '',
        annaArchiveUrl: `https://en.annas-archive.gl/md5/${md5}`,
        libgenPwUrl: `https://libgen.pw/book/${md5}`,
      });
    });

    return res.status(200).json({ success: true, source: 'libgen', query: q, total: books.length, page: Number(page), books });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: 'LibGen search failed', message: error.message });
  }
}