import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { type PnlData } from "@shared/schema";
import { calculatePnlValues } from "@shared/calculations";
import { getBrowser } from "./browser";

// -------------------------------------------------------------------
// In-memory PNG cache: key = urlParams string, value = { buffer, expiry }
// Cache entries expire after 60 seconds
// -------------------------------------------------------------------
interface CacheEntry {
  buffer: Buffer;
  expiry: number;
}
const imageCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 60_000;

function inferSizeUnit(symbol?: string): string | undefined {
  if (!symbol) return undefined;

  const normalized = symbol.trim().toUpperCase();
  for (const quote of ["USDT", "BUSD", "USDC", "FDUSD"]) {
    if (normalized.endsWith(quote) && normalized.length > quote.length) {
      return normalized.slice(0, -quote.length);
    }
  }

  return undefined;
}

async function fetchBinanceMarkPrice(symbol: string): Promise<number> {
  const normalized = symbol.trim().toUpperCase();
  const endpoints = [
    `https://fapi.binance.com/fapi/v1/ticker/price?symbol=${encodeURIComponent(normalized)}`,
    `https://api.binance.com/api/v3/ticker/price?symbol=${encodeURIComponent(normalized)}`,
  ];

  let lastError: Error | null = null;

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint, {
        headers: {
          Accept: "application/json",
          "User-Agent": "pnl-generator/1.0",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const payload = (await response.json()) as { price?: string };
      const price = Number(payload.price);

      if (!Number.isFinite(price) || price <= 0) {
        throw new Error("Invalid price payload");
      }

      return price;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
    }
  }

  throw new Error(
    `Unable to fetch live price for ${normalized}${lastError ? `: ${lastError.message}` : ""}`,
  );
}

async function enrichPnlInput(data: Partial<PnlData>): Promise<Partial<PnlData>> {
  const enriched: Partial<PnlData> = {
    ...data,
    symbol: data.symbol?.trim().toUpperCase() || data.symbol,
  };
  const rawMarkPrice = (data as { markPrice?: unknown }).markPrice;
  const shouldFetchLivePrice =
    rawMarkPrice === undefined || rawMarkPrice === null || rawMarkPrice === "";

  if (!enriched.sizeUnit) {
    enriched.sizeUnit = inferSizeUnit(enriched.symbol) || "BTC";
  }

  if (shouldFetchLivePrice && enriched.symbol) {
    enriched.markPrice = await fetchBinanceMarkPrice(enriched.symbol);
  }

  return enriched;
}

function getCached(key: string): Buffer | null {
  const entry = imageCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiry) {
    imageCache.delete(key);
    return null;
  }
  return entry.buffer;
}

function setCache(key: string, buffer: Buffer): void {
  imageCache.set(key, { buffer, expiry: Date.now() + CACHE_TTL_MS });
  // Auto-evict after TTL to prevent memory leaks
  setTimeout(() => imageCache.delete(key), CACHE_TTL_MS);
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Health check for cron jobs
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // PNL Data Routes
  app.get("/api/pnl", async (req, res) => {
    try {
      const data = await storage.getPnlData();
      res.json(data);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/pnl", async (req, res) => {
    try {
      const input = await enrichPnlInput(req.body);
      const calculatedData = calculatePnlValues(input);
      const data = await storage.updatePnlData(calculatedData);
      res.json(data);
    } catch (error: any) {
      const message = error?.message || "Invalid PNL data";
      const status = message.includes("Unable to fetch live price") ? 502 : 400;
      res.status(status).json({ message });
    }
  });

  // PNL Image Export Route
  app.get("/api/pnl/image", async (req, res) => {
    let page;
    try {
      const urlParams = new URLSearchParams(req.query as any).toString();

      // --- Cache hit: return immediately without Puppeteer ---
      const cached = getCached(urlParams);
      if (cached) {
        res.set("Content-Type", "image/png");
        res.set("X-Cache", "HIT");
        return res.send(cached);
      }

      const port = process.env.PORT || 3000;
      const browser = await getBrowser();
      page = await browser.newPage();

      // Set high resolution viewport (4x for maximum sharpness)
      await page.setViewport({ width: 480, height: 280, deviceScaleFactor: 4 });

      const url = `http://127.0.0.1:${port}/isolated-card${urlParams ? `?${urlParams}` : ""}`;

      try {
        await page.goto(url, {
          waitUntil: "networkidle0",
          timeout: 60000,
        });

        const selector = "#pnl-card-container";
        await page.waitForSelector(selector, { timeout: 30000 });

        const element = await page.$(selector);
        if (!element) {
          throw new Error("Card container element is null");
        }

        const imageBuffer = await element.screenshot({
          type: "png",
          omitBackground: true,
        });

        const buffer = Buffer.from(imageBuffer);

        // --- Cache miss: store result for next identical request ---
        setCache(urlParams, buffer);

        res.set("Content-Type", "image/png");
        res.set("X-Cache", "MISS");
        res.send(buffer);
      } catch (pageError: any) {
        const content = await page.content();
        console.error("Page content at error:", content.substring(0, 500));
        throw pageError;
      }
    } catch (error: any) {
      console.error("Image generation error:", error);
      res.status(500).json({ message: "Failed to generate image", error: error.message });
    } finally {
      if (page) {
        await page.close();
      }
    }
  });

  return httpServer;
}

