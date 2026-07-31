import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerStorageProxy } from "./storageProxy";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { runScheduledAggregator } from "../sources/aggregator";
import { initializeDefaultSources, seedDefaultGenres } from "../db";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  registerStorageProxy(app);

  // Seed default genres and aggregator sources
  try {
    await seedDefaultGenres();
    await initializeDefaultSources();
    console.log("[Seed] Default genres and sources initialized");
  } catch (error) {
    console.warn("[Seed] Failed to seed defaults (DB may not be available):", error);
  }

  // Vercel Cron invokes this route with GET and an Authorization bearer token.
  // One source is selected per run to remain within the serverless duration limit.
  app.get("/api/scheduled/aggregator", async (req, res) => {
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
      res.status(500).json({ error: "scheduled ingestion failed", timestamp: new Date().toISOString() });
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
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Fallback for 404s
  app.use((req, res) => {
    res.status(404).json({ error: "Not found" });
  });

  const preferredPort = parseInt(process.env.PORT || "3000", 10);
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
