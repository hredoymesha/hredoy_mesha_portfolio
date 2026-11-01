// Repository and build scan: no CV files, no phone numbers, no third-party hosts, no leftovers of other tools. Needs `npm run build` first.
// node tests/scan.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
let fail = 0;
const ok = (c, m) => { console.log((c ? "PASS " : "FAIL ") + m); if (!c) fail++; };
const SKIP_DIRS = new Set(["node_modules", "dist", ".git", ".venv", "logs", "__pycache__", ".pytest_cache", ".mypy_cache", ".ruff_cache", "coverage"]);
const walk = (dir, out = []) => {
  for (const n of fs.readdirSync(dir)) {
    if (SKIP_DIRS.has(n)) continue;
    const f = path.join(dir, n);
    fs.statSync(f).isDirectory() ? walk(f, out) : out.push(f);
  }
  return out;
};
const rel = (f) => path.relative(root, f).split(path.sep).join("/");
const TEXT = /\.(ts|tsx|js|mjs|json|md|css|html|txt|svg|toml|xml|csl|py|example)$|(^|\/)(\.gitignore|Dockerfile|\.dockerignore)$/;
const PHONE = /(?<![\w.])\+\d{1,3}[\s().-]?\d{2,4}[\s().-]?\d{3}[\s.-]?\d{2,4}/;

const files = walk(root);
const names = files.map(rel);
ok(!names.some((n) => /\.pdf$/i.test(n)), "no PDF files anywhere in the project");
ok(!names.some((n) => /cv[-_ ]/i.test(path.basename(n)) && !/\.(tsx?|mjs|md)$/.test(n)), "no CV files in the project");
const phoneHits = files.filter((f) => TEXT.test(rel(f)) && !/package-lock\.json$/.test(f) && PHONE.test(fs.readFileSync(f, "utf8"))).map(rel);
ok(phoneHits.length === 0, "no phone-number pattern in any text file " + phoneHits.join(", "));

const src = files.filter((f) => /^(src|server|server\.ts|index\.html|public|tests)/.test(rel(f)) && TEXT.test(rel(f)) && !rel(f).startsWith("tests/scan.mjs"));
const read = (f) => fs.readFileSync(f, "utf8");
const bad = (re) => src.filter((f) => re.test(read(f))).map(rel);
ok(bad(/fonts\.googleapis|fonts\.gstatic/).length === 0, "no Google Fonts requests in the source " + bad(/fonts\.googleapis|fonts\.gstatic/).join(", "));
ok(bad(/upload\.wikimedia\.org/).length === 0, "no Wikimedia image requests in the source");
const AI_LEFTOVERS = new RegExp(["@google\\/gen" + "ai", "GEM" + "INI", "AI " + "Studio", "aistu" + "dio"].join("|"), "i"); // built from pieces so this file does not contain the words itself
ok(bad(AI_LEFTOVERS).length === 0, "no AI-service leftovers in the source " + bad(AI_LEFTOVERS).join(", "));
const pkg = JSON.parse(read(path.join(root, "package.json")));
ok(!(("@google/gen" + "ai") in { ...pkg.dependencies, ...pkg.devDependencies }), "package.json has no AI-service dependency");
ok(pkg.name === "hredoy-mesha-portfolio", "package name is hredoy-mesha-portfolio");
ok(!fs.existsSync(path.join(root, "metadata.json")), "no leftover metadata.json from the old tool");
const gi = read(path.join(root, ".gitignore"));
ok(/^logs\/$/m.test(gi) && /^\.env$/m.test(gi) && /cv-\*\.pdf/.test(gi), ".gitignore covers logs/, .env and CV PDFs");
ok(!/<script(?![^>]*\bsrc=)(?![^>]*application\/ld\+json)[^>]*>/.test(read(path.join(root, "index.html"))), "index.html has no inline script (Content-Security-Policy)");
ok(!/\sstyle=/.test(read(path.join(root, "index.html"))), "index.html has no inline style attribute");

// ---- built site ----
const dist = path.join(root, "dist");
if (!fs.existsSync(dist)) { ok(false, "dist/ exists (run npm run build first)"); }
else {
  const built = walk(dist, []).length ? (function w(d, o = []) { for (const n of fs.readdirSync(d)) { const f = path.join(d, n); fs.statSync(f).isDirectory() ? w(f, o) : o.push(f); } return o; })(dist) : [];
  ok(!built.some((f) => /\.pdf$/i.test(f)), "dist/ contains no PDF");
  const textBuilt = built.filter((f) => /\.(html|js|css|json|svg|txt|webmanifest)$/.test(f));
  ok(!textBuilt.some((f) => PHONE.test(read(f))), "dist/ contains no phone-number pattern");
  const html = read(path.join(dist, "index.html"));
  ok(!/googleapis|gstatic/.test(html) && !textBuilt.some((f) => /fonts\.g(oogleapis|static)/.test(read(f))), "dist/ loads no Google Fonts");
  const css = textBuilt.filter((f) => f.endsWith(".css")).map(read).join("\n");
  ok(!/url\(\s*["']?https?:/.test(css), "built CSS references no external URL");
  const loaders = /<(?:script|link|img|iframe|source)\b[^>]*(?:src|href)=["']https?:\/\//i;
  ok(!loaders.test(html.replace(/<link rel="(?:canonical|alternate)"[^>]*>/g, "")), "index.html loads no external script, stylesheet or image");
  ok(!textBuilt.filter((f) => f.endsWith(".js") && !/LivingGlobe/.test(f)).some((f) => /upload\.wikimedia\.org|cdn\.|unpkg\.com|jsdelivr/.test(read(f))), "the page's JavaScript contains no third-party loader host");
  ok(built.some((f) => /noto-sans-bengali.*\.woff2$/.test(f)), "the Bengali font is bundled in dist/ (self-hosted)");
  ok(built.some((f) => f.endsWith("theme-init.js")), "theme-init.js is a separate file in dist/");
  ok(!/unsafe-inline|unsafe-eval/.test(read(path.join(root, "server", "app.ts")).match(/CONTENT_SECURITY_POLICY = \[[\s\S]*?\]/)?.[0] ?? ""), "the Content-Security-Policy has no unsafe-inline / unsafe-eval");
}
console.log(fail ? `\n${fail} FAILED` : "\nALL PASSED");
process.exit(fail ? 1 : 0);
