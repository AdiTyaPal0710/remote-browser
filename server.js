import express from 'express';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import { fileURLToPath } from 'url';

const execAsync = promisify(exec);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const PORT = 3000;
const CONTAINER_NAME = 'bld-remote-browser';
const IMAGE_NAME = 'bld-browser-engine';
const ENGINE_DIR = path.join(__dirname, 'browser-engine');

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ── Status ──────────────────────────────────────────────
app.get('/api/status', async (_req, res) => {
    try {
        const { stdout } = await execAsync(
            `docker inspect -f '{{.State.Running}}' ${CONTAINER_NAME} 2>/dev/null`
        );
        res.json({ running: stdout.trim() === 'true' });
    } catch {
        res.json({ running: false });
    }
});

// ── Start ───────────────────────────────────────────────
app.post('/api/start', async (_req, res) => {
    try {
        // If container already running, return early
        try {
            const { stdout } = await execAsync(
                `docker inspect -f '{{.State.Running}}' ${CONTAINER_NAME}`
            );
            if (stdout.trim() === 'true') {
                return res.json({ success: true, message: 'Already running' });
            }
            await execAsync(`docker rm -f ${CONTAINER_NAME}`).catch(() => { });
        } catch {
            // Container doesn't exist — that's fine
        }

        // Build image
        console.log('Building Docker image...');
        await execAsync(`docker build -t ${IMAGE_NAME} ${ENGINE_DIR}`);
        console.log('Image built.');

        // Run container
        const { stdout } = await execAsync(
            `docker run -d --name ${CONTAINER_NAME} -p 8080:8080 --shm-size=2g ${IMAGE_NAME}`
        );
        console.log('Container started:', stdout.trim());

        res.json({ success: true, containerId: stdout.trim() });
    } catch (err) {
        console.error('Start failed:', err.message);
        res.status(500).json({ success: false, error: err.stderr || err.message });
    }
});

// ── Stop ────────────────────────────────────────────────
app.post('/api/stop', async (_req, res) => {
    try {
        await execAsync(`docker stop ${CONTAINER_NAME}`).catch(() => { });
        await execAsync(`docker rm ${CONTAINER_NAME}`).catch(() => { });
        res.json({ success: true });
    } catch {
        res.json({ success: true, message: 'Was not running' });
    }
});

// ── SPA fallback ────────────────────────────────────────
app.get('{*path}', (_req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`\n🚀  Remote Browser UI → http://localhost:${PORT}\n`);
});
