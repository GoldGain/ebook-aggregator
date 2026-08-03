import type { VercelRequest, VercelResponse } from '@vercel/node';
import * as cheerio from 'cheerio';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const { md5, editionId, format } = req.query;
  if (!md5 && !editionId) return res.status(400).json({ error: 'md5 or editionId required' });

  try {
    if (editionId) {
      const editionRes = await fetch(`https://libgen.li/edition.php?id=${editionId}`, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        signal: AbortSignal.timeout(15000),
      });
      if (editionRes.ok) {
        const html = await editionRes.text();
        const $ = cheerio.load(html);
        const ipfsLinks: string[] = [];
        $('a[href*="cloudflare-ipfs.com"], a[href*="gateway.ipfs.io"], a[href*="pinata.cloud/ipfs"]').each((_, el) => {
          const href = $(el).attr('href');
          if (href && (!format || href.includes(`.${format}`))) ipfsLinks.push(href);
        });
        if (ipfsLinks.length > 0) {
          return res.status(200).json({ success: true, downloadType: 'ipfs', urls: ipfsLinks.slice(0, 5) });
        }
      }
    }

    if (md5) {
      return res.status(200).json({
        success: true, downloadType: 'annas_archive',
        urls: [`https://en.annas-archive.gl/md5/${md5}`],
      });
    }

    return res.status(404).json({ success: false, error: 'No download sources found' });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: 'Download resolution failed', message: error.message });
  }
}