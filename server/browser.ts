import puppeteer, { type Browser } from "puppeteer-core";

let browser: Browser | null = null;
let isInitializing = false;

function log(message: string, source = "puppeteer") {
    const formattedTime = new Date().toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
    });

    console.log(`${formattedTime} [${source}] ${message}`);
}

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
            const chromium = (await import("@sparticuz/chromium")).default as any;
            
            browser = await (puppeteer as any).launch({
                args: chromium.args,
                defaultViewport: chromium.defaultViewport,
                executablePath: await chromium.executablePath(),
                headless: chromium.headless ?? true,
            });
        } else {
            browser = await (puppeteer as any).launch({
                args: ["--no-sandbox", "--disable-setuid-sandbox"],
                executablePath:
                    process.env.PUPPETEER_EXECUTABLE_PATH ||
                    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
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
