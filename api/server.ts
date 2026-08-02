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
    const url = `http://libgen.li/index.php?req=${encodedQuery}&lg_topic=libgen&open=0&view=simple&res=100&phrase=1&column=def${langParam}`;

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
          annaUrl: annaUrl || `https://en.annas-archive.gl/md5/${md5}`,
          mirrors: [
            annaUrl || `https://en.annas-archive.gl/md5/${md5}`,
            `https://libgen.li/get.php?md5=${md5}`,
            `https://libgen.rs/get.php?md5=${md5}`,
          ],
          formats: {
            pdf: annaUrl || `https://en.annas-archive.gl/md5/${md5}`,
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


export default function handler(req: VercelRequest, res: VercelResponse) {
  return app(req, res);
}
