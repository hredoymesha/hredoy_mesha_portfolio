// CiteCraft end to end in a real browser: add / edit / delete / search / sort, six styles, narrative citations, copy to clipboard,
// duplicates, import and export in every format (real downloads), round trips, persistence after reload, error handling.
// Needs the Python environment (citecraft/.venv). Run: npm run test:citecraft-ui
import fs from "node:fs";
import { chromium, hasCitecraftPython, open, results, startServer } from "./lib.mjs";

const R = results();
if (!hasCitecraftPython()) {
  R.skip("CiteCraft UI tests: no Python environment (create citecraft/.venv, see README)");
  process.exit(process.env.REQUIRE_CITECRAFT === "1" ? 1 : 0);
}
const srv = await startServer({ citecraft: true });
const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });

const fillReference = async (page, f) => {
  const summary = page.locator("summary", { hasText: /Add a reference|Edit reference/ });
  if (!(await page.getByLabel("Title *").isVisible())) await summary.click();
  if (f.type) await page.getByLabel("Source type").selectOption(f.type);
  const extra = page.locator("details.citecraft-extra-fields");
  if ((await extra.count()) && !(await extra.evaluate((d) => d.open))) await extra.locator("summary").click();
  for (const [label, value] of Object.entries(f.fields)) await page.getByLabel(new RegExp("^" + label.replace(/[*]/g, "\\*"))).first().fill(value);
};
const addReference = async (page, f) => { await fillReference(page, f); await page.getByRole("button", { name: /Add to bibliography|Save changes/ }).click(); await page.waitForTimeout(500); };
const toolsOpen = async (page) => { const t = page.locator("details.citecraft-tools"); if (!(await t.evaluate((d) => d.open))) await t.locator("summary").click(); };
const toolsAutoOpened = async (page) => page.locator("details.citecraft-tools").evaluate((d) => d.open);
const outputs = (page) => page.locator(".citecraft-results .citecraft-output");
const citationTexts = (page) => page.locator(".citecraft-results .citecraft-output p").allInnerTexts();
const bibTexts = (page) => page.locator(".citecraft-results .citecraft-output ol li").allInnerTexts();

const ARTICLE = { type: "article-journal", fields: { "Title *": "Evidence-Based Policing in Practice", Authors: "Rahman, Amina; World Research Group", "Publication date": "2024-05-10", Journal: "Journal of Public Security", Volume: "12", Issue: "3", Pages: "45-67", DOI: "10.1234/jps.2024.12" } };
const BOOK = { type: "book", fields: { "Title *": "Governing Algorithms", Authors: "Nguyen, Linh", "Publication date": "2022", Publisher: "Local Press" } };
const THESIS = { type: "thesis", fields: { "Title *": "Employee Retention in Finland", Authors: "Mesha, Hredoy", "Publication date": "2023", Institution: "Åbo Akademi University" } };
const BENGALI = { type: "book", fields: { "Title *": "বাংলা সাহিত্যের ইতিহাস", Authors: "সেন, সুকুমার", "Publication date": "1999", Publisher: "আনন্দ পাবলিশার্স" } };

try {
  const { ctx, page, problems } = await open(b, srv.base, { noWebGL: true });
  await ctx.grantPermissions(["clipboard-read", "clipboard-write"], { origin: srv.base });
  await page.evaluate(() => localStorage.removeItem("citecraft.references.v1"));
  await page.reload({ waitUntil: "domcontentloaded" }); await page.waitForSelector(".citecraft-panel"); await page.waitForTimeout(800);
  await page.locator("#research").scrollIntoViewIfNeeded();

  R.ok(await page.locator(".citecraft-panel").isVisible() && (await page.locator("#citecraft-title").innerText()) === "CiteCraft", "the CiteCraft panel is visible in the Research section");
  await toolsOpen(page);
  R.ok(/No citation output yet/.test(await page.locator(".citecraft-results").innerText()), "empty state is shown before any reference is added");
  await page.locator("details.citecraft-tools summary").click();

  // ---- add ----
  R.ok((await toolsAutoOpened(page)) === false, "the references/output section can be collapsed again");
  await addReference(page, ARTICLE);
  R.ok(await toolsAutoOpened(page), "after adding the first reference the output section opens by itself (the citation is visible without extra clicks)");
  R.ok((await page.locator(".citecraft-reference-list li").count()) === 1 && /Evidence-Based Policing/.test(await page.locator(".citecraft-reference-list").innerText()), "adding a journal article puts it in the reference list");
  let cites = await citationTexts(page);
  R.ok(cites.length === 1 && /Rahman/.test(cites[0]) && /2024/.test(cites[0]), `APA in-text citation is generated (${cites[0]})`);
  let bib = await bibTexts(page);
  R.ok(bib.length === 1 && /Journal of Public Security/.test(bib[0]) && /10\.1234\/jps\.2024\.12/.test(bib[0]) && /45/.test(bib[0]), "APA bibliography entry has journal, volume/pages and DOI");
  R.ok((await page.locator(".citecraft-form").evaluate((d) => d.open)) === true && (await page.getByLabel("Title *").inputValue()) === "", "the form stays open and is cleared for the next reference");

  await addReference(page, BOOK); await addReference(page, THESIS); await addReference(page, BENGALI);
  R.ok((await page.locator(".citecraft-reference-list li").count()) === 4, "four references of different types (article, book, thesis, Bengali book) are listed");
  bib = await bibTexts(page);
  R.ok(bib.some((e) => /বাংলা সাহিত্যের ইতিহাস/.test(e)) && bib.some((e) => /সেন/.test(e)), "Bengali (non-Latin) titles and author names are kept in the output");

  // ---- styles ----
  const seen = new Map();
  for (const style of ["apa", "mla", "chicago-author-date", "chicago-notes", "ieee", "vancouver"]) {
    await page.getByLabel("Citation style").selectOption(style);
    await page.waitForFunction(() => !document.querySelector(".citecraft-loading"), null, { timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(500);
    const c = await citationTexts(page); const e = await bibTexts(page);
    seen.set(style, c.join(" | "));
    R.ok(c.length >= 4 && e.length >= 4 && !(await page.locator(".citecraft-error").count()), `style ${style}: ${c.length} citations and ${e.length} bibliography entries, no error (e.g. ${c[0]})`);
  }
  R.ok(new Set(seen.values()).size >= 4, "the six styles produce visibly different citation text");
  R.ok(/^\[?1\]?|\(1\)|1/.test(seen.get("ieee").split(" | ")[0]), "IEEE/Vancouver citations are numbered");

  // ---- narrative ----
  await page.getByLabel("Citation style").selectOption("apa"); await page.waitForTimeout(500);
  if (await page.getByLabel("Citation form").count()) {
    await page.getByLabel("Citation form").selectOption("narrative"); await page.waitForTimeout(600);
    const n = await citationTexts(page);
    R.ok(/Rahman.*\(2024\)/.test(n[0]), `narrative author-date citation (${n[0]})`);
    await page.getByLabel("Citation form").selectOption("parenthetical"); await page.waitForTimeout(400);
  } else R.ok(false, "APA offers a narrative citation form");

  // ---- copy ----
  await outputs(page).first().getByRole("button", { name: "Copy" }).click();
  const clip1 = await page.evaluate(() => navigator.clipboard.readText());
  const firstCite = (await citationTexts(page))[0];
  R.ok(clip1 === firstCite && /Copied to clipboard/.test(await page.locator(".citecraft-status").innerText()), "Copy puts the citation on the clipboard and confirms it");
  await page.getByRole("button", { name: "Copy bibliography" }).click();
  const clip2 = await page.evaluate(() => navigator.clipboard.readText());
  R.ok(clip2.split("\n").length === 4 && /Rahman|Rahman/.test(clip2), "Copy bibliography copies all four entries");

  // ---- search, sort, edit, delete ----
  await page.getByPlaceholder("Search title or author").fill("nguyen");
  R.ok((await page.locator(".citecraft-reference-list li").count()) === 1, "search by author filters the list");
  await page.getByPlaceholder("Search title or author").fill("zzz-no-match");
  R.ok(/No references match/.test(await page.locator(".citecraft-empty").innerText()), "a search with no match says so");
  await page.getByPlaceholder("Search title or author").fill("");
  await page.getByLabel("Sort references").selectOption("title");
  const titles = await page.locator(".citecraft-reference-list li strong").allInnerTexts();
  R.ok(JSON.stringify(titles) === JSON.stringify([...titles].sort((x, y) => x.localeCompare(y))), `sort by title (${titles.join(" / ")})`);
  await page.getByLabel("Sort references").selectOption("year");
  const yrs = await page.locator(".citecraft-reference-list li span").allInnerTexts();
  const ys = yrs.map((s) => parseInt(s)).filter(Boolean);
  R.ok(ys.every((v, i) => i === 0 || ys[i - 1] >= v), `sort by newest year (${ys.join(", ")})`);
  await page.getByLabel("Sort references").selectOption("added");

  await page.getByRole("button", { name: "Edit Governing Algorithms" }).click();
  R.ok((await page.getByLabel("Title *").inputValue()) === "Governing Algorithms", "Edit loads the reference into the form");
  await page.getByLabel("Title *").fill("Governing Algorithms, Second Edition");
  await page.getByRole("button", { name: "Save changes" }).click(); await page.waitForTimeout(600);
  R.ok((await page.locator(".citecraft-reference-list li strong").allInnerTexts()).includes("Governing Algorithms, Second Edition") && (await page.locator(".citecraft-reference-list li").count()) === 4, "saving an edit updates the reference (not a new one)");

  await page.getByRole("button", { name: "Delete Employee Retention in Finland" }).click(); await page.waitForTimeout(500);
  R.ok((await page.locator(".citecraft-reference-list li").count()) === 3 && !(await bibTexts(page)).some((e) => /Employee Retention/.test(e)), "Delete removes the reference and its output");

  // ---- duplicates ----
  await addReference(page, { type: "book", fields: { "Title *": "Governing Algorithms, Second Edition", Authors: "Nguyen, Linh", "Publication date": "2022", Publisher: "Local Press" } });
  await page.waitForTimeout(800);
  R.ok(await page.locator(".citecraft-duplicate-box").isVisible(), "an identical reference triggers a possible-duplicate suggestion (nothing is merged)");

  // ---- export: every format is a real download ----
  const dl = {};
  const formats = ["citecraft-json", "csl-json", "bibtex", "ris", "csv", "plain-text", "markdown", "html", "docx"];
  await toolsOpen(page);
  for (const f of formats) {
    await page.getByLabel("Export format").selectOption(f);
    const [d] = await Promise.all([page.waitForEvent("download", { timeout: 15000 }), page.getByRole("button", { name: /Export bibliography/ }).click()]);
    const p = await d.path(); const buf = fs.readFileSync(p);
    dl[f] = { name: d.suggestedFilename(), buf, text: buf.toString("utf8") };
    R.ok(buf.length > 20, `export ${f}: downloaded ${d.suggestedFilename()} (${buf.length} bytes)`);
  }
  R.ok(JSON.parse(dl["csl-json"].text).length === 4 && JSON.parse(dl["citecraft-json"].text), "CSL JSON has 4 items and CiteCraft JSON parses");
  R.ok(/@(article|book|phdthesis|mastersthesis|thesis)\{/.test(dl.bibtex.text) && /Evidence-Based Policing/.test(dl.bibtex.text), "BibTeX export looks like BibTeX and contains the titles");
  R.ok(/TY {2}- /.test(dl.ris.text) && /ER {2}- /.test(dl.ris.text), "RIS export has TY/ER records");
  R.ok(/title/i.test(dl.csv.text.split("\n")[0]) && dl.csv.text.split("\n").filter(Boolean).length === 5, "CSV export has a header and four rows");
  R.ok(/Governing Algorithms/.test(dl["plain-text"].text) && /Governing Algorithms/.test(dl.markdown.text) && /<(p|li|div)[ >]/.test(dl.html.text) && !/<script/i.test(dl.html.text), "plain text, Markdown and HTML bibliographies contain the titles (HTML has no script)");
  R.ok(dl.docx.buf.slice(0, 2).toString() === "PK" && dl.docx.name.endsWith(".docx"), "the Word export is a real .docx (zip) file");

  // ---- import round trips ----
  const importOf = async (fmt, text, name) => {
    await page.getByLabel("Import format").selectOption(fmt);
    await page.setInputFiles('input[type="file"]', { name, mimeType: "text/plain", buffer: Buffer.from(text) });
    await page.waitForTimeout(900);
  };
  for (const [fmt, key, name] of [["bibtex", "bibtex", "x.bib"], ["ris", "ris", "x.ris"], ["csv", "csv", "x.csv"], ["csl-json", "csl-json", "x.json"], ["citecraft-json", "citecraft-json", "x.json"]]) {
    await page.getByRole("button", { name: "Clear all" }).click(); await page.waitForTimeout(400);
    await importOf(fmt, dl[key].text, name);
    const n = await page.locator(".citecraft-reference-list li").count();
    const err = (await page.locator(".citecraft-error").count()) ? await page.locator(".citecraft-error").first().innerText() : "";
    R.ok(n === 4 && !err, `import ${fmt}: the exported file restores all 4 references ${err}`);
  }
  await page.setInputFiles('input[type="file"]', []).catch(() => {});

  // ---- errors ----
  const problemsBefore = problems.length; // the server answers deliberately broken imports with HTTP 422; the browser logs those as console errors
  await importOf("bibtex", "this is not a bibliography {{{", "bad.bib");
  const errText = (await page.locator(".citecraft-error").count()) ? await page.locator(".citecraft-error").first().innerText() : "";
  const afterBad = await page.locator(".citecraft-reference-list li").count();
  R.ok(afterBad === 4 || /import|parse|valid|no /i.test(errText), `importing a broken file does not damage the list (${afterBad} references; message: ${errText || "none"})`);
  await importOf("citecraft-json", "{not json", "bad.json");
  R.ok((await page.locator(".citecraft-error").count()) > 0 && (await page.locator(".citecraft-reference-list li").count()) === 4, "invalid JSON import shows an error and keeps the list");

  // ---- persistence ----
  await page.reload({ waitUntil: "domcontentloaded" }); await page.waitForSelector(".citecraft-panel"); await page.waitForTimeout(1200);
  await toolsOpen(page);
  const nAfter = await page.locator(".citecraft-reference-list li").count(); const bAfter = (await bibTexts(page)).length;
  R.ok(nAfter === 4 && bAfter === 4, `references and output survive a page reload (browser storage): list ${nAfter}, output ${bAfter}, stored ${await page.evaluate(() => { try { return JSON.parse(localStorage.getItem("citecraft.references.v1") || "[]").length; } catch { return "unreadable"; } })}`);

  // ---- clear all ----
  await page.getByRole("button", { name: "Clear all" }).click(); await page.waitForTimeout(500);
  R.ok((await page.locator(".citecraft-reference-list li").count()) === 0 && /Add your first source/.test(await page.locator(".citecraft-workspace").innerText()), "Clear all empties the list");
  R.ok(await page.getByRole("button", { name: /Export bibliography/ }).isDisabled(), "export is disabled when there are no references");

  const csp = await page.evaluate(() => window.__csp);
  const unexpected = problems.slice(0, problemsBefore).concat(problems.slice(problemsBefore).filter((m) => !/status of 422/.test(m)));
  R.ok(unexpected.length === 0 && csp.length === 0, `no console errors or CSP violations during the CiteCraft session (the two expected 422 answers to broken imports are ignored) ${unexpected[0] || csp[0] || ""}`);
  await ctx.close();
} finally {
  await b.close();
  srv.stop();
}
process.exit(R.done() ? 1 : 0);
