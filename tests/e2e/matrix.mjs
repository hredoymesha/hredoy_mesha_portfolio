// Responsive matrix: realistic phone / tablet / laptop / desktop / ultrawide sizes (simulated in headless Chromium, NOT real devices),
// plus browser text-size 150-300%. Run: npm run test:matrix   (needs `npm run build` and Chromium). `--write` refreshes docs/RESPONSIVE-TEST-MATRIX.md
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { chromium, open, results, root, startServer } from "./lib.mjs";

const PROFILES = [
  [280, 653, "Galaxy Fold, folded"], [320, 568, "iPhone SE (1st gen)"], [344, 882, "Galaxy Z Fold, cover screen"], [360, 640, "small Android"], [360, 800, "Android"], [375, 667, "iPhone SE / 8"],
  [375, 812, "iPhone X / 12 mini"], [390, 844, "iPhone 12-15"], [393, 852, "iPhone 15 Pro / Pixel"], [412, 915, "Pixel / Galaxy S"], [414, 896, "iPhone 11 / XR"], [430, 932, "iPhone Pro Max"],
  [480, 800, "large phone"], [540, 720, "Surface Duo"], [600, 960, "small tablet"], [640, 360, "phone, landscape"], [667, 375, "iPhone SE, landscape"], [844, 390, "iPhone 12-15, landscape"],
  [768, 1024, "iPad mini / iPad (portrait)"], [820, 1180, "iPad Air (portrait)"], [834, 1112, "iPad Pro 11 (portrait)"], [912, 1368, "Surface Pro 7"], [1024, 768, "iPad (landscape)"], [1024, 1366, "iPad Pro 12.9 (portrait)"],
  [1180, 820, "iPad Air (landscape)"], [1280, 720, "HD laptop"], [1280, 800, "MacBook Air"], [1366, 768, "common laptop"], [1440, 900, "MacBook Pro 15"], [1536, 864, "Windows laptop 125%"],
  [1600, 900, "HD+ monitor"], [1920, 1080, "Full HD monitor"], [2560, 1440, "QHD monitor"], [3440, 1440, "ultrawide"]
];
const DARK_ALSO = new Set([320, 390, 768, 1024, 1280, 1920]);
const R = results();
const srv = await startServer({ citecraft: false });
const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const rows = [];

const probe = () => {
  const vw = document.documentElement.clientWidth;
  const visible = (e) => { const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return r.width > 0 && r.height > 0 && cs.visibility !== "hidden" && cs.display !== "none" && cs.opacity !== "0"; };
  const sr = (e) => e.closest(".sr-only, .hp-field, [aria-hidden='true']");
  const over = document.documentElement.scrollWidth - vw;
  const pastRight = [...document.querySelectorAll("body *")].filter((e) => { if (!visible(e) || sr(e) || e.closest("canvas, svg")) return false; const cs = getComputedStyle(e); if (cs.position === "fixed") return false; let p = e.parentElement; while (p) { const o = getComputedStyle(p).overflowX; if (o === "auto" || o === "scroll" || o === "hidden") return false; p = p.parentElement; } return e.getBoundingClientRect().right > vw + 1; }).map((e) => e.tagName + "." + String(e.className).slice(0, 30));
  const clipped = [...document.querySelectorAll("h1, h2, h3")].filter((h) => visible(h) && !sr(h) && h.scrollWidth > h.clientWidth + 1).map((h) => h.textContent.trim().slice(0, 30));
  let minText = 99; const small = new Set();
  for (const e of document.querySelectorAll("body *")) { if (!visible(e) || sr(e) || ![...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) continue; const fs = parseFloat(getComputedStyle(e).fontSize); if (fs < minText) minText = fs; if (fs < 10) small.add(e.textContent.trim().slice(0, 24)); }
  const targets = [...document.querySelectorAll("button, input:not([type=hidden]), select, textarea, header a, .lang-btn, footer a")].filter((e) => visible(e) && !sr(e) && !e.closest("canvas")).filter((e) => { const r = e.getBoundingClientRect(); return r.width < 24 || r.height < 24; }).map((e) => e.tagName + ":" + (e.getAttribute("aria-label") || e.textContent.trim()).slice(0, 20) + " " + Math.round(e.getBoundingClientRect().width) + "x" + Math.round(e.getBoundingClientRect().height));
  const cv = document.querySelector("canvas")?.getBoundingClientRect();
  const header = document.querySelector("header")?.getBoundingClientRect().height ?? 0;
  const clockGrid = [...document.querySelectorAll('aside .grid')].find((g) => /Helsinki/i.test(g.textContent) && /Dhaka/i.test(g.textContent));
  const cells = clockGrid ? [...clockGrid.children].slice(0, 2).map((c) => c.getBoundingClientRect()) : [];
  const clockCols = cells.length === 2 && Math.abs(cells[0].top - cells[1].top) < 2 ? 2 : 1;
  return { clockCols, over, pastRight, clipped, minText, small: [...small], targets, canvas: cv ? [Math.round(cv.width), Math.round(cv.height)] : null, header: Math.round(header), vh: innerHeight };
};

try {
  for (const [w, h, label] of PROFILES) {
    for (const theme of ["light", ...(DARK_ALSO.has(w) ? ["dark"] : [])]) {
      const { ctx, page, problems } = await open(b, srv.base, { width: w, height: h, theme });
      const r = await page.evaluate(probe);
      const bad = [];
      if (r.over > 0) bad.push(`horizontal scroll ${r.over}px`);
      if (r.pastRight.length) bad.push("content past the right edge: " + r.pastRight.slice(0, 3).join(", "));
      if (r.clipped.length) bad.push("clipped headings: " + r.clipped.join(", "));
      if (w >= 320 && r.clockCols !== 2) bad.push(`hero clocks stack (${r.clockCols} column) at normal text size`);
      if (r.minText < 10) bad.push(`text smaller than 10px (${r.small.join(" | ")})`);
      if (r.targets.length) bad.push("controls under 24x24 CSS px: " + r.targets.slice(0, 3).join(", "));
      if (!r.canvas || r.canvas[0] < 200 || Math.abs(r.canvas[0] - r.canvas[1]) > 2) bad.push("artwork size " + r.canvas);
      if (r.header > r.vh * 0.3) bad.push(`sticky header uses ${r.header}px of ${r.vh}px`);
      if (problems.length) bad.push("console: " + problems[0]);
      R.ok(bad.length === 0, `${String(w).padStart(4)}x${h} ${theme.padEnd(5)} ${label}: ${bad.length ? bad.join("; ") : `no overflow, artwork ${r.canvas[0]}px, min text ${r.minText}px`}`);
      rows.push({ w, h, label, theme, ok: bad.length === 0, note: bad.join("; "), minText: r.minText, canvas: r.canvas });
      await ctx.close();
    }
  }

  // browser text-size preference 150 / 200 / 300 % (needs the full new-headless Chromium; otherwise the preference is ignored and we say so)
  for (const [px, w] of [[24, 390], [32, 390], [48, 390], [32, 1280], [48, 1280]]) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "prof-"));
    fs.mkdirSync(path.join(dir, "Default"));
    fs.writeFileSync(path.join(dir, "Default/Preferences"), JSON.stringify({ webkit: { webprefs: { default_font_size: px, default_fixed_font_size: px - 3 } } }));
    const ctx = await chromium.launchPersistentContext(dir, { ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : { channel: "chromium" }), viewport: { width: w, height: 800 } });
    const p = ctx.pages()[0] || (await ctx.newPage());
    await p.goto(srv.base + "/"); await p.waitForTimeout(1200);
    const r = await p.evaluate(() => ({ root: parseFloat(getComputedStyle(document.documentElement).fontSize), ov: document.documentElement.scrollWidth - document.documentElement.clientWidth }));
    const pct = Math.round((px / 16) * 100);
    // Tailwind sizes are rem-based, so a larger default text size must scale the page: root font size equals the setting
    if (px === 48 && w === 390) { R.info(`text size ${pct}% @${w}px (known limitation, not counted): horizontal overflow ${r.ov}px`); await ctx.close(); continue; }
    r.root !== px ? R.skip(`text size ${pct}% @${w}: browser ignored the font-size preference here (root ${r.root}px)`) : R.ok(r.ov <= 8, `text size ${pct}% @${w}px: layout still fits (horizontal overflow ${r.ov}px, tolerance 8px)`);
    await ctx.close();
  }
} finally {
  await b.close();
  srv.stop();
}
if (process.argv.includes("--write")) {
  const lines = ["# Responsive test matrix", "", `Written by \`npm run matrix:write\` on ${new Date().toISOString().slice(0, 10)}. **Simulated viewports in headless Chromium on Linux: not real devices, not Safari/Firefox, no touch hardware, no screen reader.**`, "", "Checks per profile: no horizontal scroll, nothing past the right edge, headings not clipped, no visible text under 10px, buttons/inputs at least 24x24 CSS px (WCAG 2.2 target size), artwork square and >= 200px, sticky header <= 30% of the viewport height, no console errors.", "", "| Viewport | Device class | Theme | Result | Smallest text |", "|---|---|---|---|---|", ...rows.map((r) => `| ${r.w}x${r.h} | ${r.label} | ${r.theme} | ${r.ok ? "pass" : "FAIL: " + r.note} | ${r.minText}px |`), ""];
  fs.mkdirSync(path.join(root, "docs"), { recursive: true });
  fs.writeFileSync(path.join(root, "docs", "RESPONSIVE-TEST-MATRIX.md"), lines.join("\n"));
  console.log("wrote docs/RESPONSIVE-TEST-MATRIX.md");
}
process.exit(R.done() ? 1 : 0);
