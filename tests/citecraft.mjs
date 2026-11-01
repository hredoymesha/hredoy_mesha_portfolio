// Runs CiteCraft's own Python tests (pytest). Uses citecraft/.venv, or CITECRAFT_PYTHON, or python3. Skips with a clear message when the Python packages are missing.
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const venv = path.join(root, "citecraft", ".venv", process.platform === "win32" ? "Scripts" : "bin", process.platform === "win32" ? "python.exe" : "python3");
const python = process.env.CITECRAFT_PYTHON || (fs.existsSync(venv) ? venv : process.platform === "win32" ? "py" : "python3");
const probe = spawnSync(python, ["-c", "import fastapi, citeproc, bibtexparser, docx, pytest"], { encoding: "utf8" });
if (probe.status !== 0) {
  console.log("SKIP CiteCraft tests: the Python packages are not installed. Run:  python -m venv citecraft/.venv && citecraft/.venv/bin/pip install -e \"citecraft[dev]\"");
  process.exit(process.env.REQUIRE_CITECRAFT === "1" ? 1 : 0);
}
const r = spawnSync(python, ["-m", "pytest", "-q", "-c", path.join("citecraft", "pyproject.toml"), "citecraft/tests"], { cwd: root, stdio: "inherit" });
process.exit(r.status ?? 1);
