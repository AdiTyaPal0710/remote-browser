# BLD Remote Browser

A remote browser control system — like a mini TeamViewer for browsers. Launch a headless Chromium inside Docker and interact with it in real-time from your browser.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Your Browser (localhost:3000)                          │
│  ┌───────────────────────────────────────────────────┐  │
│  │  Web UI — toolbar, URL bar, viewport canvas       │  │
│  │  ↕ WebSocket (ws://localhost:8080)                 │  │
│  └───────────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────┤
│  Host Machine                                           │
│  ┌─────────────┐     ┌──────────────────────────────┐  │
│  │  server.js   │────▶│  Docker Container             │  │
│  │  (Express)   │     │  ┌────────────────────────┐  │  │
│  │  Port 3000   │     │  │  engine.js (Puppeteer)  │  │  │
│  │              │     │  │  Port 8080 (WebSocket)  │  │  │
│  │  • Serves UI │     │  │  • CDP Screencast       │  │  │
│  │  • docker    │     │  │  • Input forwarding     │  │  │
│  │    run/stop  │     │  └────────────────────────┘  │  │
│  └─────────────┘     └──────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

## Features

- **One-click launch** — "Start Browser" spins up a Docker container with headless Chromium
- **Real-time streaming** — CDP screencast streams frames as JPEG over WebSocket
- **Full interaction** — click, double-click, right-click, scroll, type, hover
- **URL navigation** — built-in address bar to navigate anywhere
- **Coordinate scaling** — input events correctly mapped regardless of display size

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) installed and running
- [Node.js](https://nodejs.org/) v18+

## Quick Start

```bash
# 1. Install host dependencies
npm install

# 2. Start the host server
npm start

# 3. Open http://localhost:3000 in your browser

# 4. Click "Start Browser" — done!
```

## Tech Stack

- **Host server**: Node.js + Express
- **Browser engine**: Puppeteer + Chrome DevTools Protocol (CDP)
- **Containerization**: Docker (based on `ghcr.io/puppeteer/puppeteer`)
- **Communication**: WebSocket (`ws` library)
- **Frontend**: Vanilla HTML/CSS/JS