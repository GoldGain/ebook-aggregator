import type { VercelRequest, VercelResponse } from '@vercel/node';

// LibGen / Anna's Archive download URLs to try, in order of reliability
const DOWNLOAD_SOURCES = [
  // Direct downloads (most reliable)
      // LibGen mirrors that follow redirects
  (md5: string) => `https://libgen.li/ads.php?md5=${md5}`,
  (md5: string) => `https://libgen.rocks/ads.php?md5=${md5}`,
  (md5: string) => `https://libgen.gs/ads.php?md5=${md5}`,
  (md5: string) => `https://libgen.is/ads.php?md5=${md5}`,
  // Alternative direct
  (md5: string) => `https://cdn1.booksdl.org/get.php?md5=${md5}`,
  // IPFS gateways tried last
  (md5: string) => `https://cloudflare-ipfs.com/ipfs/bafykbzaced${md5}`,
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

async function tryDownload(md5: string, format: string): Promise<{ buffer: Buffer; contentType: string; filename: string } | null> {
  for (const urlFn of DOWNLOAD_SOURCES) {
    const url = urlFn(md5);
    try {
      const response = await fetch(url, {
        headers: FETCH_HEADERS,
        signal: AbortSignal.timeout(25000),
        redirect: 'follow',
      });

      if (!response.ok) continue;

      const contentType = response.headers.get('content-type') || '';
      const contentLength = parseInt(response.headers.get('content-length') || '0', 10);

      // Skip empty responses
      if (contentLength === 0) continue;

      // Skip HTML/JSON pages - these are error pages
      if (isHtmlOrJson(contentType) && contentLength < 50000) continue;

      // Accept binary content
      if (isBinaryContent(contentType) || contentLength > 100000) {
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Verify it's not an HTML page disguised as binary
        if (buffer.length < 1000) continue;
        const firstBytes = buffer.slice(0, 4).toString('hex');
        // PDF magic: %PDF, EPUB magic: PK, DJVU magic: AT&T
        if (firstBytes === '25504446' || firstBytes === '504b0304' || firstBytes === '41542654' || buffer.length > 500000) {
          return {
            buffer,
            contentType: contentType || 'application/pdf',
            filename: `${md5}.${format || 'pdf'}`,
          };
        }
        // If it's large enough and not HTML, accept it
        if (!isHtmlOrJson(contentType) && buffer.length > 100000) {
          return {
            buffer,
            contentType: contentType || 'application/pdf',
            filename: `${md5}.${format || 'pdf'}`,
          };
        }
      }
    } catch {
      continue;
    }
  }
  return null;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Support both GET (query params) and POST (JSON body)
  let md5: string | undefined;
  let format = 'pdf';

  if (req.method === 'GET') {
    md5 = req.query.md5 as string | undefined;
    format = (req.query.format as string) || 'pdf';
  } else if (req.method === 'POST') {
    try {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      md5 = body?.md5;
      format = body?.format || 'pdf';
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
    const result = await tryDownload(md5, format);

    if (!result) {
      // All server-side sources blocked - return mirrors list for browser-side download
      return res.status(200).json({
        success: true,
        directDownload: false,
        message: 'Server-side download blocked. Opening Anna\'s Archive.',
        mirrors: [
          { label: "Anna's Archive", url: `https://annas-archive.li/md5/${md5}` },
          { label: "LibGen.li", url: `https://libgen.li/ads.php?md5=${md5}` },
          { label: "LibGen.rocks", url: `https://libgen.rocks/ads.php?md5=${md5}` },
        ],
        annaUrl: `https://annas-archive.li/md5/${md5}`,
      });
    }

    // Set proper headers for file download
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
