// Long-running server for local dev and non-serverless hosting.
// (On Vercel, api/index.js serves the same app and Vercel Cron runs reminders.)
import express from 'express';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { app, runAutoReminders } from './app.js';

const PORT = process.env.API_PORT || process.env.PORT || 3001;

const dist = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist');
if (process.env.NODE_ENV === 'production' && existsSync(dist)) {
  app.use(express.static(dist));
  app.get('/{*splat}', (req, res) => res.sendFile(join(dist, 'index.html')));
}

setTimeout(() => runAutoReminders().catch(console.error), 5_000);
setInterval(() => runAutoReminders().catch(console.error), 60 * 60 * 1000).unref();

app.listen(PORT, () => console.log(`API listening on http://localhost:${PORT}`));
