// Vercel Serverless Function - wraps the Express server for API routes
import "dotenv/config";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import express from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerStorageProxy } from "../server/_core/storageProxy";
import { appRouter } from "../server/routers";
import { createContext } from "../server/_core/context";
import { runScheduledAggregator } from "../server/sources/aggregator";

const app = express();

// Configure body parser
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Register storage proxy
registerStorageProxy(app);

// Scheduled aggregator endpoint — protected by CRON_SECRET
app.get("/api/scheduled/aggregator", async (req: any, res: any) => {
  const cronSecret = process.env.CRON_SECRET;
  const authorization = req.headers.authorization;
  if (!cronSecret || authorization !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: "unauthorized" });
  }
  try {
    const result = await runScheduledAggregator();
    res.json({ ok: true, ...result });
  } catch (error) {
    console.error("Scheduled aggregator error:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date().toISOString(),
    });
  }
});

// tRPC API
app.use(
  "/api/trpc",
  createExpressMiddleware({
    router: appRouter,
    createContext,
  })
);


// URL health check — returns live status and fallback suggestions
app.get("/api/check-url", async (req: any, res: any) => {
  const url = req.query.url as string | undefined;
  if (!url) return res.status(400).json({ error: "url param required" });

  try {
    const axios = await import("axios");
    const response = await axios.default.head(url, {
      timeout: 8000,
      maxRedirects: 5,
      headers: { "User-Agent": "Mozilla/5.0 (compatible; LuminaBooks/2.0)" },
    });
    return res.json({ ok: true, status: response.status, url });
  } catch (error: any) {
    const status = error?.response?.status ?? 0;
    return res.json({ ok: false, status, url });
  }
});

// LibGen search endpoint — scrapes Library Genesis for book metadata
app.get("/api/libgen", async (req: any, res: any) => {
  const q = req.query.q as string | undefined;
  const limit = parseInt(req.query.limit as string || "50", 10);
  const language = req.query.lang as string | undefined; // e.g. "Swahili"

  if (!q || q.length < 2) {
    return res.status(400).json({ error: 'Query parameter "q" is required (min 2 chars)' });
  }

  try {
    const encodedQuery = encodeURIComponent(q);
    const langParam = language ? `&lang=${encodeURIComponent(language)}` : "";
    const url = `https://libgen.li/index.php?req=${encodedQuery}&lg_topic=libgen&open=0&view=simple&res=100&phrase=1&column=def${langParam}`;

    const axios = await import("axios");
    const cheerioModule = await import("cheerio");
    const cheerio = cheerioModule.default || cheerioModule;

    const response = await axios.default.get(url, {
      timeout: 30000,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; LuminaBooks/2.0; Educational Aggregator)",
      },
    });

    const $ = cheerio.load(response.data);
    const books: Array<{
      title: string;
      author: string;
      year: string;
      publisher: string;
      language: string;
      pages: string;
      format: string;
      filesize: string;
      md5: string;
      source: string;
      sourceUrl: string;
      formats: { pdf: string };
    }> = [];

    // Target the results table by its id
    $("#tablelibgen tr").each((_i: number, row: any) => {
      const cells = $(row).find("td");
      if (cells.length < 9) return;

      // Cell 0: Title — the <a> linking to edition.php has the book title
      // Get the last edition link (actual book title, after <br>) — skip edition-number links inside <b>
      const editionLinks = cells.eq(0).find('a[href*="edition.php"]');
      const titleLink = editionLinks.length > 1 ? editionLinks.last() : editionLinks.first();
      if (!titleLink.length) return;
      const title = titleLink.text().trim();

      // Cell 1: Author
      const author = cells.eq(1).text().trim();

      // Cell 2: Publisher
      const publisher = cells.eq(2).text().trim();

      // Cell 3: Year/Date
      const year = cells.eq(3).text().trim();

      // Cell 4: Language
      const language = cells.eq(4).text().trim();

      // Cell 5: Pages
      const pages = cells.eq(5).text().trim();

      // Cell 6: File size
      const filesize = cells.eq(6).text().trim();

      // Cell 7: Format
      const format = cells.eq(7).text().trim();

      // Cell 8: MD5 download link — extract both Libgen and Anna's Archive links
      const libgenLink = cells.eq(8).find('a[title="libgen"], a[href*="/get.php"]').first();
      const annaLink = cells.eq(8).find('a[href*="annas-archive"]').first();
      const md5Href = libgenLink.attr("href") || annaLink.attr("href") || "";
      const md5Match = md5Href.match(/md5=([a-f0-9]{32})/);
      const md5 = md5Match ? md5Match[1] : "";
      const annaUrl = annaLink.attr("href") || "";

      if (title && md5 && title.length > 2) {
        books.push({
          title,
          author: author || "Unknown",
          year: year || "",
          publisher: publisher || "",
          language: language || "",
          pages: pages || "",
          format: format || "",
          filesize: filesize || "",
          md5,
          source: "libgen",
          // Primary: Anna's Archive (most reliable); fallback to libgen mirrors
          sourceUrl: annaUrl || `https://libgen.li/get.php?md5=${md5}`,
          annaUrl: annaUrl || `https://annas-archive.org/md5/${md5}`,
          mirrors: [
            annaUrl || `https://annas-archive.org/md5/${md5}`,
            `https://libgen.li/get.php?md5=${md5}`,
            `https://libgen.rs/get.php?md5=${md5}`,
          ],
          formats: {
            pdf: annaUrl || `https://annas-archive.org/md5/${md5}`,
          },
        });
      }
    });

    const limitedBooks = books.slice(0, limit);

    return res.status(200).json({
      success: true,
      source: "libgen",
      query: q,
      total: limitedBooks.length,
      books: limitedBooks,
    });
  } catch (error: any) {
    console.error("LibGen search error:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to search LibGen",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});


// Download proxy — resolves actual file URL from LibGen mirrors and streams to user
// Supports both GET (query params) and POST (JSON body)
app.all("/api/download", async (req: any, res: any) => {
  // Parse inputs from GET query or POST body
  let md5: string | undefined;
  let directUrl: string | undefined;
  let format = "pdf";

  if (req.method === "GET") {
    md5 = req.query.md5 as string | undefined;
    directUrl = req.query.url as string | undefined;
    format = (req.query.format as string) || "pdf";
  } else if (req.method === "POST") {
    const body = req.body || {};
    md5 = body.md5;
    directUrl = body.url;
    format = body.format || "pdf";
  }

  if (!md5 && !directUrl) {
    return res.status(400).json({ error: "md5 or url required", success: false });
  }

  const axios = await import("axios");
  const cheerioModule = await import("cheerio");
  const cheerio = cheerioModule.default || cheerioModule;

  const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

  const isFileResponse = (ct: string) =>
    !ct.includes("text/html") && !ct.includes("application/json") && ct.length > 0;

  const streamFile = (data: Buffer, contentType: string) => {
    const ext = (format || "pdf").toLowerCase();
    res.setHeader("Content-Type", contentType || "application/octet-stream");
    res.setHeader("Content-Disposition", `attachment; filename="book.${ext}"`);
    res.setHeader("Content-Length", data.length.toString());
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Expose-Headers", "Content-Disposition");
    return res.send(data);
  };

  // Step 1: Direct URL provided
  if (directUrl) {
    try {
      const response = await axios.default.get(directUrl, {
        responseType: "arraybuffer",
        timeout: 40000,
        maxRedirects: 8,
        headers: { "User-Agent": UA, "Referer": "https://libgen.is/" },
        validateStatus: (s: number) => s < 500,
      });
      const ct = response.headers["content-type"] || "";
      if (isFileResponse(ct) && response.data && response.data.length > 1000) {
        return streamFile(Buffer.from(response.data), ct);
      }
    } catch { /* fall through */ }
  }

  if (!md5) {
    return res.status(404).json({ error: "No working download link found", success: false });
  }

  // Step 2: Get download key from libgen.li (works from datacenter IPs)
  let resolvedUrl: string | null = null;
  if (md5) {
    try {
      // get.php redirects to ads.php which contains the download key
      const adsResp = await axios.default.get(`https://libgen.li/ads.php?md5=${md5}`, {
        timeout: 12000,
        maxRedirects: 5,
        headers: { "User-Agent": UA, "Accept": "text/html,application/xhtml+xml" },
      });
      const adsHtml = typeof adsResp.data === "string" ? adsResp.data : adsResp.data.toString();
      // Extract key from: get.php?md5=XXX&key=YYY
      const keyMatch = adsHtml.match(/get\.php\?md5=([a-f0-9]{32})&key=([A-Za-z0-9]+)/);
      if (keyMatch) {
        const downloadKey = keyMatch[2];
        const downloadUrl = `https://libgen.li/get.php?md5=${md5}&key=${downloadKey}`;
        // Try to download the file directly
        const fileResp = await axios.default.get(downloadUrl, {
          responseType: "arraybuffer",
          timeout: 40000,
          maxRedirects: 8,
          headers: { "User-Agent": UA, "Referer": `https://libgen.li/ads.php?md5=${md5}` },
          validateStatus: (s: number) => s < 500,
        });
        const ct = fileResp.headers["content-type"] || "";
        if (isFileResponse(ct) && fileResp.data && fileResp.data.length > 1000) {
          return streamFile(Buffer.from(fileResp.data), ct);
        }
        // Save for later if it returned HTML
        if (fileResp.data && fileResp.data.length < 100000) {
          resolvedUrl = downloadUrl;
        }
      } else {
        // Try to find any download link on the page
        const linkMatch = adsHtml.match(/href=["']([^"']*(?:download|main/)[^"']*)["']/i);
        if (linkMatch) {
          resolvedUrl = linkMatch[1].startsWith("http") ? linkMatch[1] : `https://libgen.li${linkMatch[1]}`;
        }
      }
    } catch { /* libgen.li key extraction failed */ }
  }

  // Step 3: Scrape Anna's Archive for download links (most reliable proxy)
  // Step 2: Scrape Anna's Archive for download links (most reliable proxy) (most reliable proxy)
  try {
    const annaResp = await axios.default.get(`https://annas-archive.org/md5/${md5}`, {
      timeout: 15000,
      maxRedirects: 5,
      headers: { "User-Agent": UA, "Accept": "text/html,application/xhtml+xml" },
    });
    const $ = cheerio.load(annaResp.data);

    // Find all download links on Anna's Archive page
    const downloadLinks: string[] = [];
    $('a[href*="library.lol"], a[href*="libgen."], a[href*="cloudflare-ipfs.com"], a[href*="gateway.ipfs.io"], a[href*="download."]').each((_: number, el: any) => {
      const href = $(el).attr("href");
      if (href && (href.includes("/main/") || href.includes("/ipfs/") || href.includes("get.php") || href.includes("ads.php"))) {
        downloadLinks.push(href);
      }
    });

    // Try each Anna's Archive resolved link
    for (const link of downloadLinks.slice(0, 5)) {
      try {
        const testResp = await axios.default.get(link, {
          responseType: "arraybuffer",
          timeout: 30000,
          maxRedirects: 8,
          headers: { "User-Agent": UA, "Referer": "https://annas-archive.org/" },
          validateStatus: (s: number) => s < 500,
        });
        const ct = testResp.headers["content-type"] || "";
        if (isFileResponse(ct) && testResp.data && testResp.data.length > 1000) {
          return streamFile(Buffer.from(testResp.data), ct);
        }
      } catch { continue; }
    }

    // Save the first link for fallback
    if (downloadLinks.length > 0) resolvedUrl = downloadLinks[0];
  } catch { /* Anna's Archive unavailable */ }

  // Step 3: Try library.lol directly
  try {
    const pageResp = await axios.default.get(`https://library.lol/main/${md5}`, {
      timeout: 15000,
      maxRedirects: 5,
      headers: { "User-Agent": UA, "Accept": "text/html,application/xhtml+xml,*/*" },
      validateStatus: (s: number) => s < 500,
    });
    const ct = pageResp.headers["content-type"] || "";
    if (isFileResponse(ct) && pageResp.data && pageResp.data.length > 1000) {
      return streamFile(Buffer.from(pageResp.data), ct);
    }
    // Try scraping the page for download links
    if (typeof pageResp.data === "string" || pageResp.data instanceof Buffer) {
      const html = pageResp.data.toString();
      const $ = cheerio.load(html);
      const downloadHref = $("#download h2 a, #download a[href*='.pdf'], #download a[href*='.epub'], #download a").first().attr("href");
      if (downloadHref && downloadHref.startsWith("http")) {
        resolvedUrl = downloadHref;
      }
    }
  } catch { /* library.lol unavailable */ }

  // Step 4: Try libgen.li/get.php (may redirect to binary)
  try {
    const testResp = await axios.default.get(`https://libgen.li/get.php?md5=${md5}`, {
      responseType: "arraybuffer",
      timeout: 20000,
      maxRedirects: 8,
      headers: { "User-Agent": UA, "Referer": "https://libgen.li/" },
      validateStatus: (s: number) => s < 500,
    });
    const ct = testResp.headers["content-type"] || "";
    if (isFileResponse(ct) && testResp.data && testResp.data.length > 1000) {
      return streamFile(Buffer.from(testResp.data), ct);
    }
  } catch { /* try next */ }

  // Step 5: Try alternative mirrors
  const altMirrors = [
    `https://download.library.lol/main/${md5}`,
    `https://libgen.rocks/get.php?md5=${md5}`,
    `https://libgen.rs/get.php?md5=${md5}`,
    `https://libgen.is/get.php?md5=${md5}`,
    `https://libgen.gs/get.php?md5=${md5}`,
  ];
  for (const m of altMirrors) {
    try {
      const testResp = await axios.default.get(m, {
        responseType: "arraybuffer",
        timeout: 15000,
        maxRedirects: 8,
        headers: { "User-Agent": UA, "Referer": "https://libgen.is/" },
        validateStatus: (s: number) => s < 500,
      });
      const ct = testResp.headers["content-type"] || "";
      if (isFileResponse(ct) && testResp.data && testResp.data.length > 1000) {
        return streamFile(Buffer.from(testResp.data), ct);
      }
    } catch { continue; }
  }

  // Step 6: Stream from resolved URL (Anna's Archive or library.lol link)
  if (resolvedUrl) {
    try {
      const response = await axios.default.get(resolvedUrl, {
        responseType: "arraybuffer",
        timeout: 50000,
        maxRedirects: 8,
        headers: { "User-Agent": UA, "Referer": "https://annas-archive.org/" },
      });
      const ct = response.headers["content-type"] || "application/octet-stream";
      if (response.data && response.data.length > 1000) {
        return streamFile(Buffer.from(response.data), ct);
      }
    } catch { /* exhausted */ }
  }

  return res.status(502).json({
    success: false,
    error: "All download mirrors failed",
    fallback: `https://annas-archive.org/md5/${md5}`,
    message: "Please try the Mirrors button for manual download",
  });
});

// OPTIONS preflight for download
app.options("/api/download", (_req: any, res: any) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.status(204).end();
});

// KICD + KNEC materials search endpoint
app.get("/api/kicd", async (req: any, res: any) => {
  const q = (req.query.q as string || "").toLowerCase();
  const limit = parseInt(req.query.limit as string || "50", 10);

  try {
    const { fetchKicdResources } = await import("../server/sources/kicd");
    const { fetchKnecResources } = await import("../server/sources/knec");

    const [kicdResults, knecResults] = await Promise.allSettled([
      fetchKicdResources(limit),
      fetchKnecResources(limit),
    ]);

    let allResources: any[] = [];
    if (kicdResults.status === "fulfilled") allResources.push(...kicdResults.value);
    if (knecResults.status === "fulfilled") allResources.push(...knecResults.value);

    // Filter by query if provided
    if (q && q.length >= 2) {
      allResources = allResources.filter((r: any) =>
        r.title.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q) ||
        r.subjects.some((s: string) => s.toLowerCase().includes(q))
      );
    }

    return res.status(200).json({
      success: true,
      source: "kicd_knec",
      query: q || null,
      total: allResources.length,
      books: allResources.slice(0, limit),
    });
  } catch (error: any) {
    console.error("KICD/KNEC search error:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to fetch KICD/KNEC materials",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// Unified search — combines LibGen, KICD/KNEC, and local DB
app.get("/api/search", async (req: any, res: any) => {
  const q = (req.query.q as string || "").trim();
  const limit = parseInt(req.query.limit as string || "50", 10);

  if (!q || q.length < 2) {
    return res.status(400).json({ error: 'Query parameter "q" is required (min 2 chars)' });
  }

  try {
    const axios = await import("axios");
    const cheerioModule = await import("cheerio");
    const cheerio = cheerioModule.default || cheerioModule;

    // 1. Fetch LibGen results
    let libgenBooks: any[] = [];
    try {
      const encodedQuery = encodeURIComponent(q);
      const lgUrl = `https://libgen.li/index.php?req=${encodedQuery}&lg_topic=libgen&open=0&view=simple&res=50&phrase=1&column=def`;
      const response = await axios.default.get(lgUrl, {
        timeout: 20000,
        headers: { "User-Agent": "Mozilla/5.0 (compatible; LuminaBooks/2.0; Educational Aggregator)" },
      });
      const $ = cheerio.load(response.data);
      $("#tablelibgen tr").each((_i: number, row: any) => {
        const cells = $(row).find("td");
        if (cells.length < 9) return;
        const editionLinks = cells.eq(0).find('a[href*="edition.php"]');
        const titleLink = editionLinks.length > 1 ? editionLinks.last() : editionLinks.first();
        if (!titleLink.length) return;
        const title = titleLink.text().trim();
        const author = cells.eq(1).text().trim();
        const year = cells.eq(3).text().trim();
        const lang = cells.eq(4).text().trim();
        const annaLink = cells.eq(8).find('a[href*="annas-archive"]').first();
        const libgenLink = cells.eq(8).find('a[title="libgen"], a[href*="/get.php"]').first();
        const md5Href = libgenLink.attr("href") || annaLink.attr("href") || "";
        const md5Match = md5Href.match(/md5=([a-f0-9]{32})/);
        const md5 = md5Match ? md5Match[1] : "";
        if (title && md5 && title.length > 2) {
          libgenBooks.push({
            title, author: author || "Unknown", year: year || "",
            language: lang || "en", md5, source: "libgen",
            sourceUrl: `https://annas-archive.org/md5/${md5}`,
          });
        }
      });
    } catch (e) { /* LibGen unavailable — continue with other sources */ }

    // 2. Fetch KICD/KNEC (lightweight — timeout fast)
    let kicdBooks: any[] = [];
    try {
      const [kicdModule, knecModule] = await Promise.all([
        import("../server/sources/kicd").catch(() => null),
        import("../server/sources/knec").catch(() => null),
      ]);
      const fetchKicdResources = (kicdModule as any)?.fetchKicdResources;
      const fetchKnecResources = (knecModule as any)?.fetchKnecResources;
      if (fetchKicdResources) {
        const results = await Promise.race([
          fetchKicdResources(20),
          new Promise<any[]>((_, reject) => setTimeout(() => reject(new Error("timeout")), 8000)),
        ]).catch(() => []);
        kicdBooks.push(...results.filter((r: any) => r.title.toLowerCase().includes(q)));
      }
      if (fetchKnecResources) {
        const results = await Promise.race([
          fetchKnecResources(20),
          new Promise<any[]>((_, reject) => setTimeout(() => reject(new Error("timeout")), 8000)),
        ]).catch(() => []);
        kicdBooks.push(...results.filter((r: any) => r.title.toLowerCase().includes(q)));
      }
    } catch (e) { /* KICD/KNEC unavailable */ }

    // 3. Combine and deduplicate
    const allBooks = [...libgenBooks, ...kicdBooks.map((b: any) => ({
      ...b, source: b.author === "KICD" ? "kicd" : "knec",
    }))];

    return res.status(200).json({
      success: true,
      query: q,
      total: allBooks.length,
      sources: {
        libgen: libgenBooks.length,
        kicd_knec: kicdBooks.length,
      },
      books: allBooks.slice(0, limit),
    });
  } catch (error: any) {
    console.error("Unified search error:", error);
    return res.status(500).json({
      success: false,
      error: "Unified search failed",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});


export default function handler(req: VercelRequest, res: VercelResponse) {
  return app(req, res);
}
