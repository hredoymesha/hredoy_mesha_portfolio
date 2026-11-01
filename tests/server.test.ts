// Contact API, spam protection, security headers and static serving. Run: npm run test:server
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { AddressInfo } from 'node:net';
import { after, before, describe, it } from 'node:test';
import { createApp, explainMailError, stripEnvQuotes, escapeHtml, singleLine, SlidingWindowLimiter, CONTENT_SECURITY_POLICY, type AppOptions, type Mailer } from '../server/app';

type Sent = Record<string, unknown>;

async function start(overrides: Partial<AppOptions> = {}) {
  const logsDir = fs.mkdtempSync(path.join(os.tmpdir(), 'contact-logs-'));
  const sent: Sent[] = [];
  const mailer: Mailer = { sendMail: async (m) => void sent.push(m) };
  const app = createApp({
    logsDir,
    recipient: 'owner@example.test',
    mailer,
    allowedOrigins: [],
    trustProxyHops: 1,
    rateLimit: 5,
    rateWindowMs: 60_000,
    globalRateLimit: 100,
    isProduction: true,
    citecraftPort: null,
    ...overrides
  });
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>((r) => server.once('listening', () => r()));
  const port = (server.address() as AddressInfo).port;
  const base = `http://127.0.0.1:${port}`;
  const post = (body: unknown, headers: Record<string, string> = {}, url = '/api/contact') =>
    fetch(base + url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin: base, ...headers },
      body: typeof body === 'string' ? body : JSON.stringify(body)
    });
  const logLines = () => {
    const f = path.join(logsDir, 'contact_submissions.jsonl');
    return fs.existsSync(f) ? fs.readFileSync(f, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l)) : [];
  };
  return { server, base, post, sent, logLines, logsDir, close: () => new Promise<void>((r) => { server.close(() => r()); server.closeAllConnections(); }) };
}

const valid = { isAnonymous: false, name: 'Alex', senderEmail: 'alex@example.org', subject: 'Hello', message: 'A real message.' };

describe('contact form: accurate delivery status', () => {
  let ctx: Awaited<ReturnType<typeof start>>;
  before(async () => {
    ctx = await start();
  });
  after(() => ctx.close());

  it('reports delivered:true only after the e-mail was handed to the mail server', async () => {
    const res = await ctx.post(valid);
    const body = await res.json();
    assert.equal(res.status, 200);
    assert.deepEqual([body.success, body.delivered, body.reason], [true, true, 'sent']);
    assert.equal(ctx.sent.length, 1);
    assert.equal(ctx.sent[0].to, 'owner@example.test');
    assert.equal(ctx.sent[0].replyTo, 'alex@example.org');
  });

  it('keeps the visitor IP and the message in the log (as required by the owner)', async () => {
    const res = await ctx.post({ ...valid, message: 'Keep me in the log' }, { 'x-forwarded-for': '203.0.113.7' });
    assert.equal(res.status, 200);
    const last = ctx.logLines().at(-1);
    assert.equal(last.clientIp, '203.0.113.7');
    assert.equal(last.message, 'Keep me in the log');
    assert.equal(last.email, 'alex@example.org');
  });

  it('does not echo the visitor IP back in the response', async () => {
    const res = await ctx.post(valid, { 'x-forwarded-for': '203.0.113.9' });
    const text = await res.text();
    assert.ok(!text.includes('203.0.113.9'));
  });
});

describe('contact form: e-mail not configured or failing', () => {
  it('does not claim delivery when no mail server is configured', async () => {
    const ctx = await start({ mailer: null });
    try {
      const res = await ctx.post(valid);
      const body = await res.json();
      assert.equal(res.status, 202);
      assert.deepEqual([body.success, body.delivered, body.saved, body.reason], [true, false, true, 'email-not-configured']);
      assert.ok(!/has been delivered/i.test(body.message));
      assert.equal(ctx.logLines().length, 1);
    } finally {
      await ctx.close();
    }
  });

  it('does not claim delivery when the mail server rejects the message', async () => {
    const ctx = await start({ mailer: { sendMail: async () => { throw new Error('smtp down'); } } });
    try {
      const res = await ctx.post(valid);
      const body = await res.json();
      assert.equal(res.status, 202);
      assert.deepEqual([body.delivered, body.saved, body.reason], [false, true, 'email-failed']);
    } finally {
      await ctx.close();
    }
  });
});

describe('contact form: spam protection', () => {
  it('refuses requests from other origins and requests without any origin', async () => {
    const ctx = await start();
    try {
      assert.equal((await ctx.post(valid, { origin: 'https://evil.example' })).status, 403);
      const noOrigin = await fetch(ctx.base + '/api/contact', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(valid) });
      assert.equal(noOrigin.status, 403);
      assert.equal(ctx.sent.length, 0);
      assert.equal(ctx.logLines().length, 0);
    } finally {
      await ctx.close();
    }
  });

  it('accepts an origin listed in ALLOWED_ORIGINS', async () => {
    const ctx = await start({ allowedOrigins: ['https://portfolio.example'] });
    try {
      assert.equal((await ctx.post(valid, { origin: 'https://portfolio.example' })).status, 200);
    } finally {
      await ctx.close();
    }
  });

  it('keeps (marked) but does not e-mail a submission that fills the hidden spam-trap field, and says so', async () => {
    const ctx = await start();
    try {
      for (const field of ['hp', 'website']) {
        const res = await ctx.post({ ...valid, [field]: 'http://spam.example' });
        const body = await res.json();
        assert.equal(res.status, 202);
        assert.equal(body.delivered, false, 'a person whose browser filled the field must not be told it was delivered');
        assert.equal(body.saved, true);
      }
      assert.equal(ctx.sent.length, 0);
      const lines = ctx.logLines();
      assert.equal(lines.length, 2);
      assert.ok(lines.every((l) => l.flagged === 'honeypot'));
    } finally {
      await ctx.close();
    }
  });

  it('shows the reason only on the owner\'s own computer (not in production)', async () => {
    const dev = await start({ isProduction: false, mailer: { sendMail: async () => { throw Object.assign(new Error('Invalid login'), { code: 'EAUTH', responseCode: 535 }); } } });
    const prod = await start({ isProduction: true, mailer: { sendMail: async () => { throw Object.assign(new Error('Invalid login'), { code: 'EAUTH', responseCode: 535 }); } } });
    try {
      const d = await (await dev.post(valid)).json();
      assert.match(String(d.debug), /App Password/);
      const p = await (await prod.post(valid)).json();
      assert.equal(p.debug, undefined);
    } finally {
      await dev.close();
      await prod.close();
    }
  });

  it('does not call a message delivered when the mail server accepted no recipient', async () => {
    const ctx = await start({ mailer: { sendMail: async () => ({ accepted: [], rejected: ['owner@example.test'] }) } });
    try {
      const body = await (await ctx.post(valid)).json();
      assert.equal(body.delivered, false);
      assert.equal(body.reason, 'email-failed');
    } finally {
      await ctx.close();
    }
  });

  it('rate-limits each IP separately and answers 429 with Retry-After', async () => {
    const ctx = await start({ rateLimit: 3 });
    try {
      for (let i = 0; i < 3; i++) assert.equal((await ctx.post(valid, { 'x-forwarded-for': '198.51.100.1' })).status, 200);
      const blocked = await ctx.post(valid, { 'x-forwarded-for': '198.51.100.1' });
      assert.equal(blocked.status, 429);
      assert.ok(Number(blocked.headers.get('retry-after')) >= 1);
      assert.equal((await ctx.post(valid, { 'x-forwarded-for': '198.51.100.2' })).status, 200);
    } finally {
      await ctx.close();
    }
  });

  it('applies a global cap across all visitors', async () => {
    const ctx = await start({ rateLimit: 100, globalRateLimit: 2 });
    try {
      assert.equal((await ctx.post(valid, { 'x-forwarded-for': '192.0.2.1' })).status, 200);
      assert.equal((await ctx.post(valid, { 'x-forwarded-for': '192.0.2.2' })).status, 200);
      assert.equal((await ctx.post(valid, { 'x-forwarded-for': '192.0.2.3' })).status, 429);
    } finally {
      await ctx.close();
    }
  });
});

describe('contact form: input handling', () => {
  it('escapes visitor text in the HTML part of the e-mail', async () => {
    const ctx = await start();
    try {
      const evil = '<img src=x onerror=alert(1)><a href="https://phish.example">click</a>';
      await ctx.post({ ...valid, name: evil, subject: evil, message: evil });
      const html = String(ctx.sent[0].html);
      assert.ok(!html.includes('<img'));
      assert.ok(!html.includes('<a href'));
      assert.ok(html.includes('&lt;img src=x onerror=alert(1)&gt;'));
    } finally {
      await ctx.close();
    }
  });

  it('cannot inject mail headers through the subject or name', async () => {
    const ctx = await start();
    try {
      await ctx.post({ ...valid, subject: 'Hi\r\nBcc: attacker@example.org', name: 'A\nB' });
      const subject = String(ctx.sent[0].subject);
      assert.ok(!/[\r\n]/.test(subject));
      assert.equal(ctx.sent[0].bcc, undefined);
    } finally {
      await ctx.close();
    }
  });

  it('validates the message and the e-mail address', async () => {
    const ctx = await start();
    try {
      assert.equal((await ctx.post({ ...valid, message: '   ' })).status, 400);
      assert.equal((await ctx.post({ ...valid, senderEmail: 'not-an-email' })).status, 400);
      assert.equal((await ctx.post({ ...valid, senderEmail: 'a@b@c.org' })).status, 400);
      assert.equal((await ctx.post({ isAnonymous: true, message: 'anonymous is fine' })).status, 200);
    } finally {
      await ctx.close();
    }
  });

  it('limits message length and answers malformed or oversized JSON with JSON errors', async () => {
    const ctx = await start();
    try {
      await ctx.post({ ...valid, message: 'x'.repeat(9000) });
      assert.equal(ctx.logLines()[0].message.length, 5000);
      const bad = await ctx.post('{not json');
      assert.equal(bad.status, 400);
      assert.ok(String(bad.headers.get('content-type')).includes('application/json'));
      const huge = await ctx.post({ ...valid, message: 'y'.repeat(60_000) });
      assert.equal(huge.status, 413);
    } finally {
      await ctx.close();
    }
  });
});

describe('security headers and routing', () => {
  it('sends the Content-Security-Policy and other headers in production, and none of the CSP in development', async () => {
    const prod = await start({ isProduction: true });
    const dev = await start({ isProduction: false });
    try {
      const a = await fetch(prod.base + '/healthz');
      assert.equal(a.headers.get('content-security-policy'), CONTENT_SECURITY_POLICY);
      assert.equal(a.headers.get('x-content-type-options'), 'nosniff');
      assert.equal(a.headers.get('x-frame-options'), 'DENY');
      assert.equal(a.headers.get('x-powered-by'), null);
      assert.equal((await fetch(dev.base + '/healthz')).headers.get('content-security-policy'), null);
    } finally {
      await prod.close();
      await dev.close();
    }
  });

  it('the policy allows only this site: no inline code, no third-party hosts', () => {
    assert.ok(!/unsafe-inline|unsafe-eval/.test(CONTENT_SECURITY_POLICY));
    assert.ok(!/https?:/.test(CONTENT_SECURITY_POLICY));
    for (const d of ["default-src 'self'", "script-src 'self'", "style-src 'self'", "frame-ancestors 'none'", "object-src 'none'"]) assert.ok(CONTENT_SECURITY_POLICY.includes(d), d);
  });

  it('unknown API routes answer 404 JSON; CiteCraft answers 503 when disabled', async () => {
    const ctx = await start();
    try {
      assert.equal((await fetch(ctx.base + '/api/nope')).status, 404);
      assert.equal((await fetch(ctx.base + '/api/citecraft/health')).status, 503);
    } finally {
      await ctx.close();
    }
  });

  it('serves the built site with a single-page-app fallback and 404 for missing files', async () => {
    const dist = fs.mkdtempSync(path.join(os.tmpdir(), 'dist-'));
    fs.writeFileSync(path.join(dist, 'index.html'), '<!doctype html><title>ok</title>');
    const ctx = await start({ distDir: dist });
    try {
      assert.ok((await (await fetch(ctx.base + '/some/route')).text()).includes('<title>ok</title>'));
      assert.equal((await fetch(ctx.base + '/missing.js')).status, 404);
      fs.mkdirSync(path.join(dist, 'logs'), { recursive: true });
      assert.equal((await fetch(ctx.base + '/logs/contact_submissions.jsonl')).status, 404, 'the message log is never served');
      assert.ok(!(await (await fetch(ctx.base + '/logs/')).text()).includes('clientIp'));
    } finally {
      await ctx.close();
    }
  });
});

describe('helpers', () => {
  it('escapeHtml escapes the five special characters', () => {
    assert.equal(escapeHtml(`<a href="x" onclick='y'>&</a>`), '&lt;a href=&quot;x&quot; onclick=&#39;y&#39;&gt;&amp;&lt;/a&gt;');
  });
  it('singleLine removes line breaks and control characters', () => {
    assert.equal(singleLine('a\r\nb\u0000c', 50), 'a b c');
  });
  it('SlidingWindowLimiter lets requests through again after the window', () => {
    const l = new SlidingWindowLimiter(2, 1000);
    assert.equal(l.check('k', 0), 0);
    assert.equal(l.check('k', 10), 0);
    assert.ok(l.check('k', 20) > 0);
    assert.equal(l.check('k', 1500), 0);
  });
});

describe('mail error explanations', () => {
  it('names what to fix for the common Gmail failures', () => {
    assert.match(explainMailError({ code: 'EAUTH', responseCode: 535, message: 'Invalid login' }), /App Password/);
    assert.match(explainMailError({ code: 'ENOTFOUND', message: 'getaddrinfo ENOTFOUND smtp.gmail.com' }), /SMTP_HOST/);
    assert.match(explainMailError({ code: 'ETIMEDOUT', message: 'timeout' }), /SMTP_PORT/);
    assert.match(explainMailError(new Error('something odd')), /something odd/);
  });
});

describe('limits, proxies and text cutting', () => {
  it('lets CiteCraft requests be larger than a contact message', async () => {
    const t = await start({ citecraftPort: 1 }); // nothing listens on port 1: the proxy step answers "unavailable"
    const big = { references: Array.from({ length: 60 }, (_, i) => ({ id: i, title: 'x'.repeat(600) })) }; // about 36 KB
    const res = await t.post(big, {}, '/api/citecraft/render');
    assert.equal(res.status, 503);
    assert.match(String((await res.json()).detail), /unavailable/, 'the body was accepted and the (absent) backend was tried');
    const bad = await t.post(big, { origin: 'https://evil.example' }, '/api/citecraft/render');
    assert.equal(bad.status, 403, 'a foreign origin is refused before the body is read');
    const hugeSmall = await t.post({ x: 'y'.repeat(100_000) }, {}, '/api/citecraft/styles');
    assert.equal(hugeSmall.status, 413, 'routes that never need big bodies keep a small limit');
    const tooBig = await t.post({ message: 'x'.repeat(40_000) }, {}, '/api/contact');
    assert.equal(tooBig.status, 413, 'the contact route keeps its small limit');
    await t.close();
  });

  it('accepts the public host name sent by a reverse proxy', async () => {
    const t = await start({ trustProxyHops: 1 });
    const res = await t.post(valid, { origin: 'https://www.example.org', 'x-forwarded-host': 'www.example.org', 'x-forwarded-proto': 'https' });
    assert.equal(res.status, 200);
    await t.close();
    const none = await start({ trustProxyHops: 0 });
    const spoof = await none.post(valid, { origin: 'https://www.example.org', 'x-forwarded-host': 'www.example.org', 'x-forwarded-proto': 'https' });
    assert.equal(spoof.status, 403, 'forwarded headers are ignored when no proxy is configured');
    await none.close();
  });

  it('does not split a character when it shortens a long message', async () => {
    const t = await start();
    await t.post({ ...valid, message: 'a'.repeat(4999) + '\u{1F600}' + 'tail' });
    const saved = t.logLines()[0].message as string;
    assert.ok(saved.length <= 5000);
    assert.doesNotMatch(saved, /[\ud800-\udbff]$/);
    await t.close();
  });
});

describe('environment values', () => {
  it('removes quotes that a Docker env file keeps', () => {
    assert.equal(stripEnvQuotes('"smtp.gmail.com"'), 'smtp.gmail.com');
    assert.equal(stripEnvQuotes("'Portfolio <a@b.co>'"), 'Portfolio <a@b.co>');
    assert.equal(stripEnvQuotes('plain'), 'plain');
    assert.equal(stripEnvQuotes(undefined), '');
  });
});
