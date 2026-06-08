import puppeteer from 'puppeteer';

async function startBrowser() {

    console.log("Launching browser...")

    const browser = await puppeteer.launch({
        headless: false,
        defaultViewport: { width: 1280, height: 720 }
    });
    const page = await browser.newPage();

    console.log("Navigating to google")
    await page.goto("https://www.google.com")

    console.log("Screenshotting")
    await page.screenshot({ path: "google.png" })

    console.log("Done! Closing browser in 3 seconds...");
    await new Promise(resolve => setTimeout(resolve, 3000));

    await browser.close()
}
startBrowser();