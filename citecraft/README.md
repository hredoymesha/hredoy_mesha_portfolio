# CiteCraft

CiteCraft is the citation and bibliography tool in the Publications section of the portfolio. A small Python (FastAPI) service formats the citations; the React page talks to it through the Express server. It needs no account and makes no outside lookups.

## Run locally

Requirements: Python 3.12 or newer and Node.js/npm.

```powershell
py -3 -m venv citecraft\.venv
citecraft\.venv\Scripts\python.exe -m pip install -e citecraft[dev]
npm install
npm run dev
```

Open `http://localhost:3000`. The existing Express server starts the API on
`127.0.0.1:8765` and proxies `/api/citecraft/*`. The API is intentionally bound to
loopback and stores no server-side user records.

On systems where the Python executable is not `py -3` on Windows or `python3`
elsewhere, set `CITECRAFT_PYTHON` to the executable path before starting the app.
Set `CITECRAFT_API_PORT` to change the local API port.

## Test and quality commands

```powershell
py -3 -m pytest -q -c citecraft\pyproject.toml citecraft\tests
py -3 -m ruff check citecraft
py -3 -m mypy --config-file citecraft\pyproject.toml
npm run lint
npm run build
```

See [the CiteCraft notes](../docs/citecraft.md) before relying on output.
The styles and their processor are not a guarantee of complete compliance with
every edition-specific edge case. Verify citations against the source and current
official style guidance.

Reference data is saved in this browser's local storage and can be exported as a
CiteCraft JSON project. Clearing browser storage deletes that local copy. No
reference metadata is transmitted to an external metadata provider.
