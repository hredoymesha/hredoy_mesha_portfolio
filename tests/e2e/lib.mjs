// Shared helpers for the browser tests: start the production server, collect results.
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_PATH || "playwright");
export { chromium };

export function results() {
  let fail = 0, pass = 0, skip = 0;
  return {
    ok(c, m) { console.log((c ? "PASS " : "FAIL ") + m); c ? pass++ : fail++; },
    skip(m) { console.log("SKIP " + m); skip++; },
    info(m) { console.log("INFO " + m); },
    done() { console.log(`\n${pass} passed, ${fail} failed, ${skip} skipped`); return fail; },
    get fail() { return fail; }
  };
}

export const hasCitecraftPython = () => {
  const venv = path.join(root, "citecraft", ".venv", process.platform === "win32" ? "Scripts" : "bin", process.platform === "win32" ? "python.exe" : "python3");
  return fs.existsSync(venv) || !!process.env.CITECRAFT_PYTHON;
};

/** Starts `tsx server.ts` in production mode on a free port with a throw-away log folder and no mail settings. */
export async function startServer({ citecraft = false, port = 8200 + Math.floor(Math.random() * 500) } = {}) {
  const logs = fs.mkdtempSync(path.join(os.tmpdir(), "e2e-logs-"));
  const env = { ...process.env, NODE_ENV: "production", HOST: "127.0.0.1", PORT: String(port), LOGS_DIR: logs, TRUST_PROXY_HOPS: "0", CITECRAFT_API_PORT: String(port + 1000), CONTACT_RECIPIENT_EMAIL: "", SMTP_HOST: "", SMTP_USER: "", SMTP_PASS: "" };
  if (!citecraft) env.CITECRAFT_DISABLED = "true";
  // Run Node directly with the tsx loader: works the same on Windows, macOS and Linux (no .cmd wrapper).
  const child = spawn(process.execPath, ["--import", "tsx", "server.ts"], { cwd: root, env, stdio: ["ignore", "pipe", "pipe"] });
  let out = "";
  child.stdout.on("data", (d) => (out += d));
  child.stderr.on("data", (d) => (out += d));
  const base = `http://127.0.0.1:${port}`;
  for (let i = 0; i < 80; i++) {
    try { const r = await fetch(base + "/healthz"); if (r.ok) break; } catch { /* not up yet */ }
    await new Promise((r) => setTimeout(r, 250));
    if (i === 79) { child.kill(); throw new Error("server did not start:\n" + out); }
  }
  if (citecraft) {
    for (let i = 0; i < 60; i++) {
      try { const r = await fetch(base + "/api/citecraft/health"); if (r.ok) break; } catch { /* wait */ }
      await new Promise((r) => setTimeout(r, 500));
    }
  }
  return { base, logs, stop: () => child.kill(), output: () => out };
}

export const lum = (r, g, b) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
export const ratio = (a, b) => { const x = lum(...a), y = lum(...b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
export const rgbOf = (c) => (c.match(/[\d.]+/g) || []).map(Number);

/** A page with the given theme stored before the first paint (like a returning visitor). */
export async function open(browser, base, { width = 1280, height = 900, theme = "light", lang, deviceScaleFactor = 1, noWebGL = false } = {}) {
  const ctx = await browser.newContext({ viewport: { width, height }, colorScheme: theme, deviceScaleFactor });
  await ctx.addInitScript(([t, l]) => { try { if (localStorage.getItem("theme") === null) localStorage.setItem("theme", t); if (l && localStorage.getItem("hm-lang") === null) localStorage.setItem("hm-lang", l); } catch { /* ignore */ } }, [theme, lang]);
  // noWebGL: for tests that are not about the 3D globe; headless Chromium draws WebGL in software, which makes reloads very slow.
  if (noWebGL) await ctx.addInitScript(() => { const g = HTMLCanvasElement.prototype.getContext; HTMLCanvasElement.prototype.getContext = function (t, ...a) { return /webgl/i.test(t) ? null : g.call(this, t, ...a); }; });
  const page = await ctx.newPage();
  const problems = [], hosts = new Set(), requests = [];
  page.on("console", (m) => { if (["error", "warning"].includes(m.type()) && !/software WebGL|GroupMarkerNotSet|GPU stall due to ReadPixels/.test(m.text())) problems.push(m.type() + ": " + m.text().slice(0, 200)); });
  page.on("pageerror", (e) => problems.push("pageerror: " + String(e).slice(0, 200)));
  page.on("request", (r) => { requests.push(r.url()); hosts.add(new URL(r.url()).host); });
  await page.addInitScript(() => { window.__csp = []; document.addEventListener("securitypolicyviolation", (e) => window.__csp.push(e.violatedDirective + " " + e.blockedURI)); });
  await page.goto(base + "/");
  await page.waitForSelector("h1");
  await page.waitForTimeout(1200);
  return { ctx, page, problems, hosts, requests };
}
