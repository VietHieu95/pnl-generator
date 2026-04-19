import { log } from "./index";
import type { Browser } from "puppeteer-core";

let browser: Browser | null = null;
let isInitializing = false;

export async function getBrowser(): Promise<Browser> {
    if (browser && browser.connected) {
        return browser;
    }

    if (isInitializing) {
        while (isInitializing) {
            await new Promise((resolve) => setTimeout(resolve, 100));
        }
        if (browser && browser.connected) {
            return browser;
        }
    }

    isInitializing = true;
    try {
        log("Initializing shared browser instance...", "puppeteer");
        
        const isVercel = process.env.VERCEL === "1";
        
        if (isVercel) {
            const chromium = require("@sparticuz/chromium");
            const puppeteer = require("puppeteer-core");
            
            browser = await puppeteer.launch({
                args: chromium.args,
                defaultViewport: chromium.defaultViewport,
                executablePath: await chromium.executablePath(),
                headless: chromium.headless,
            });
        } else {
            const puppeteer = require("puppeteer");
            browser = await puppeteer.launch({
                args: ["--no-sandbox", "--disable-setuid-sandbox"],
                executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
                headless: true,
            });
        }

        browser!.on("disconnected", () => {
            log("Shared browser disconnected.", "puppeteer");
            browser = null;
        });

        log("Shared browser initialized successfully.", "puppeteer");
        return browser!;
    } catch (error) {
        log(`Failed to initialize shared browser: ${error}`, "puppeteer");
        browser = null;
        throw error;
    } finally {
        isInitializing = false;
    }
}

export async function closeBrowser() {
    if (browser) {
        log("Closing shared browser instance...", "puppeteer");
        await browser.close();
        browser = null;
    }
}
