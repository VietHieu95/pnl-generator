import puppeteer, { Browser } from "puppeteer";
import { log } from "./index";

let browser: Browser | null = null;
let isInitializing = false;

export async function getBrowser(): Promise<Browser> {
    if (browser && browser.connected) {
        return browser;
    }

    if (isInitializing) {
        // Wait for the initialization to complete
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
        browser = await puppeteer.launch({
            args: [
                "--no-sandbox",
                "--disable-setuid-sandbox",
                "--disable-dev-shm-usage",
                "--disable-accelerated-2d-canvas",
                "--no-first-run",
                "--no-zygote",
                "--disable-gpu",
            ],
            headless: true,
        });

        browser.on("disconnected", () => {
            log("Shared browser disconnected. It will be re-initialized on next request.", "puppeteer");
            browser = null;
        });

        log("Shared browser initialized successfully.", "puppeteer");
        return browser;
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
