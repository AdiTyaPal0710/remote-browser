# Puppeteer base image (includes Chromium)
FROM ghcr.io/puppeteer/puppeteer:latest

WORKDIR /usr/src/app

# Install deps as root, then drop privileges
USER root
COPY package*.json ./
RUN npm install --omit=dev
COPY engine.js ./

USER pptruser

EXPOSE 8080

CMD ["node", "engine.js"]
