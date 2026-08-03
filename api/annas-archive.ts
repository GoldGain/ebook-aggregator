import type { VercelRequest, VercelResponse } from '@vercel/node';
import * as cheerio from 'cheerio';

interface AnnaBook {
  title: string;
  author: string;
  md5: string;
  language: string;
  format: string;
  size: string;
  source: string;
  sourceUrl: string;
  downloadUrl: string;
}

async function searchAnnasArchive(query: string, limit: number): Promise<AnnaBook[]> {
  try {
    const response = await fetch(
      `https://annas-archive.org/search?q=${encodeURIComponent(query)}`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml',
          'Accept-Language': 'en-US,en;q=0.9',
        },
        signal: AbortSignal.timeout(20000),
      }
    );

    if (!response.ok) return [];

    const html = await response.text();
    const $ = cheerio.load(html);
    const books: AnnaBook[] = [];

    // Anna's Archive uses various structures - try multiple selectors
    $('a[href*="/md5/"]').each((_, el) => {
      if (books.length >= limit) return false;
      const href = $(el).attr('href') || '';
      const md5Match = href.match(/\/md5\/([a-f0-9]{32})/);
      if (!md5Match) return;
      const md5 = md5Match[1];

      const parentRow = $(el).closest('div[class*="h-"], div.flex, div.border, tr');
      const title = $(el).text().trim() || parentRow.find('h3, h4, .text-xl, .font-bold').first().text().trim() || 'Unknown';

      if (title.length < 2) return;

      // Extract extra info from the row
      const textBlocks = parentRow.find('.text-gray-500, .text-sm, div.text-xs, span.text-xs');
      let author = 'Unknown';
      let size = '';
      let format = 'pdf';
      let language = 'en';

      textBlocks.each((_, block) => {
        const text = $(block).text().trim();
        if (text.match(/MB|GB|KB/i)) size = text;
        if (text.match(/pdf|epub|mobi|djvu/i)) format = text.toLowerCase();
        if (text.match(/English|Spanish|French|German|Russian|Chinese/i)) language = text;
        if (text.length > 3 && text.length < 50 && !text.match(/MB|GB|KB|pdf|epub|mobi|djvu/i) && author === 'Unknown') {
          author = text;
        }
      });

      books.push({
        title: title.substring(0, 200),
        author,
        md5,
        language,
        format,
        size,
        source: 'annas_archive',
        sourceUrl: `https://annas-archive.org/md5/${md5}`,
        downloadUrl: `/api/download?md5=${md5}&format=${format}`,
      });
    });

    return books;
  } catch {
    return [];
  }
}

async function getBookDetails(md5: string): Promise<any> {
  try {
    const response = await fetch(`https://annas-archive.org/md5/${md5}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) return null;

    const html = await response.text();
    const $ = cheerio.load(html);

    const title = $('h1').first().text().trim() || $('title').text().trim();
    const downloadLinks: string[] = [];
    $('a[href*="library.lol"], a[href*="libgen."], a[href*="ipfs.io"], a[href*="cloudflare-ipfs"]').each((_, el) => {
      const href = $(el).attr('href');
      if (href) downloadLinks.push(href);
    });

    return { title, downloadLinks };
  } catch {
    return null;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Route: GET /api/annas-archive?q=searchterm
  // Route: GET /api/annas-archive?md5=xxx (get details)
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { q, md5, limit = 25 } = req.query;

  try {
    if (md5 && typeof md5 === 'string') {
      const details = await getBookDetails(md5);
      if (!details) {
        return res.status(404).json({ success: false, error: 'Book not found on Anna\'s Archive' });
      }
      return res.status(200).json({ success: true, ...details });
    }

    if (q && typeof q === 'string') {
      const books = await searchAnnasArchive(q, Math.min(Number(limit), 50));
      return res.status(200).json({
        success: true,
        source: 'annas_archive',
        query: q,
        total: books.length,
        books,
      });
    }

    return res.status(400).json({ success: false, error: 'Provide either "q" (search) or "md5" (details)' });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: 'Anna\'s Archive request failed', message: error.message });
  }
}
