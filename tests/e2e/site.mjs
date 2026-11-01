// Browser tests of the production build: smoke, CSP, third-party requests, CV buttons, LinkedIn, contact form UI, EN/BN switch,
// print profile, day/night art, accessibility (axe) and the CiteCraft proxy. Run: npm run test:e2e   (needs `npm run build` and Chromium)
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import vm from "node:vm";
import { chromium, hasCitecraftPython, lum, open, ratio, results, rgbOf, root, startServer } from "./lib.mjs";

const R = results();
const siteSrc = fs.readFileSync(path.join(root, "src/data/siteData.ts"), "utf8");
const siteData = (() => { const t = siteSrc.slice(siteSrc.indexOf("export const siteData")).replace("export const siteData: SiteData =", "var N ="); const c = {}; vm.runInNewContext(t + ";globalThis.N=N", c); return c.N; })();
const axeSrc = fs.readFileSync(path.join(root, "node_modules/axe-core/axe.min.js"), "utf8");
const withCiteCraft = hasCitecraftPython();
const srv = await startServer({ citecraft: withCiteCraft });
const base = srv.base;
const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });

try {
  // ---------- smoke, CSP, third-party requests, art ----------
  for (const theme of ["light", "dark"]) {
    const { ctx, page, problems, hosts, requests } = await open(b, base, { theme });
    const r = await page.evaluate(() => ({
      title: document.title, h1: document.querySelector("h1")?.textContent || "", sections: ["about", "research", "experience", "work", "skills", "education", "contact"].filter((id) => !document.getElementById(id)),
      navTargets: [...document.querySelectorAll("header nav a[href^='#'], header a[href^='#']")].filter((a) => a.getAttribute("href") !== "#top" && !document.querySelector(a.getAttribute("href"))).length,
      theme: document.documentElement.getAttribute("data-theme"), csp: window.__csp, canvasCount: document.querySelectorAll("canvas").length,
      heroImg: !!document.querySelector("figure img"), pdfLinks: document.querySelectorAll("a[href$='.pdf']").length, globe: !!document.getElementById("globe"), sketch: !!document.getElementById("sketchbook")
    }));
    R.ok(/Hredoy Mesha/.test(r.title) && /Analytics teams can act on/.test(r.h1), `[${theme}] page loads with the expected title and headline`);
    R.ok(r.sections.length === 0 && r.navTargets === 0, `[${theme}] all sections exist and every navigation link has a target ${r.sections.join(",")}`);
    R.ok(r.theme === theme, `[${theme}] stored theme is applied before first paint`);
    R.ok(problems.length === 0 && r.csp.length === 0, `[${theme}] no console errors, warnings or CSP violations ${problems.concat(r.csp)[0] || ""}`);
    R.ok([...hosts].every((h) => h === new URL(base).host), `[${theme}] only this site is contacted (${[...hosts].join(", ")})`);
    R.ok(!requests.some((u) => /\.pdf(\?|$)/i.test(u)), `[${theme}] no PDF is requested`);
    R.ok(r.canvasCount >= 1 && !r.heroImg, `[${theme}] hero artwork is a canvas drawn by code (no photo/img)`);
    R.ok(!r.pdfLinks && r.globe && !r.sketch, `[${theme}] no PDF links; Living Globe section is present; Sketchbook is not`);
    {
      await page.locator("#work").scrollIntoViewIfNeeded(); await page.waitForTimeout(800);
      for (const el of await page.locator("#work article img").all()) { await el.scrollIntoViewIfNeeded(); await page.waitForTimeout(400); }
      await page.waitForTimeout(800);
      const imgs = await page.evaluate(() => [...document.querySelectorAll("#work article img")].map((i) => ({ src: i.getAttribute("src"), ok: i.complete && i.naturalWidth > 0 })));
      R.ok(imgs.length === siteData.work.length && imgs.every((i) => i.ok), `[${theme}] all ${siteData.work.length} Selected Work pictures load (${imgs.filter((i) => !i.ok).map((i) => i.src).join(", ") || "ok"})`);
      const tex = await page.evaluate(async () => (await Promise.all(["daymap", "nightmap", "clouds"].map((n) => fetch(`/textures/earth-${n}-2k.jpg`).then((r) => r.headers.get("content-type"))))).join());
      R.ok(/image\/jpeg.*image\/jpeg.*image\/jpeg/.test(tex), `[${theme}] the three Earth images are served as pictures (${tex})`);
      await page.locator("#globe").scrollIntoViewIfNeeded(); await page.waitForTimeout(2500);
      R.ok(await page.getByText(/Textures: Solar System Scope/).isVisible(), `[${theme}] the Earth-image credit line is shown`);
      if (theme === "light") {
        const cv = page.locator("#globe canvas"); const box = await cv.boundingBox();
        const before = await cv.screenshot();
        await page.getByRole("button", { name: "Zoom in" }).click(); await page.getByRole("button", { name: "Zoom in" }).click(); await page.waitForTimeout(2500);
        const zoomed = await cv.screenshot();
        R.ok(!before.equals(zoomed), `[${theme}] the Zoom in buttons change the globe view`);
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await page.mouse.down(); await page.mouse.move(box.x + box.width / 2 + 140, box.y + box.height / 2 + 10, { steps: 8 }); await page.mouse.up(); await page.waitForTimeout(2500);
        const dragged = await cv.screenshot();
        R.ok(!zoomed.equals(dragged), `[${theme}] dragging turns the globe`);
        // plain scrolling over the globe must scroll the page (no scroll trap); Ctrl + wheel zooms
        await page.evaluate(() => window.scrollTo(0, document.querySelector("#globe").offsetTop));
        await page.waitForTimeout(300);
        const y0 = await page.evaluate(() => window.scrollY);
        const b2 = await cv.boundingBox();
        await page.mouse.move(5, 5); await page.waitForTimeout(200); // leave the globe so mouse-wheel zoom is off again
        await page.mouse.move(b2.x + b2.width / 2, b2.y + b2.height / 2); await page.mouse.wheel(0, 150); await page.waitForTimeout(400);
        R.ok((await page.evaluate(() => window.scrollY)) > y0, `[${theme}] before the globe is clicked, the mouse wheel over it still scrolls the page`);
        R.ok(await page.getByText("Click the globe to zoom with the mouse wheel").isVisible().catch(() => false), `[${theme}] a hint explains how to switch on mouse-wheel zoom`);
        // after a click the wheel zooms the globe and the page stays put
        await page.evaluate(() => window.scrollTo(0, document.querySelector("#globe").offsetTop));
        await page.waitForTimeout(300);
        const b3 = await cv.boundingBox(); const y1 = await page.evaluate(() => window.scrollY);
        await page.mouse.click(b3.x + b3.width / 2, b3.y + b3.height / 2); await page.waitForTimeout(300);
        const beforeWheel = await cv.screenshot();
        await page.mouse.wheel(0, -300); await page.waitForTimeout(2500);
        const afterWheel = await cv.screenshot();
        R.ok(!beforeWheel.equals(afterWheel) && (await page.evaluate(() => window.scrollY)) === y1, `[${theme}] after clicking the globe, the mouse wheel zooms it and the page does not scroll`);
        await cv.focus(); await page.keyboard.press("ArrowLeft"); await page.waitForTimeout(1500);
        R.ok(!afterWheel.equals(await cv.screenshot()), `[${theme}] the keyboard (arrow keys) turns the globe`);
        R.ok((await page.evaluate(() => getComputedStyle(document.querySelector("#globe canvas")).touchAction)) === "pan-y", `[${theme}] the globe lets vertical swipes scroll the page (touch-action: pan-y)`);
        R.ok(/Local time \d\d:\d\d · (Day|Night|Twilight)/.test(await page.locator("#globe").innerText()), `[${theme}] city cards show the real local time and Day, Twilight or Night`);
      }
    }
    if (theme === "light") {
      const chips = page.locator(".career-timeline button[aria-pressed]");
      R.ok((await chips.count()) === 4 && (await page.locator(".career-timeline .timeline-item").count()) === 8 && !(await page.getByText("Field work").count()), `[${theme}] career timeline shows 4 filters (All, Data & IT, Research, Study), 6 roles plus 2 studies, and no "Field work" text`);
      await page.getByRole("button", { name: "Research", exact: true }).click();
      const research = await page.locator(".career-timeline .timeline-item .timeline-role").allInnerTexts();
      R.ok(research.length === 2 && research.some((t) => /Independent Researcher/.test(t)), `[${theme}] the Research filter keeps only research roles (${research.join(" | ")})`);
      await page.getByRole("button", { name: "Data & IT", exact: true }).click();
      R.ok((await page.locator(".career-timeline .timeline-item").count()) === 2, `[${theme}] the Data & IT filter keeps 2 roles`);
      await page.getByRole("button", { name: "Study", exact: true }).click();
      const studies = await page.locator(".career-timeline .timeline-item .timeline-role").allInnerTexts();
      R.ok(studies.length === 2 && studies.some((t) => /Master's in Governance of Digitalisation \(MSc\)/.test(t)), `[${theme}] the Study filter shows the Master's and the Bachelor's (${studies.join(" | ")})`);
      await page.getByRole("button", { name: "All", exact: true }).click(); await page.waitForTimeout(300);
      const whole = await page.locator(".career-timeline .timeline-when").allInnerTexts();
      R.ok(/2014|Jan 2014/.test(whole[whole.length - 1]) && /2025/.test(whole[0]), `[${theme}] with All selected the timeline runs from 2025 back to 2014 (${whole[whole.length - 1]} ... ${whole[0]})`);
      await page.getByRole("button", { name: "All", exact: true }).click();
      R.ok((await page.evaluate(() => getComputedStyle(document.querySelector(".career-timeline")).position)) === "sticky", `[${theme}] the Career timeline stays in view on a tall screen (sticky at 1280x900)`);
      const cols = await page.evaluate(() => { const g = document.querySelector("#experience .grid"); const k = [...g.children]; return k.map((c) => Math.round(c.getBoundingClientRect().width)); });
      R.ok(Math.abs(cols[0] / (cols[0] + cols[1]) - 0.7) < 0.03, `[${theme}] Experience columns are about 70/30 (${cols.join(" / ")}px)`);
    }
    const luma = await page.evaluate(() => { const c = document.querySelector("canvas"); const d = c.getContext("2d").getImageData(0, 0, c.width, c.height).data; let s = 0, n = 0; for (let i = 0; i < d.length; i += 64) { s += 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]; n++; } return s / n; });
    R.ok(theme === "light" ? luma > 90 : luma < 80, `[${theme}] ${theme === "light" ? "late-afternoon (bright)" : "night (dark)"} artwork was drawn for the stored theme at load (mean luma ${luma.toFixed(0)})`);
    await ctx.close();
  }

  // theme toggle
  {
    const { ctx, page } = await open(b, base, { theme: "light" });
    const btn = page.locator('button[aria-label*="theme" i], button[aria-label*="mode" i]').first();
    await btn.click();
    R.ok((await page.getAttribute("html", "data-theme")) === "dark" && (await page.evaluate(() => localStorage.getItem("theme"))) === "dark", "theme toggle switches to dark and remembers it");
    await page.reload(); await page.waitForTimeout(800);
    R.ok((await page.getAttribute("html", "data-theme")) === "dark", "dark theme survives a reload");
    await ctx.close();
  }

  // ---------- CV buttons: private Google Drive links ----------
  {
    const { ctx, page } = await open(b, base);
    const cv = page.locator('[data-cv="drive"]');
    R.ok((await cv.count()) === 2, "two CV links are shown");
    const info = await cv.evaluateAll((els) => els.map((e) => ({ tag: e.tagName, href: e.getAttribute("href"), target: e.getAttribute("target"), rel: e.getAttribute("rel"), dl: e.hasAttribute("download") })));
    R.ok(info.every((i) => i.tag === "A" && /^https:\/\/drive\.google\.com\/file\/d\/[\w-]+\/view/.test(i.href) && i.target === "_blank" && /noopener/.test(i.rel) && !i.dl), "CV links go only to Google Drive, open in a new tab with noopener, and are not downloads");
    R.ok(await page.locator("#cv-note").isVisible() && /request/i.test(await page.locator("#cv-note").textContent()), "a visible note explains that access can be requested");
    R.ok(!(await page.locator("a[href$='.pdf'], a[download]").count()), "no CV file is stored or linked from this site");
    await ctx.close();
  }

  // ---------- LinkedIn card ----------
  for (const theme of ["light", "dark"]) {
    const { ctx, page } = await open(b, base, { theme });
    await ctx.route(/linkedin\.com/, (r) => r.fulfill({ status: 200, contentType: "text/html", body: "<title>mock</title>" }));
    const text = await page.evaluate(() => document.body.innerText);
    R.ok(!/Connect for academic discussions|prospective doctoral research partnerships/.test(text), `[${theme}] LinkedIn description text is gone`);
    const link = page.getByRole("link", { name: /Connect on LinkedIn/ });
    const st = await link.evaluate((e) => ({ href: e.getAttribute("href"), target: e.target, bg: getComputedStyle(e).backgroundColor, fg: getComputedStyle(e).color }));
    R.ok(st.href === siteData.profile.links.linkedin && st.target === "_blank", `[${theme}] LinkedIn link and target unchanged (${st.href})`);
    const panel = rgbOf(await page.evaluate(() => getComputedStyle(document.querySelector("aside")).backgroundColor));
    const bg = rgbOf(st.bg); const fg = rgbOf(st.fg);
    const eff = bg.length === 4 ? panel.slice(0, 3).map((v, i) => v * (1 - bg[3]) + bg[i] * bg[3]) : bg;
    R.ok(ratio(fg, eff) >= 4.5, `[${theme}] LinkedIn button text readable (${ratio(fg, eff).toFixed(1)}:1)`);
    if (theme === "light") R.ok(lum(...bg.slice(0, 3)) > 0.5, "[light] LinkedIn button is a light colour");
    const [pop] = await Promise.all([page.waitForEvent("popup", { timeout: 8000 }).catch(() => null), link.click()]);
    R.ok(!!pop && /linkedin\.com\/in\/meshahredoy/.test(pop.url()), `[${theme}] clicking the button opens the LinkedIn profile in a new tab`);
    await ctx.close();
  }

  // ---------- removed texts ----------
  {
    const { ctx, page } = await open(b, base);
    const all = await page.evaluate(() => document.body.innerText + document.documentElement.outerHTML);
    R.ok(!/Original Coded Painting|Monsoon, river, a wanderer|an original,? coded painting/i.test(all), "the painting texts are absent from visible text, aria-labels and markup");
    R.ok(!/Inquiries delivered directly to/i.test(all), '"Inquiries delivered directly to ..." is absent');
    await ctx.close();
  }

  // ---------- contact form: accurate feedback, spam trap ----------
  {
    const { ctx, page } = await open(b, base, { width: 1280 });
    await page.locator("#contact").scrollIntoViewIfNeeded();
    const hp = await page.evaluate(() => { const i = document.getElementById("hp_extra"); const r = i.getBoundingClientRect(); return { tab: i.tabIndex, hiddenFromAT: !!i.closest("[aria-hidden='true']"), offscreen: r.right < 0 || r.left < -1000, auto: i.autocomplete }; });
    R.ok(hp.tab === -1 && hp.hiddenFromAT && hp.offscreen && hp.auto === "off", "the honeypot field is invisible, unreachable by keyboard and hidden from screen readers");
    await page.fill("#name", "Test Visitor"); await page.fill("#email", "visitor@example.org");
    await page.fill("#subject", "Hello"); await page.fill("#message", "Testing the form.");
    await page.getByRole("button", { name: /Send Message/ }).click();
    await page.waitForTimeout(800);
    const msg = await page.locator("#contact form").innerText();
    R.ok(/saved, but/i.test(msg) && !/has been delivered/i.test(msg), "with no mail server configured, the form says the message was saved but not e-mailed (never 'delivered')");
    const lines = fs.existsSync(path.join(srv.logs, "contact_submissions.jsonl")) ? fs.readFileSync(path.join(srv.logs, "contact_submissions.jsonl"), "utf8").trim().split("\n").map((l) => JSON.parse(l)) : [];
    R.ok(lines.length === 1 && lines[0].message === "Testing the form." && typeof lines[0].clientIp === "string" && lines[0].clientIp.length > 0, "the message and the visitor IP address are stored in the log");
    // mocked answers: success and rate limit
    await page.route("**/api/contact", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, delivered: true, message: "ok" }) }));
    await page.fill("#name", "Test Visitor"); await page.fill("#email", "visitor@example.org"); await page.fill("#subject", "Again"); await page.fill("#message", "Second message.");
    await page.getByRole("button", { name: /Send Message/ }).click(); await page.waitForTimeout(500);
    R.ok(/has been delivered/i.test(await page.locator("#contact form").innerText()), "a confirmed delivery shows the success message");
    await page.unroute("**/api/contact");
    await page.route("**/api/contact", (route) => route.fulfill({ status: 429, contentType: "application/json", body: JSON.stringify({ success: false, error: "Too many messages in a short time. Please try again later." }) }));
    await page.fill("#name", "Test Visitor"); await page.fill("#email", "visitor@example.org"); await page.fill("#subject", "Third"); await page.fill("#message", "Third message.");
    await page.getByRole("button", { name: /Send Message/ }).click(); await page.waitForTimeout(500);
    R.ok(/Too many messages/i.test(await page.locator("#contact form").innerText()), "a rate-limit answer is shown to the visitor");
    await ctx.close();
  }

  // ---------- EN / বাংলা switch ----------
  for (const width of [320, 390, 768, 1280, 1920]) {
    const { ctx, page } = await open(b, base, { width, height: 900 });
    const en = siteData.profile.summary;
    R.ok((await page.getByRole("button", { name: "English" }).getAttribute("aria-pressed")) === "true", `@${width}: English is pressed by default`);
    R.ok((await page.evaluate(() => document.querySelector("h1").getAttribute("lang"))) === null && (await page.getAttribute("html", "lang")) === "en", `@${width}: English text carries no language override`);
    const h0 = await page.evaluate(() => document.querySelector("h1").getBoundingClientRect().top);
    await page.getByRole("button", { name: /বাংলা/ }).focus(); await page.keyboard.press("Enter");
    await page.evaluate(() => document.fonts.ready); await page.waitForTimeout(300);
    const r = await page.evaluate(() => ({ h1: document.querySelector("h1").textContent, h1l: document.querySelector("h1").lang, avail: [...document.querySelectorAll("p")].find((p) => p.textContent.startsWith("Open to data"))?.textContent, hero: [...document.querySelectorAll("p[lang='bn']")].map((p) => p.textContent), pressed: [...document.querySelectorAll(".lang-btn")].map((b) => b.getAttribute("aria-pressed")), status: document.querySelector(".lang-switch [role='status']").textContent, font: getComputedStyle(document.querySelector("p[lang='bn']")).fontFamily, loaded: document.fonts.check('16px "Noto Sans Bengali"', "বাংলা"), ov: document.documentElement.scrollWidth - document.documentElement.clientWidth, lh: parseFloat(getComputedStyle(document.querySelector("p[lang='bn']")).lineHeight) / parseFloat(getComputedStyle(document.querySelector("p[lang='bn']")).fontSize) }));
    R.ok(r.h1.includes(siteData.introBn.headline.lead) && r.h1l === "" && siteData.introBn.summary.every((p) => r.hero.includes(p)) && r.avail === siteData.introBn.availability && siteData.introBn.aboutParagraphs.every((p) => r.hero.includes(p)), `@${width}: English headline and availability line stay English; Bengali summary and About paragraphs are shown with lang="bn"`);
    R.ok(r.pressed.join() === "false,true" && r.status === siteData.introBn.announce, `@${width}: keyboard switch updates aria-pressed and announces the change`);
    R.ok(/Noto Sans Bengali/.test(r.font) && r.loaded, `@${width}: the self-hosted Bengali font is applied and loaded`);
    R.ok(r.ov <= 0 && r.lh >= 1.6, `@${width}: no horizontal overflow, Bengali line height ${r.lh.toFixed(2)} (>= 1.6)`);
    await page.reload(); await page.waitForTimeout(800);
    R.ok((await page.evaluate(() => !!document.querySelector("p[lang='bn']"))), `@${width}: the choice is remembered in this browser after a reload`);
    await page.getByRole("button", { name: "English" }).click(); await page.waitForTimeout(200);
    const back = await page.evaluate(() => ({ s: [...document.querySelectorAll("p")].some((p) => p.textContent.startsWith("I am a data and IT professional")), l: document.querySelector("h1").getAttribute("lang"), top: document.querySelector("h1").getBoundingClientRect().top }));
    R.ok(back.s && back.l === null && Math.abs(back.top - h0) < 4, `@${width}: switching back restores the English text and layout`);
    R.ok(en.length > 0, `@${width}: (English source text present)`);
    await ctx.close();
  }

  // ---------- print profile ----------
  {
    const { ctx, page } = await open(b, base);
    await page.emulateMedia({ media: "print" });
    const r = await page.evaluate(() => { const vis = (s) => [...document.querySelectorAll(s)].some((e) => e.getClientRects().length > 0); return { shown: ["#about", "#research", "#experience", "#skills", "#education", "#contact"].filter((s) => !vis(s)), hidden: ["header", "canvas", "form", "#work", "[data-cv]", ".lang-switch", ".to-top"].filter(vis), text: document.body.innerText }; });
    R.ok(r.shown.length === 0, "print: profile sections are shown " + r.shown.join(","));
    R.ok(r.hidden.length === 0, "print: navigation, artwork, form, work cards, CV buttons and switches are hidden " + r.hidden.join(","));
    R.ok(r.text.includes(siteData.profile.links.email) && /10\.69814\/wp\/2026121/.test(r.text), "print: e-mail address and publication DOIs are printed");
    R.ok(!/\+\d{1,3}[\s().-]?\d{2,4}[\s().-]?\d{3}/.test(r.text) && !/Sketchbook|Send Message/.test(r.text), "print: no phone-number pattern, no Sketchbook or form text");
    const f = path.join(os.tmpdir(), "hm-print.pdf"); await page.pdf({ path: f, format: "A4" });
    let pages = -1; try { pages = +/Pages:\s+(\d+)/.exec(execFileSync("pdfinfo", [f]).toString())[1]; } catch { /* pdfinfo missing */ }
    pages === -1 ? R.skip("print: page count (pdfinfo not installed)") : R.ok(pages >= 3 && pages <= 11, `print: the profile is ${pages} A4 pages (3-11 allowed)`);
    await ctx.close();
  }

  // ---------- accessibility (axe) ----------
  // Known, documented and NOT changed (design is frozen): white text on the light-green accent in dark mode.
  const KNOWN_CONTRAST = []; // none: the four green buttons now use dark text in dark mode
  for (const [w, theme, lang] of [[390, "light"], [1280, "light"], [390, "dark"], [1280, "dark"], [1280, "light", "bn"], [1280, "dark", "bn"]]) {
    const { ctx, page } = await open(b, base, { width: w, theme, lang });
    await page.evaluate(axeSrc);
    const ax = await page.evaluate(async () => {
      const r = await axe.run(document, { runOnly: ["wcag2a", "wcag2aa", "wcag21aa"] });
      return r.violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => ({ text: (document.querySelector(n.target[0])?.innerText || "").trim().slice(0, 40), html: n.html.slice(0, 80) })) }));
    });
    const unknown = ax.filter((v) => v.id !== "color-contrast" || v.nodes.some((n) => !KNOWN_CONTRAST.some((re) => re.test(n.text))));
    const knownCount = ax.filter((v) => v.id === "color-contrast").reduce((n, v) => n + v.nodes.length, 0);
    R.ok(unknown.length === 0, `axe ${theme}${lang ? "/" + lang : ""} @${w}: no new violations (${unknown.map((v) => v.id + "[" + v.nodes.map((n) => n.text || n.html).join(" | ") + "]").join(", ") || "none"}; known dark-mode button contrast: ${knownCount})`);
    await ctx.close();
  }

  // ---------- accessibility of the globe's Day & Night view (not the default tab, so the loop above never sees it) ----------
  for (const theme of ["light", "dark"]) {
    const { ctx, page } = await open(b, base, { width: 1280, theme });
    await page.locator("#globe").scrollIntoViewIfNeeded();
    await page.getByRole("button", { name: "Day & Night" }).click(); await page.waitForTimeout(1500);
    await page.evaluate(axeSrc);
    const ax = await page.evaluate(async () => (await axe.run(document.querySelector("#globe"), { runOnly: ["wcag2a", "wcag2aa", "wcag21aa"] })).violations.map((v) => v.id + ":" + v.nodes.map((n) => (n.html || "").slice(0, 60)).join("|")));
    R.ok(ax.length === 0, `axe ${theme}: the globe's Day & Night view has no violations (${ax.join(", ") || "none"})`);
    await ctx.close();
  }

  // ---------- CiteCraft through the Node proxy ----------
  if (!withCiteCraft) R.skip("CiteCraft proxy tests (no Python environment found: create citecraft/.venv, see README)");
  else {
    const h = await fetch(base + "/api/citecraft/health");
    R.ok(h.ok && (await h.json()).status === "ok", "CiteCraft API answers through the Node proxy (/api/citecraft/health)");
    const render = await fetch(base + "/api/citecraft/render", { method: "POST", headers: { "content-type": "application/json", origin: base }, body: JSON.stringify({ style: "apa", references: [{ id: "r1", source_type: "book", title: "User entered title", authors: [{ family: "Writer", given: "Alex" }], year: 2024, publisher: "Local Press" }] }) });
    const body = await render.json();
    R.ok(render.ok && body.citations?.[0] === "(Writer, 2024)" && /User entered title/.test(body.bibliography?.[0]), "CiteCraft renders an APA citation and bibliography through the proxy");
    const foreign = await fetch(base + "/api/citecraft/render", { method: "POST", headers: { "content-type": "application/json", origin: "https://evil.example" }, body: "{}" });
    R.ok(foreign.status === 403, "CiteCraft POST requests from other origins are refused");
    const { ctx, page, problems } = await open(b, base);
    await page.locator("#research").scrollIntoViewIfNeeded(); await page.waitForTimeout(600);
    R.ok(await page.locator(".citecraft-panel").first().isVisible(), "the CiteCraft panel is visible in the Research section");
    R.ok((await page.evaluate(() => window.__csp.length)) === 0 && problems.length === 0, `CiteCraft panel loads without CSP violations or console errors ${problems[0] || ""}`);
    await ctx.close();
  }
} finally {
  await b.close();
  srv.stop();
}
const failed = R.done();
process.exit(failed ? 1 : 0);
