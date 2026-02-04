import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { pnlDataSchema } from "@shared/schema";
import { calculatePnlValues } from "@shared/calculations";
import puppeteer from "puppeteer";
import { getBrowser } from "./browser";

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
      // Calculate missing values if possible
      const calculatedData = calculatePnlValues(req.body);
      const data = await storage.updatePnlData(calculatedData);
      res.json(data);
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Invalid PNL data" });
    }
  });

  // PNL Image Export Route
  app.get("/api/pnl/image", async (req, res) => {
    let page;
    try {
      const port = process.env.PORT || 3000;
      const browser = await getBrowser();
      page = await browser.newPage();

      // Set viewport size suitable for the card
      await page.setViewport({ width: 1000, height: 1000, deviceScaleFactor: 2 });

      // Navigate to the isolated card page
      // Append query parameters to the URL to enable stateless generation
      const urlParams = new URLSearchParams(req.query as any).toString();
      const url = `http://127.0.0.1:${port}/isolated-card${urlParams ? `?${urlParams}` : ""}`;

      try {
        await page.goto(url, {
          waitUntil: "domcontentloaded",
          timeout: 60000,
        });

        // Wait for the card container to be visible
        const selector = "#pnl-card-container";
        await page.waitForSelector(selector, { timeout: 30000 });

        // Extract the element's bounding box to crop accurately
        const element = await page.$(selector);
        if (!element) {
          throw new Error("Card container element is null");
        }

        const imageBuffer = await element.screenshot({
          type: "png",
          omitBackground: true,
        });

        res.set("Content-Type", "image/png");
        res.send(imageBuffer);
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
