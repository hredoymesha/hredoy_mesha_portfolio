import fs from 'fs';
import http from 'http';
import path from 'path';
import dotenv from 'dotenv';
import { spawn, spawnSync, type ChildProcess } from 'child_process';
import { fileURLToPath } from 'url';
import { cleanMailEnv, createApp, createMailer, explainMailError } from './server/app';

dotenv.config({ quiet: true });
Object.assign(process.env, cleanMailEnv(process.env)); // tolerate quotes kept by Docker env files

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Production mode: NODE_ENV=production, or `npm start` (which passes --production so it also works on Windows shells).
const isProduction = process.env.NODE_ENV === 'production' || process.argv.includes('--production');
const PORT = Number(process.env.PORT) || 3000;
const CITECRAFT_PORT = Number(process.env.CITECRAFT_API_PORT) || 8765;
const citecraftEnabled = process.env.CITECRAFT_DISABLED !== 'true';
let citecraftProcess: ChildProcess | null = null;

const recipient = process.env.CONTACT_RECIPIENT_EMAIL || '';
const mailer = recipient ? createMailer(process.env) : null;
if (!recipient) console.warn('[contact] CONTACT_RECIPIENT_EMAIL is not set: contact messages are only saved to the log.');
if (mailer) {
  console.log(`[contact] E-mail delivery is ON (messages are sent to ${recipient}). Checking the mail login...`);
  mailer.verify?.().then(
    () => console.log('[contact] E-mail login check: OK. The contact form can e-mail you.'),
    (err) => console.error(`[contact] E-mail login check FAILED. ${explainMailError(err)}`)
  );
}
else if (recipient) console.warn('[contact] E-mail delivery is OFF: SMTP settings are incomplete. Messages are only saved to the log. Run "npm run doctor".');
else console.warn('[contact] E-mail delivery is OFF: no .env file or CONTACT_RECIPIENT_EMAIL is empty. Messages are only saved to the log. See README, "Contact form".');

const app = createApp({
  logsDir: path.resolve(process.env.LOGS_DIR || path.join(__dirname, 'logs')),
  recipient,
  mailer,
  from: process.env.SMTP_FROM,
  allowedOrigins: (process.env.ALLOWED_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean),
  // Number of reverse proxies in front of the server. On a laptop there is none (0); on a host there is usually one (1).
  trustProxyHops: Number(process.env.TRUST_PROXY_HOPS?.trim() || (isProduction ? 1 : 0)) || 0,
  rateLimit: Number(process.env.CONTACT_RATE_LIMIT) || 5,
  rateWindowMs: (Number(process.env.CONTACT_RATE_WINDOW_MINUTES) || 15) * 60_000,
  globalRateLimit: (Number(process.env.CONTACT_RATE_LIMIT) || 5) * 12,
  isProduction,
  distDir: isProduction ? path.resolve(__dirname, 'dist') : undefined,
  citecraftPort: citecraftEnabled ? CITECRAFT_PORT : null
});

/** Stops the CiteCraft helper. On Windows the venv python.exe is a launcher, so the whole process tree is stopped. */
function stopCiteCraftBackend() {
  const child = citecraftProcess;
  if (!child || child.killed || child.pid === undefined) return;
  if (process.platform === 'win32') spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { windowsHide: true });
  else child.kill();
}

function startCiteCraftBackend() {
  const virtualenvPython = path.resolve(
    __dirname,
    'citecraft',
    '.venv',
    process.platform === 'win32' ? 'Scripts' : 'bin',
    process.platform === 'win32' ? 'python.exe' : 'python3'
  );
  const executable =
    process.env.CITECRAFT_PYTHON ||
    (fs.existsSync(virtualenvPython)
      ? virtualenvPython
      : (process.platform === 'win32' ? 'py' : 'python3'));
  const versionArgs = process.platform === 'win32' && executable === 'py' ? ['-3'] : [];
  citecraftProcess = spawn(
    executable,
    [...versionArgs, '-m', 'uvicorn', 'citecraft.main:app', '--host', '127.0.0.1', '--port', String(CITECRAFT_PORT)],
    {
      cwd: __dirname,
      env: { ...process.env, PYTHONPATH: __dirname },
      stdio: 'inherit',
      windowsHide: true,
    }
  );
  citecraftProcess.on('error', (error) => {
    console.error(`Unable to start CiteCraft with "${executable}".`, error);
  });
  citecraftProcess.on('exit', (code, signal) => {
    if (code !== 0 && code !== null) {
      console.error(`CiteCraft backend exited with code ${code}.`);
    } else if (signal && signal !== 'SIGTERM') {
      console.error(`CiteCraft backend exited after signal ${signal}.`);
    }
  });
  process.on('exit', stopCiteCraftBackend);
}

// Start the Express server; in development the Vite dev server is mounted as middleware.
async function startServer() {
  const httpServer = http.createServer(app);
  if (isProduction && !fs.existsSync(path.resolve(__dirname, 'dist', 'index.html'))) {
    console.error('The site has not been built yet. Run "npm run build" first, then "npm start".');
    process.exit(1);
  }
  if (citecraftEnabled) startCiteCraftBackend();

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      // The live-reload socket shares the main port, so nothing else opens on the network
      server: { middlewareMode: true, hmr: { server: httpServer } },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  }

  // On a laptop only this computer can reach the server; hosts (production) listen on every interface.
  const host = process.env.HOST || (isProduction ? '0.0.0.0' : '127.0.0.1');
  httpServer.on('error', (error: NodeJS.ErrnoException) => {
    if (error.code === 'EADDRINUSE') {
      console.error(`Port ${PORT} is already in use. Close the other window that runs this site, or set PORT=3001 in .env and open http://localhost:3001.`);
      process.exit(1);
    }
    throw error;
  });
  httpServer.listen(PORT, host, () => {
    console.log(`Portfolio server running on http://${['127.0.0.1', '0.0.0.0', '::'].includes(host) ? 'localhost' : host}:${PORT}`);
  });
  const server = httpServer;

  // Stop cleanly when the host or Ctrl+C asks (the CiteCraft helper is stopped too).
  const shutdown = () => {
    stopCiteCraftBackend();
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 8000).unref();
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

startServer();
