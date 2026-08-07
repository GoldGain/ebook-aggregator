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
      headers: { "User-Agent": "Mozilla/5.0 (compatible; ZAMIFU-E-MATERIALS/2.0)" },
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
        "User-Agent": "Mozilla/5.0 (compatible; ZAMIFU-E-MATERIALS/2.0; Educational Aggregator)",
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
      if (format.toLowerCase() !== 'pdf') return;

      // Cell 8: MD5 download link — extract both Libgen and Anna's Archive links
      const libgenLink = cells.eq(8).find('a[title="libgen"], a[href*="/get.php"]').first();
      const annaLink = cells.eq(8).find('a[href*="annas-archive"]').first();
      const md5Href = libgenLink.attr("href") || annaLink.attr("href") || "";
      const md5Match = md5Href.match(/md5=([a-f0-9]{32})/);
      const md5 = md5Match ? md5Match[1] : "";
      const annaUrl = annaLink.attr("href") || "";

      // Skip garbage titles (ISBNs, DOIs, pure numbers)
      if (!title || !md5) return;
      if (/^[\d\s;:.,-]+$/.test(title) || /^DOI:\s/i.test(title) || /^10\.\d{4}\//i.test(title)) return;
      if (title.length < 3) return;
      if (true) {
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
          annaUrl: annaUrl || `https://annas-archive.li/md5/${md5}`,
          mirrors: [
            annaUrl || `https://annas-archive.li/md5/${md5}`,
            `https://libgen.li/get.php?md5=${md5}`,
            `https://libgen.rs/get.php?md5=${md5}`,
          ],
          formats: {
            pdf: annaUrl || `https://annas-archive.li/md5/${md5}`,
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


// Download proxy — fast-fail with aggressive timeouts + fallback URLs
app.all("/api/download", async (req: any, res: any) => {
  let md5: string | undefined;
  let format = "pdf";

  if (req.method === "GET") {
    md5 = req.query.md5 as string | undefined;
    format = (req.query.format as string) || "pdf";
  } else if (req.method === "POST") {
    const body = req.body || {};
    md5 = body.md5;
    format = body.format || "pdf";
  }

  if (!md5 || typeof md5 !== "string" || md5.length !== 32) {
    return res.status(400).json({ error: "Valid 32-character md5 required", success: false });
  }

  // ── Anna's Archive fallback URL (most reliable, returns JSON with mirror list) ──
  const annaJsonUrl = `https://annas-archive.li/md5/${md5}.json`;
  const annaHtmlUrl = `https://annas-archive.li/md5/${md5}`;

  const axios = await import("axios");
  const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";
  const TIMEOUT = 20000; // 20 seconds per attempt — servers can be slow

  const isBinaryCt = (ct: string) =>
    /application\/pdf|application\/octet-stream|application\/epub|djvu|binary/i.test(ct || "");

  const sendFile = (data: Buffer, ct: string) => {
    const ext = (format || "pdf").toLowerCase();
    res.setHeader("Content-Type", ct || "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="book.${ext}"`);
    res.setHeader("Content-Length", data.length.toString());
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Expose-Headers", "Content-Disposition, Content-Length");
    return res.send(data);
  };

  const tryDownload = async (url: string, referer?: string): Promise<boolean> => {
    try {
      const r = await axios.default.get(url, {
        responseType: "arraybuffer",
        timeout: TIMEOUT,
        maxRedirects: 8,
        headers: { "User-Agent": UA, "Referer": referer || "https://annas-archive.li/", "Accept": "*/*" },
        validateStatus: (s: number) => s < 500, // try to keep working even on 4xx edge cases
      });
      const ct = r.headers["content-type"] || "";
      // Skip HTML/JSON error pages
      if (/text\/html|application\/json/.test(ct) && r.data && r.data.length < 50000) return false;
      // Verify binary magic bytes
      const buf = Buffer.from(r.data);
      if (buf.length > 1000) {
        const magic = buf.slice(0, 4).toString("hex");
        if (magic === "25504446" || magic === "504b0304" || magic === "41542654" || magic === "d0cf11e0" || magic === "0000001c") {
          sendFile(buf, isBinaryCt(ct) ? ct : "application/pdf");
          return true;
        }
        if (buf.length > 100000 && !/text\/html/.test(ct)) {
          sendFile(buf, ct || "application/pdf");
          return true;
        }
      }
    } catch {}
    return false;
  };

  // Attempt 0: Anna's Archive .json endpoint — returns direct mirror URLs
  try {
    const jsonResp = await axios.default.get(annaJsonUrl, {
      timeout: 10000,
      maxRedirects: 5,
      headers: { "User-Agent": UA, "Referer": annaHtmlUrl, Accept: "application/json" },
    });
    if (jsonResp.data && jsonResp.data?.mirrors?.length) {
      const mirrors = jsonResp.data.mirrors;
      const results = await Promise.allSettled(mirrors.map((m: any) => {
        const url = typeof m === "string" ? m : m?.url;
        return url ? tryDownload(url, annaHtmlUrl) : Promise.resolve(false);
      }));
      if (results.some(r => r.status === "fulfilled" && r.value)) return;
    }
  } catch {}

  // Attempt 1: Scrape library.lol for a direct download link
  try {
    const lolResp = await axios.default.get(`https://library.lol/main/${md5}`, {
      timeout: TIMEOUT,
      maxRedirects: 3,
      headers: { "User-Agent": UA, "Referer": "https://library.lol/", "Accept": "text/html" },
    });
    const lolHtml = typeof lolResp.data === "string" ? lolResp.data : lolResp.data.toString();
    // Parse the actual download link inside id="download"
    const dlMatch = lolHtml.match(/id=["']download["'][\s\S]*?<a[^>]+href=["']([^"']+)["']/i);
    if (dlMatch && dlMatch[1] && !dlMatch[1].includes("library.lol")) {
      if (await tryDownload(dlMatch[1], "https://library.lol/")) return;
    }
    // Also try any libgen mirror link on the page
    const libMatch = lolHtml.match(/href=["'](https?:\/\/(?:libgen\.[a-z]+|books\.ms)[^\"']*\.(?:pdf|epub|djvu|fb2)[^"']*)["']/i);
    if (libMatch && libMatch[1]) {
      if (await tryDownload(libMatch[1], "https://library.lol/")) return;
    }
  } catch {}

  // Attempt 2: Try to get key from libgen.li, then download
  try {
    const adsResp = await axios.default.get(`https://libgen.li/ads.php?md5=${md5}`, {
      timeout: TIMEOUT,
      maxRedirects: 5,
      headers: { "User-Agent": UA },
    });
    const html = typeof adsResp.data === "string" ? adsResp.data : adsResp.data.toString();
    const keyMatch = html.match(new RegExp("get\\.php\\?md5=" + md5 + "&key=([A-Za-z0-9]+)"));
    if (keyMatch) {
      const key = keyMatch[1];
      if (await tryDownload(`https://libgen.li/get.php?md5=${md5}&key=${key}`, `https://libgen.li/ads.php?md5=${md5}`)) return;
    }
  } catch {}

  // Attempt 3: Try direct download from multiple libgen mirrors
  const directUrls = [
    `https://libgen.rocks/get.php?md5=${md5}`,
    `https://libgen.is/get.php?md5=${md5}`,
    `https://libgen.gs/get.php?md5=${md5}`,
    `https://libgen.li/get.php?md5=${md5}`,
  ];

  const results = await Promise.allSettled(directUrls.map(url => tryDownload(url)));

  // If any succeeded, the response was already sent
  const anySuccess = results.some(r => r.status === "fulfilled" && r.value);
  if (anySuccess) return;

  // All server-side attempts failed — give the browser a direct mirror URL
  // that it can download itself (avoids leaving the user with a 404).
  return res.status(200).json({
    success: false,
    error: "Download unavailable",
    message: "Could not fetch this file from any source. The file may have been removed or is temporarily unavailable. Please try again later.",
  });
});

// OPTIONS preflight
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
        headers: { "User-Agent": "Mozilla/5.0 (compatible; ZAMIFU-E-MATERIALS/2.0; Educational Aggregator)" },
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
        // Only include PDFs
        const formatCell = cells.eq(7).text().trim().toLowerCase();
        if (title && md5 && title.length > 2 && formatCell === 'pdf') {
          libgenBooks.push({
            title, author: author || "Unknown", year: year || "",
            language: lang || "en", md5, source: "libgen",
            sourceUrl: `https://annas-archive.li/md5/${md5}`,
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
