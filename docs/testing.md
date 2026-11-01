# Testing

`npm run verify` runs the main checks in order. Build first (`npm run build`) before the scan, browser and matrix tests.

| Command | What it checks |
|---|---|
| `npm run lint` | TypeScript type check |
| `npm run test:unit` | the sun-position maths for the globe |
| `npm run test:server` | contact API (delivery messages, spam protection, escaping, rate limits), security headers, static serving |
| `npm run test:scan` | no PDFs, phone numbers, third-party hosts or leftover files in the source and in `dist/` |
| `npm run test:e2e` | in a browser: no console errors, only same-origin requests, CV buttons, contact form, English/Bengali switch, print profile, day and night globe, accessibility (axe), CiteCraft through the proxy |
| `npm run test:matrix` | 34 screen sizes in light mode (eight also in dark) and browser text size 150%, 200% and 300%. `npm run matrix:write` rewrites `docs/RESPONSIVE-TEST-MATRIX.md` |
| `npm run test:citecraft` | CiteCraft Python tests (pytest) |
| `npm run test:citecraft-ui` | CiteCraft panel in a browser: add, edit, delete, import, export, reload |

The browser tests need Chromium. Install it with `npx playwright install chromium`, or set `CHROMIUM_PATH` to an existing one.

## What these tests do not cover

The browser tests are headless Chromium with a simulated screen size. They are not real phones, not Safari or Firefox, and no screen reader was used. The globe ran on software rendering. Real Gmail delivery is not tested either; `npm run doctor` sends one test message from your own computer.

## CiteCraft tests

The pytest suite covers the style list, real formatting in each style, parenthetical and narrative citations, page numbers, grouped citations, numeric order, Chicago first and repeat notes, corporate and Unicode names, author/year warnings, invalid dates, DOI and ISBN, each import and export format, a JSON round trip, duplicate suggestions and API errors.
