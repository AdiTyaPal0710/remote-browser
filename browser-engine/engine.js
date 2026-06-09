import puppeteer from 'puppeteer';
import { WebSocketServer } from 'ws';

const VIEWPORT = { width: 1280, height: 720 };
const wss = new WebSocketServer({ port: 8080 });
console.log('Browser engine WS server on ws://0.0.0.0:8080');

let browser = null;
let page = null;
let cdpClient = null;
let activeWs = null;
let currentFrameHandler = null;

async function initBrowser() {
    if (browser) return;

    browser = await puppeteer.launch({
        headless: true,
        defaultViewport: VIEWPORT,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--disable-gpu',
        ],
    });

    page = await browser.newPage();
    await page.goto('https://www.google.com');
    cdpClient = await page.createCDPSession();

    // Notify UI whenever the page navigates
    page.on('framenavigated', (frame) => {
        if (frame === page.mainFrame() && activeWs?.readyState === 1) {
            activeWs.send(JSON.stringify({ type: 'url', url: frame.url() }));
        }
    });
}

wss.on('connection', async (ws) => {
    console.log('UI connected!');

    // Tear down previous connection
    if (currentFrameHandler && cdpClient) {
        cdpClient.removeListener('Page.screencastFrame', currentFrameHandler);
        try { await cdpClient.send('Page.stopScreencast'); } catch { }
    }
    if (activeWs?.readyState === 1) activeWs.close();
    activeWs = ws;

    await initBrowser();

    // Send current URL
    ws.send(JSON.stringify({ type: 'url', url: page.url() }));

    // Start streaming frames
    currentFrameHandler = async (frame) => {
        if (ws.readyState === 1) ws.send(JSON.stringify({ type: 'frame', data: frame.data }));
        try { await cdpClient.send('Page.screencastFrameAck', { sessionId: frame.sessionId }); } catch { }
    };
    cdpClient.on('Page.screencastFrame', currentFrameHandler);
    await cdpClient.send('Page.startScreencast', {
        format: 'jpeg',
        quality: 65,
        maxWidth: VIEWPORT.width,
        maxHeight: VIEWPORT.height,
        everyNthFrame: 1,
    });

    // Handle commands from UI
    ws.on('message', async (raw) => {
        try {
            const cmd = JSON.parse(raw.toString());
            switch (cmd.action) {
                case 'click':
                    await page.mouse.click(cmd.x, cmd.y, cmd.button === 'right' ? { button: 'right' } : {});
                    break;
                case 'dblclick':
                    await page.mouse.click(cmd.x, cmd.y, { clickCount: 2 });
                    break;
                case 'mousemove':
                    await page.mouse.move(cmd.x, cmd.y);
                    break;
                case 'keydown':
                    await page.keyboard.down(cmd.key);
                    break;
                case 'keyup':
                    await page.keyboard.up(cmd.key);
                    break;
                case 'scroll':
                    await page.mouse.wheel({ deltaX: cmd.deltaX || 0, deltaY: cmd.deltaY || 0 });
                    break;
                case 'navigate':
                    try {
                        await page.goto(cmd.url, { waitUntil: 'domcontentloaded', timeout: 15000 });
                        ws.send(JSON.stringify({ type: 'url', url: page.url() }));
                    } catch (e) {
                        console.error('Nav error:', e.message);
                    }
                    break;
            }
        } catch (err) {
            console.error('Command error:', err.message);
        }
    });

    ws.on('close', async () => {
        console.log('UI disconnected.');
        if (currentFrameHandler) cdpClient.removeListener('Page.screencastFrame', currentFrameHandler);
        try { await cdpClient.send('Page.stopScreencast'); } catch { }
        currentFrameHandler = null;
        activeWs = null;
    });
});
