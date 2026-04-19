import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { type PnlData } from "../shared/schema";
import { calculatePnlValues } from "../shared/calculations";
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

async function fetchBinanceKlines(symbol: string): Promise<{ min: number; max: number }> {
    try {
        const response = await fetch(`https://fapi.binance.com/fapi/v1/klines?symbol=${encodeURIComponent(symbol)}&interval=1d&limit=2`, {
            headers: { Accept: "application/json", "User-Agent": "pnl-generator/1.0" },
        });
        if (!response.ok) throw new Error("Failed to fetch klines");
        const data = (await response.json()) as any[];
        
        // Extract all open/close prices
        const prices: number[] = [];
        data.forEach(candle => {
            prices.push(Number(candle[1])); // Open
            prices.push(Number(candle[4])); // Close
        });
        
        return {
            min: Math.min(...prices),
            max: Math.max(...prices)
        };
    } catch (error) {
        console.error("Klines fetch error:", error);
        return { min: 0, max: 1000000 };
    }
}

async function enrichPnlInput(data: Partial<PnlData> & { autoWin?: boolean }): Promise<Partial<PnlData>> {
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

  // Handle Auto-Win Logic
  if (data.autoWin && enriched.symbol && enriched.markPrice) {
    console.log(`[AutoWin] Symbol: ${enriched.symbol}, MarkPrice: ${enriched.markPrice}`);
    const markPrice = enriched.markPrice;
    const positionType = enriched.positionType || "Long";
    const targetProfit = 12000 + Math.random() * 6000;
    
    // Fetch daily range to ensure "realism"
    const range = await fetchBinanceKlines(enriched.symbol);
    
    let entryPrice: number;
    if (positionType === "Long") {
        // Must be lower than markPrice. 
        // Realistic range: between the 2-day low and slightly below mark price
        const upperBound = Math.min(range.max, markPrice * 0.99);
        const lowerBound = range.min;
        
        if (upperBound > lowerBound) {
             entryPrice = lowerBound + (Math.random() * (upperBound - lowerBound));
        } else {
             entryPrice = markPrice * 0.95; 
        }
    } else {
        // Short: Must be higher than markPrice.
        const lowerBound = Math.max(range.min, markPrice * 1.01);
        const upperBound = range.max;
        
        if (upperBound > lowerBound) {
            entryPrice = lowerBound + (Math.random() * (upperBound - lowerBound));
        } else {
            entryPrice = markPrice * 1.05;
        }
    }
    
    let size = targetProfit / (Math.abs(markPrice - entryPrice));
    const sizeDecimals = size > 1000 ? 0 : size > 10 ? 2 : 4;
    
    enriched.size = Number(size.toFixed(sizeDecimals));
    enriched.entryPrice = Number(entryPrice.toFixed(8));
    enriched.leverage = enriched.leverage || 20;
    enriched.unrealizedPnl = Number(targetProfit.toFixed(2));
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

async function fetchTopGainers(): Promise<{ symbol: string; priceChangePercent: string; lastPrice: string }[]> {
  try {
    const response = await fetch("https://fapi.binance.com/fapi/v1/ticker/24hr", {
      headers: { Accept: "application/json", "User-Agent": "pnl-generator/1.0" },
    });
    if (!response.ok) throw new Error("Failed to fetch gainers");
    const data = (await response.json()) as any[];
    
    // Sort by priceChangePercent descending and filter for USDT pairs
    return data
      .filter((t) => t.symbol.endsWith("USDT"))
      .sort((a, b) => parseFloat(b.priceChangePercent) - parseFloat(a.priceChangePercent))
      .slice(0, 10)
      .map((t) => ({
        symbol: t.symbol,
        priceChangePercent: t.priceChangePercent,
        lastPrice: t.lastPrice
      }));
  } catch (error) {
    console.error("Gainers fetch error:", error);
    return [];
  }
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // 1. Hot Coins Route (MUST BE BEFORE OTHER /api/pnl ROUTES)
  app.get("/api/pnl/hot-coins", async (_req, res) => {
    try {
      const gainers = await fetchTopGainers();
      res.json(gainers);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch hot coins" });
    }
  });

  // 2. Health check
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // 3. PNL Data Routes
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

  // 4. Specialized n8n API: Auto-Scalp Hot Coins & Return Image
  app.get("/api/pnl/scalp-image", async (_req, res) => {
    try {
      // --- 0. Optimization: Quick return if we have a recent hot image cached ---
      const cacheKey = "LAST_HOT_SCALP_IMAGE";
      const cachedImage = getCached(cacheKey);
      if (cachedImage) {
          res.set("Content-Type", "image/png");
          res.set("X-Cache", "HIT-HOT-SCALP");
          return res.send(cachedImage);
      }

      // 1. Get Hot Coins
      const hotCoins = await fetchTopGainers();
      if (hotCoins.length === 0) throw new Error("No hot coins found");
      
      // 2. Pick the hottest one
      const targetCoin = hotCoins[0];
      
      // 3. Generate Magic Win Data for this coin
      const pnlInput = await enrichPnlInput({
        symbol: targetCoin.symbol,
        positionType: "Long",
        autoWin: true
      });
      
      // 4. Calculate final values and save (optional, but good for consistency)
      const calculatedData = calculatePnlValues(pnlInput);
      await storage.updatePnlData(calculatedData);
      
      // 5. Generate Image URL Params
      const params = new URLSearchParams();
      Object.entries(calculatedData).forEach(([k, v]) => {
          if (v !== undefined && v !== null) params.append(k, String(v));
      });
      const urlParams = params.toString();

      // 6. Leverage existing image generation logic
      const browser = await getBrowser();
      const page = await browser.newPage();
      
      try {
        await page.setViewport({ width: 480, height: 280, deviceScaleFactor: 4 });
        
        // Dynamic URL detection for Vercel vs Local
        const host = req.headers.host || "localhost:3000";
        const protocol = req.headers['x-forwarded-proto'] || "http";
        const url = `${protocol}://${host}/isolated-card?${urlParams}`;
        
        console.log(`[Screenshot] Taking screenshot of: ${url}`);
        
        await page.goto(url, { waitUntil: "networkidle0", timeout: 60000 });
        const selector = "#pnl-card-container";
        await page.waitForSelector(selector, { timeout: 30000 });
        const element = await page.$(selector);
        
        if (!element) throw new Error("Card container not found");
        
        const imageBuffer = await element.screenshot({ type: "png", omitBackground: true });
        const buffer = Buffer.from(imageBuffer);

        // --- Cache miss: store result for 2 minutes specifically for hot scalp ---
        setCache("LAST_HOT_SCALP_IMAGE", buffer);
        
        res.set("Content-Type", "image/png");
        res.send(buffer);
      } finally {
        await page.close();
      }
    } catch (error: any) {
      console.error("Scalp-Image API Error:", error);
      res.status(500).json({ message: "Auto-Scalp Image Failed", error: error.message });
    }
  });

  // 5. PNL Image Export Route
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

      const browser = await getBrowser();
      page = await browser.newPage();

      // Set high resolution viewport (4x for maximum sharpness)
      await page.setViewport({ width: 480, height: 280, deviceScaleFactor: 4 });

      // Dynamic URL detection
      const host = req.headers.host || "localhost:3000";
      const protocol = req.headers['x-forwarded-proto'] || "http";
      const url = `${protocol}://${host}/isolated-card${urlParams ? `?${urlParams}` : ""}`;

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

