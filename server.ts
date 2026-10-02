import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const USER_AGENT = 'MikmaMangaReader/1.0 (Archival Web Client)';
const MANGADEX_API_BASE = 'https://api.mangadex.org';
const MANGADEX_UPLOADS_BASE = 'https://uploads.mangadex.org';

interface CacheEntry {
  status: number;
  data: unknown;
  expiresAt: number;
}

const apiCache = new Map<string, CacheEntry>();

function getCached(key: string): CacheEntry | null {
  const entry = apiCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    apiCache.delete(key);
    return null;
  }
  return entry;
}

function setCached(key: string, status: number, data: unknown, ttlMs: number) {
  if (apiCache.size > 500) {
    const oldestKey = apiCache.keys().next().value;
    if (oldestKey) apiCache.delete(oldestKey);
  }
  apiCache.set(key, {
    status,
    data,
    expiresAt: Date.now() + ttlMs,
  });
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // 1. Proxy MangaDex JSON API requests
  app.get('/api/mangadex/*', async (req, res) => {
    try {
      const subPath = req.originalUrl.replace(/^\/api\/mangadex/, '');
      const targetUrl = `${MANGADEX_API_BASE}${subPath}`;

      const cached = getCached(targetUrl);
      if (cached) {
        res.status(cached.status).json(cached.data);
        return;
      }

      const response = await fetch(targetUrl, {
        headers: {
          'User-Agent': USER_AGENT,
          Accept: 'application/json',
        },
      });

      const data = await response.json();

      if (response.ok) {
        const isAtHome = subPath.startsWith('/at-home/server');
        const ttl = isAtHome ? 45_000 : 180_000;
        setCached(targetUrl, response.status, data, ttl);
      }

      res.status(response.status).json(data);
    } catch (error) {
      console.error('MangaDex API proxy error:', error);
      res.status(502).json({
        result: 'error',
        message: 'Gagal menghubungi server MangaDex API.',
      });
    }
  });

  // 2. Proxy MangaDex Cover Images
  app.get('/api/cover/:mangaId/:fileName', async (req, res) => {
    try {
      const { mangaId, fileName } = req.params;
      const targetUrl = `${MANGADEX_UPLOADS_BASE}/covers/${encodeURIComponent(mangaId)}/${encodeURIComponent(fileName)}`;

      const response = await fetch(targetUrl, {
        headers: {
          'User-Agent': USER_AGENT,
          Accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
        },
      });

      if (!response.ok) {
        res.status(response.status).end();
        return;
      }

      const contentType = response.headers.get('content-type') || 'image/jpeg';
      const arrayBuffer = await response.arrayBuffer();

      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'public, max-age=86400');
      res.send(Buffer.from(arrayBuffer));
    } catch (error) {
      console.error('Cover proxy error:', error);
      res.status(502).end();
    }
  });

  // 3. Proxy Chapter Page Images from MangaDex@Home nodes
  app.get('/api/page', async (req, res) => {
    try {
      const rawUrl = req.query.url;
      if (typeof rawUrl !== 'string' || !rawUrl.startsWith('https://')) {
        res.status(400).send('Invalid image URL');
        return;
      }

      const response = await fetch(rawUrl, {
        headers: {
          'User-Agent': USER_AGENT,
          Accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
        },
      });

      if (!response.ok) {
        res.status(response.status).end();
        return;
      }

      const contentType = response.headers.get('content-type') || 'image/jpeg';
      const arrayBuffer = await response.arrayBuffer();

      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'public, max-age=3600');
      res.send(Buffer.from(arrayBuffer));
    } catch (error) {
      console.error('Page image proxy error:', error);
      res.status(502).end();
    }
  });

  // 4. Vite middleware for development / static assets for production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Mikma server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
