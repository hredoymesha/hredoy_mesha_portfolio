import express, { type NextFunction, type Request, type Response } from 'express';
import fs from 'fs';
import path from 'path';
import nodemailer from 'nodemailer';

/** Anything with a sendMail method (nodemailer transporter or a test double). */
export interface Mailer {
  sendMail(message: Record<string, unknown>): Promise<unknown>;
  /** Optional: checks the connection and login without sending anything. */
  verify?(): Promise<unknown>;
}

/** Turns a mail-server error into a plain sentence that says what to fix. */
export function explainMailError(err: unknown): string {
  const e = err as { code?: string; responseCode?: number; message?: string };
  const code = e?.code ?? '';
  const text = String(e?.message ?? err);
  if (code === 'EAUTH' || e?.responseCode === 535 || /invalid login|username and password not accepted|authentication/i.test(text)) {
    return 'The mail server refused the login. Check SMTP_USER and SMTP_PASS in .env. For Gmail, SMTP_PASS must be an App Password (16 letters, no spaces) and SMTP_USER must be the exact Google account that created it. 2-Step Verification must be on for that account.';
  }
  if (code === 'ENOTFOUND' || /getaddrinfo/i.test(text)) return 'The mail server name was not found. Check SMTP_HOST (Gmail: smtp.gmail.com) and your internet connection.';
  if (['ECONNECTION', 'ETIMEDOUT', 'ESOCKET', 'ECONNREFUSED', 'ECONNRESET'].includes(code)) return 'Could not connect to the mail server. Check SMTP_HOST and SMTP_PORT (Gmail: 587), and that a firewall or antivirus is not blocking the connection.';
  if (/self.signed|certificate/i.test(text)) return 'The connection was refused because of a security certificate problem (an antivirus or company network may be intercepting the connection).';
  if (/sender|from address|not allowed|550|553/i.test(text)) return 'The mail server rejected the sender or recipient address. Check SMTP_FROM and CONTACT_RECIPIENT_EMAIL.';
  return `The mail server reported: ${text}`;
}

export interface AppOptions {
  /** Folder for the contact-form message log (one JSON object per line). */
  logsDir: string;
  /** Address that receives contact messages. */
  recipient: string;
  /** null = e-mail delivery is not configured (messages are only saved to the log). */
  mailer: Mailer | null;
  /** Value for the From header. */
  from?: string;
  /** Origins (e.g. https://example.org) allowed to post to the API. The site's own origin is always allowed. */
  allowedOrigins: string[];
  /** Hops of reverse proxy in front of the server; used to read the visitor IP safely. */
  trustProxyHops: number;
  /** Max contact submissions per visitor IP within the window. */
  rateLimit: number;
  rateWindowMs: number;
  /** Max contact submissions from everyone within the window (protects the mailbox). */
  globalRateLimit: number;
  /** Production adds the security headers / Content-Security-Policy. */
  isProduction: boolean;
  /** Built front-end folder; when set, it is served with a single-page-app fallback. */
  distDir?: string;
  /** Loopback port of the CiteCraft API, or null when it is disabled. */
  citecraftPort: number | null;
  /** Clock, replaceable in tests. */
  now?: () => number;
}

export const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "manifest-src 'self'"
].join('; ');

const MAX = { name: 120, email: 254, subject: 200, message: 5000, userAgent: 300 };
const EMAIL_RE = /^[^\s@<>"',;:]+@[^\s@<>"',;:]+\.[^\s@<>"',;:]{2,}$/;

/** Escapes text before it is placed in the HTML part of an e-mail. */
export function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Single-line text: control characters (including line breaks) become spaces, so they cannot inject mail headers. */
export function singleLine(value: unknown, max: number): string {
  return cutText(
    String(value ?? '')
      .replace(/[\u0000-\u001f\u007f\u2028\u2029]+/g, ' ')
      .trim(),
    max
  );
}

/** Cuts text to at most `max` UTF-16 units without splitting a character in half. */
function cutText(text: string, max: number): string {
  if (text.length <= max) return text;
  let end = max;
  const last = text.charCodeAt(end - 1);
  if (last >= 0xd800 && last <= 0xdbff) end -= 1; // the first half of a pair would be left alone
  return text.slice(0, end);
}

/** Multi-line text: keeps line breaks, removes other control characters. */
export function multiLine(value: unknown, max: number): string {
  const cleaned = String(value ?? '')
    .replace(/\r\n?/g, '\n')
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '')
    .trim();
  return cutText(cleaned, max);
}

/** Sliding-window limiter kept in memory (enough for one small server; it resets on restart). */
export class SlidingWindowLimiter {
  private hits = new Map<string, number[]>();
  constructor(private limit: number, private windowMs: number) {}

  /** Returns 0 when allowed, otherwise the number of seconds to wait. */
  check(key: string, now: number): number {
    const recent = (this.hits.get(key) ?? []).filter((t) => now - t < this.windowMs);
    if (recent.length >= this.limit) {
      this.hits.set(key, recent);
      return Math.max(1, Math.ceil((this.windowMs - (now - recent[0])) / 1000));
    }
    recent.push(now);
    this.hits.set(key, recent);
    if (this.hits.size > 5000) {
      for (const [k, v] of this.hits) if (v.every((t) => now - t >= this.windowMs)) this.hits.delete(k);
    }
    return 0;
  }
}

/** Removes one pair of surrounding quotes and spaces. `docker run --env-file` and some host pages keep the quotes that a .env file uses. */
export function stripEnvQuotes(value: string | undefined): string {
  const v = (value ?? '').trim();
  return /^(["']).*\1$/.test(v) && v.length >= 2 ? v.slice(1, -1).trim() : v;
}

const MAIL_KEYS = ['CONTACT_RECIPIENT_EMAIL', 'SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'SMTP_FROM', 'ALLOWED_ORIGINS'];

/** Returns a copy of the environment with the mail and origin settings cleaned of stray quotes. */
export function cleanMailEnv(env: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
  const out = { ...env };
  for (const key of MAIL_KEYS) if (out[key] !== undefined) out[key] = stripEnvQuotes(out[key]);
  return out;
}

export function createMailer(env: NodeJS.ProcessEnv): Mailer | null {
  const { SMTP_HOST, SMTP_USER, SMTP_PASS } = env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) return null;
  const port = Number(env.SMTP_PORT) || 587;
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port,
    secure: port === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 15_000
  });
}

function originOf(req: Request): string | null {
  const origin = req.headers.origin;
  if (typeof origin === 'string' && origin) return origin;
  const referer = req.headers.referer;
  if (typeof referer === 'string' && referer) {
    try {
      return new URL(referer).origin;
    } catch {
      return null;
    }
  }
  return null;
}

export function createApp(opts: AppOptions) {
  const now = opts.now ?? (() => Date.now());
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', opts.trustProxyHops);

  fs.mkdirSync(opts.logsDir, { recursive: true });
  const auditLogFile = path.resolve(opts.logsDir, 'contact_submissions.jsonl');
  const perIp = new SlidingWindowLimiter(opts.rateLimit, opts.rateWindowMs);
  const everyone = new SlidingWindowLimiter(opts.globalRateLimit, opts.rateWindowMs);
  const citecraftLimiter = new SlidingWindowLimiter(120, 60_000);

  // ---- security headers ----
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    if (opts.isProduction) {
      res.setHeader('Content-Security-Policy', CONTENT_SECURITY_POLICY);
      res.setHeader('X-Frame-Options', 'DENY');
      if (req.secure) res.setHeader('Strict-Transport-Security', 'max-age=15552000; includeSubDomains');
    }
    next();
  });

  // The contact form needs a small limit; CiteCraft imports and renders can be larger (CiteCraft itself refuses over 2 MB).
  app.use('/api/contact', express.json({ limit: '32kb' }));

  const sameOriginAllowed = (req: Request) => {
    const origin = originOf(req);
    if (!origin) return false;
    // Behind a reverse proxy the public host name arrives in X-Forwarded-Host (only trusted when a proxy is configured).
    const forwardedHost = opts.trustProxyHops > 0 ? req.get('x-forwarded-host')?.split(',')[0]?.trim() : undefined;
    const own = `${req.protocol}://${forwardedHost || req.get('host')}`;
    return origin === own || opts.allowedOrigins.includes(origin);
  };


  // CiteCraft requests are checked (method, origin, rate limit) BEFORE any body is read, so a flood of large bodies is refused cheaply.
  const citecraftGuard = (req: Request, res: Response, next: NextFunction) => {
    if (!opts.citecraftPort) return res.status(503).json({ detail: 'CiteCraft is not enabled on this server.' });
    if (!['GET', 'HEAD', 'POST'].includes(req.method)) return res.status(405).json({ detail: 'Method not allowed.' });
    if (req.method === 'POST' && !sameOriginAllowed(req)) return res.status(403).json({ detail: 'This request was not accepted.' });
    const wait = citecraftLimiter.check(req.ip || 'unknown', now());
    if (wait) {
      res.setHeader('Retry-After', String(wait));
      return res.status(429).json({ detail: 'Too many requests. Please slow down.' });
    }
    next();
  };
  // Only imports, renders and exports may be large (CiteCraft itself refuses over 2 MB); everything else is small.
  const bigCiteCraftBody = express.json({ limit: '2mb' });
  const smallCiteCraftBody = express.json({ limit: '64kb' });
  app.use('/api/citecraft', citecraftGuard, (req: Request, res: Response, next: NextFunction) =>
    (['/import', '/render', '/export', '/duplicates'].includes(req.path) ? bigCiteCraftBody : smallCiteCraftBody)(req, res, next)
  );

  app.get('/healthz', (_req, res) => {
    res.json({ ok: true, mail: opts.mailer ? 'configured' : 'not-configured', citecraft: opts.citecraftPort ? 'enabled' : 'disabled' });
  });

  // ---- contact form ----
  app.post('/api/contact', async (req: Request, res: Response) => {
    try {
      if (!sameOriginAllowed(req)) {
        return res.status(403).json({ success: false, error: 'This request was not accepted.' });
      }
      const body = (req.body && typeof req.body === 'object' ? req.body : {}) as Record<string, unknown>;

      // Honeypot: real visitors never see or fill this field. A filled field is kept in the log (marked) but not e-mailed,
      // and the answer is the same "saved, not e-mailed" as any other held message, so a person whose browser
      // auto-filled the field is never told a message was delivered when it was not.
      const honeypotFilled = ['hp', 'website'].some((k) => typeof body[k] === 'string' && (body[k] as string).trim() !== '');

      const ip = req.ip || req.socket.remoteAddress || 'unknown';
      const t = now();
      const waitIp = perIp.check(ip, t);
      const waitAll = waitIp === 0 ? everyone.check('*', t) : 0;
      const wait = waitIp || waitAll;
      if (wait) {
        res.setHeader('Retry-After', String(wait));
        return res.status(429).json({ success: false, error: 'Too many messages in a short time. Please try again later.', retryAfterSeconds: wait });
      }

      const isAnonymous = body.isAnonymous === true;
      const message = multiLine(body.message, MAX.message);
      if (!message) return res.status(400).json({ success: false, error: 'Message content is required.' });
      const senderEmail = singleLine(body.senderEmail, MAX.email);
      if (!isAnonymous && !EMAIL_RE.test(senderEmail)) {
        return res.status(400).json({ success: false, error: 'A valid email address is required for direct inquiries.' });
      }
      const submittedAt = typeof body.submittedAt === 'string' && !Number.isNaN(Date.parse(body.submittedAt)) ? new Date(body.submittedAt).toISOString() : null;

      const record = {
        id: `msg_${t}_${Math.random().toString(36).substring(2, 9)}`,
        type: isAnonymous ? 'anonymous' : 'direct',
        name: isAnonymous ? 'Anonymous Visitor' : singleLine(body.name, MAX.name) || 'Not specified',
        email: isAnonymous ? 'anonymous@submission.local' : senderEmail,
        subject: singleLine(body.subject, MAX.subject) || (isAnonymous ? 'Anonymous Inquiry' : 'Portfolio Inquiry'),
        message,
        clientIp: ip,
        timestamp: new Date(t).toISOString(),
        clientTimestamp: submittedAt,
        recipient: opts.recipient,
        flagged: honeypotFilled ? 'honeypot' : undefined,
        userAgent: singleLine(req.headers['user-agent'] ?? 'unknown', MAX.userAgent)
      };

      // 1. Always keep a copy first, so a message is never lost if e-mail fails.
      let saved = true;
      try {
        await fs.promises.appendFile(auditLogFile, JSON.stringify(record) + '\n', 'utf8');
      } catch (err) {
        saved = false;
        console.error('Could not write the contact log:', err);
      }

      // 2. E-mail it (every visitor-supplied value is escaped before it goes into the HTML part).
      let delivered = false;
      let reason: 'sent' | 'email-not-configured' | 'email-failed' | 'held' = 'email-not-configured';
      let debug = '';
      if (honeypotFilled) {
        reason = 'held';
        debug = 'The hidden spam-trap field was filled in (a browser may have auto-filled it), so the message was saved but not e-mailed.';
      } else if (opts.mailer) {
        const kind = isAnonymous ? 'Anonymous Inquiry' : 'Direct Message';
        const text = [
          `Visitor IP address: ${record.clientIp}`,
          '',
          `Type: ${kind}`,
          `Received (UTC): ${record.timestamp}`,
          `Sender Name: ${record.name}`,
          `Sender Email: ${record.email}`,
          `User Agent: ${record.userAgent}`,
          '----------------------------------------',
          `Subject: ${record.subject}`,
          '----------------------------------------',
          'Message:',
          record.message,
          '========================================'
        ].join('\n');
        const html = `
          <div style="font-family: Arial, Helvetica, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; color: #1a202c;">
            <p style="margin: 0 0 6px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #475569;">${escapeHtml(kind)} &middot; IP <span style="font-family: monospace;">${escapeHtml(record.clientIp)}</span></p>
            <h2 style="margin: 0 0 16px; font-size: 20px;">${escapeHtml(record.subject)}</h2>
            <table style="width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 16px;">
              <tr><td style="padding: 4px 0; color: #475569; width: 140px;">Sender</td><td>${escapeHtml(record.name)}</td></tr>
              <tr><td style="padding: 4px 0; color: #475569;">Email</td><td>${escapeHtml(record.email)}</td></tr>
              <tr><td style="padding: 4px 0; color: #475569;">Client IP</td><td style="font-family: monospace;">${escapeHtml(record.clientIp)}</td></tr>
              <tr><td style="padding: 4px 0; color: #475569;">Received (UTC)</td><td style="font-family: monospace;">${escapeHtml(record.timestamp)}</td></tr>
            </table>
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; white-space: pre-wrap; font-size: 14px; line-height: 1.6;">${escapeHtml(record.message)}</div>
          </div>`;
        try {
          const info = (await opts.mailer.sendMail({
            from: opts.from || `"Portfolio Contact" <${opts.recipient}>`,
            to: opts.recipient,
            replyTo: isAnonymous ? undefined : record.email,
            subject: `[Portfolio ${kind}] ${record.subject} (IP ${record.clientIp})`,
            text,
            html
          })) as { accepted?: unknown[]; rejected?: unknown[]; response?: string } | undefined;
          if (Array.isArray(info?.accepted) && info.accepted.length === 0) throw new Error(`The mail server accepted no recipient (rejected: ${(info?.rejected ?? []).join(', ') || 'unknown'}).`);
          delivered = true;
          reason = 'sent';
          debug = `Accepted by the mail server for ${Array.isArray(info?.accepted) ? info.accepted.join(', ') : opts.recipient}${info?.response ? ` (${String(info.response).slice(0, 80)})` : ''}. If it is not in the inbox, look in Spam and All Mail.`;
          console.log(`[contact] E-mail accepted by the mail server for ${opts.recipient}.`);
        } catch (err) {
          reason = 'email-failed';
          debug = explainMailError(err);
          console.error(`[contact] E-mail was NOT sent. ${explainMailError(err)}`);
          console.error('[contact] Technical detail:', err);
        }
      } else {
        console.warn(`[contact] E-mail is not configured; message ${record.id} was only saved to the log.`);
      }

      if (!saved && !delivered) {
        return res.status(500).json({ success: false, error: 'Your message could not be processed. Please write directly by e-mail.' });
      }
      // The reason is shown to the visitor only when the site runs on the owner's own computer (not in production).
      const extra = opts.isProduction ? {} : { debug };
      if (delivered) {
        return res.status(200).json({ success: true, delivered: true, saved, reason, ...extra, message: 'Your message has been delivered.' });
      }
      return res.status(202).json({
        success: true,
        delivered: false,
        saved,
        reason,
        ...extra,
        message: 'Your message was saved, but it could not be sent by e-mail right now. Please also write directly by e-mail.'
      });
    } catch (err) {
      console.error('Contact API error:', err);
      return res.status(500).json({ success: false, error: 'An internal error occurred while processing your message. Please try again or write directly.' });
    }
  });

  // ---- CiteCraft: proxy to the loopback-only Python API ----
  app.use('/api/citecraft', async (req: Request, res: Response) => {
    try {
      const backendPath = req.originalUrl.replace(/^\/api\/citecraft/, '') || '/';
      const hasBody = req.method === 'POST';
      const response = await fetch(`http://127.0.0.1:${opts.citecraftPort}${backendPath}`, {
        method: req.method,
        headers: hasBody ? { 'content-type': 'application/json' } : undefined,
        body: hasBody ? JSON.stringify(req.body) : undefined,
        signal: AbortSignal.timeout(20_000)
      });
      const contentType = response.headers.get('content-type');
      if (contentType) res.setHeader('content-type', contentType);
      res.status(response.status).send(await response.text());
    } catch (error) {
      console.error('CiteCraft local API is unavailable:', (error as { cause?: { code?: string } }).cause?.code ?? String(error));
      res.status(503).json({ detail: 'CiteCraft backend is unavailable right now. Please try again later.' });
    }
  });

  app.use('/api', (_req, res) => res.status(404).json({ error: 'Not found' }));

  // ---- built front-end ----
  if (opts.distDir) {
    const dist = opts.distDir;
    app.use(
      express.static(dist, {
        index: false,
        setHeaders: (res, file) => {
          res.setHeader('Cache-Control', file.includes(`${path.sep}assets${path.sep}`) && /-[A-Za-z0-9_-]{8}\.(js|css|woff2)$/.test(path.basename(file)) ? 'public, max-age=31536000, immutable' : 'public, max-age=3600');
        }
      })
    );
    app.get('*', (req, res) => {
      if (path.extname(req.path)) return res.status(404).type('text/plain').send('Not found');
      res.setHeader('Cache-Control', 'no-cache');
      res.sendFile(path.resolve(dist, 'index.html'));
    });
  }

  // ---- errors (bad JSON, oversized bodies) are answered as JSON, never as stack traces ----
  app.use((err: Error & { status?: number; type?: string }, _req: Request, res: Response, next: NextFunction) => {
    if (res.headersSent) return next(err);
    const status = err.status && err.status >= 400 && err.status < 500 ? err.status : 500;
    res.status(status).json({ success: false, error: status === 413 ? 'Request is too large.' : status === 400 ? 'Malformed request.' : 'Internal error.' });
  });

  return app;
}
