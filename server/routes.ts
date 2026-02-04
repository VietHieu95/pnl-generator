import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { pnlDataSchema } from "@shared/schema";
import { calculatePnlValues } from "@shared/calculations";
import puppeteer from "puppeteer";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
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
    let browser;
    try {
      const port = process.env.PORT || 3000;
      browser = await puppeteer.launch({
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
        headless: true,
      });
      const page = await browser.newPage();

      // Set viewport size suitable for the card
      await page.setViewport({ width: 1000, height: 1000, deviceScaleFactor: 2 });

      // Navigate to the isolated card page
      // Use 127.0.0.1 instead of localhost for better compatibility in containers
      await page.goto(`http://127.0.0.1:${port}/isolated-card`, {
        waitUntil: "networkidle0",
        timeout: 60000,
      });

      // Wait for the card container to be visible
      const selector = "#pnl-card-container";
      try {
        await page.waitForSelector(selector, { timeout: 10000 });
      } catch (e) {
        const content = await page.content();
        console.error("Content at failure:", content.substring(0, 1000));
        throw new Error(`Selector ${selector} not found. Page title: ${await page.title()}`);
      }

      // Extract the element's bounding box to crop accurately
      const element = await page.$(selector);
      if (!element) {
        throw new Error("Card container not found after waiting");
      }

      const imageBuffer = await element.screenshot({
        type: "png",
        omitBackground: true,
      });

      res.set("Content-Type", "image/png");
      res.send(imageBuffer);
    } catch (error: any) {
      console.error("Image generation error:", error);
      res.status(500).json({ message: "Failed to generate image", error: error.message });
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  });

  return httpServer;
}
