# Hredoy Mesha: portfolio

My personal site: work in data and IT, independent research, publications and a few projects. It also has a small citation tool (CiteCraft) and a contact form.

Live at https://hredoymesha.com

## What is in it

- The portfolio pages, with a light and a dark theme.
- An English / Bengali switch for the introduction, and a print version (use the browser's Print).
- A globe that shows day and night for the current time.
- CiteCraft, a citation and bibliography tool that runs against a small Python service.
- A contact form. Every message is saved with the visitor's IP address, and it is e-mailed to me when mail is set up.
- CV buttons that open private Google Drive files. People without access ask for it through Google. No CV is stored in this repository.

## Run it on your computer

You need Node.js 20.19 or newer (22 is fine) and npm. For CiteCraft you also need Python 3.12 or newer.

```
npm install
py -3 -m venv citecraft\.venv
citecraft\.venv\Scripts\pip install -e citecraft[dev]
copy env.example .env
npm run doctor
npm run dev
```

Then open http://localhost:3000 (this exact address; the contact form refuses other addresses).

On Mac or Linux use `python3 -m venv citecraft/.venv`, `citecraft/.venv/bin/pip install -e "citecraft[dev]"` and `cp env.example .env`.

Skip the Python lines if you do not need CiteCraft and start the site with `CITECRAFT_DISABLED=true`.

Edit `.env` before you try the contact form, see below. `npm run doctor` reads it, checks the mail login and sends one test e-mail to the address you set. For production use `npm run build` and then `npm start`.

## The contact form

Each message is added to `logs/contact_submissions.jsonl` with the name, e-mail, subject, message, IP address, browser and time. That folder is not committed. If mail settings exist, the message is also e-mailed, and the e-mail shows the same details including the IP address. The visitor only sees "delivered" after the mail server has accepted the message. Otherwise they are told it was saved but could not be e-mailed.

Anonymous messages hide the name and e-mail but not the IP address.

Mail settings go in `.env` (see `env.example`). With Gmail you need an app password: Google Account, Security, 2-step verification, App passwords. Never commit `.env`.

Other protections: a hidden spam-trap field, a limit per IP address and an overall limit, a check that the request comes from the site itself (`ALLOWED_ORIGINS`), size limits, and escaping of everything a visitor types before it goes into the e-mail.

When the site runs on your own computer, the form also shows the reason when an e-mail fails. That text is never shown on the public site.

## Tests

```
npm run lint
npm run test:unit
npm run test:server
npm run build
npm run test:scan
npm run test:e2e
npm run test:matrix
npm run test:citecraft
```

`npm run verify` runs the main ones in order. The browser tests need Chromium (`npx playwright install chromium`, or set `CHROMIUM_PATH`). They use a simulated screen in headless Chromium, so they are not tests on real phones, Safari or Firefox. More in [docs/testing.md](docs/testing.md).

## Publishing

The site needs a server that runs Node and Python, so GitHub Pages cannot host it. The `Dockerfile` builds one image with everything in it. [docs/deploy.md](docs/deploy.md) explains how to run it on a small server with your own domain.

## Limits

- The Bengali introduction should be read by a native speaker.
- The globe can be slow on a computer without a graphics card. Set `SHOW_LIVING_GLOBE` to `false` in `src/App.tsx` to hide it.
- With the browser text size at 300% on a 390 px wide phone, a few lines (years in the certificate list, the "View case study" link) still run past the edge.
- I have not tried the site on real phones, Safari, Firefox, or a hosting company's servers.
- CiteCraft is not a complete citation processor. See [docs/citecraft.md](docs/citecraft.md).

More about security and privacy in [docs/security.md](docs/security.md).
