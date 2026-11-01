# Security and privacy

## What the server does

- **Content-Security-Policy** in production: only scripts, styles, images, fonts and connections from the site itself. There are no inline scripts or styles and no third-party hosts. The server also sends `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, `Cross-Origin-Opener-Policy`, `X-Frame-Options` and, over HTTPS, HSTS.
- **Contact form** (`POST /api/contact`): the request must come from the site itself (other origins go in `ALLOWED_ORIGINS`), a hidden field catches simple bots, there is a limit per IP address and an overall limit (answer 429 with `Retry-After`), the body is capped at 32 KB, fields have length limits, and everything a visitor types is escaped before it goes into the e-mail. Errors come back as short JSON with no stack trace.
- **Delivery status**: the visitor is told "delivered" only after the mail server accepted the message. Otherwise they see that it was saved but not e-mailed.
- **CiteCraft proxy**: GET, HEAD and POST only, same-origin check on POST, 120 requests a minute per IP, 20 second timeout. The Python service listens on `127.0.0.1` only.
- **Secrets**: mail settings come from environment variables. `.env` is ignored by git.
- **CV files**: not in the repository. `npm run test:scan` fails if a PDF or a phone number pattern shows up in the source or the build.

## What is stored about visitors

Only the contact form stores anything: name, e-mail, subject, message, IP address, browser string and time, in `logs/contact_submissions.jsonl`. That file is ignored by git and never served. The same details go in the e-mail to me. Messages marked anonymous hide the name and e-mail but not the IP address. The CiteCraft service stores nothing. The site has no analytics and no cookies, and loads nothing from other sites.

Because IP addresses count as personal data in the EU, a short notice near the form is a good idea, and old messages should be deleted when they are no longer needed.

The IP address is taken from the request through `TRUST_PROXY_HOPS` proxy hops. The number must match the real setup: 0 on a laptop, 1 behind Caddy or most hosts, 2 behind Cloudflare's proxy and a host. A wrong number lets visitors fake their address or logs the proxy's address instead.

## CiteCraft

- Input is checked against fixed schemas, with unknown fields rejected and sizes capped.
- Imported files are parsed as data. No endpoint accepts a file path, and nothing imported is run.
- Reference text is shown as plain React text, and the HTML export escapes it.
- URLs must be absolute HTTP(S). DOIs are never fetched.
- Duplicate detection only suggests; it changes nothing.

## Reporting a problem

Write to md.hredoy.mesha@gmail.com.
