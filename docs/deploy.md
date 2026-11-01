# Putting the site on the internet

The site needs a server that runs Node.js and Python at the same time, so it cannot go on GitHub Pages or a plain static host. The `Dockerfile` in the project root builds one image that contains both. Any host that runs Docker can use it.

The simple route described here is a small rented server (a VPS) with Docker, plus Caddy, which fetches and renews the HTTPS certificate on its own. I used a Hetzner server in Helsinki and a domain bought at Cloudflare, but nothing here depends on those two.

## What you need

- A server running Ubuntu 24.04 with a public IP address, and SSH access to it.
- A domain name whose DNS you can edit.
- A Gmail account with an app password if you want contact messages e-mailed to you.

Outgoing mail ports 25 and 465 are blocked on many hosts, Hetzner included. The settings below use port 587, which works there.

## Steps

1. **Point the domain at the server.** In the DNS settings of the domain add two `A` records: `@` and `www`, both with the server's IP address. In Cloudflare set both to "DNS only" (grey cloud) for now.
2. **Install Docker on the server** (once):
   ```
   ssh root@SERVER_IP
   curl -fsSL https://get.docker.com | sh
   ```
3. **Get the code onto the server:**
   ```
   git clone https://github.com/hredoymesha/hredoy_mesha_portfolio.git
   cd hredoy_mesha_portfolio
   ```
4. **Create the `.env` file.** Copy the example and edit it:
   ```
   cp deploy/env.production.example .env
   nano .env
   ```
   Write the values without quotes. `DOMAIN` has no `https://` and no `www`. `ALLOWED_ORIGINS` lists the bare and the `www` address with `https://`. Leave `TRUST_PROXY_HOPS=1`.
5. **Start it:**
   ```
   docker compose -f deploy/docker-compose.yml --env-file .env up -d --build
   ```
   The first build takes a few minutes.
6. **Check it.** Open `https://your-domain`. The address `https://your-domain/healthz` should answer `ok`. Send yourself a message through the contact form and look for it in your inbox (and in the spam folder the first time).

## Updating later

```
cd hredoy_mesha_portfolio
git pull
docker compose -f deploy/docker-compose.yml --env-file .env up -d --build
```

## Good to know

- Only Caddy listens on the internet (ports 80 and 443). The site container has no public port.
- Contact messages, with IP addresses, are kept in a Docker volume named `app_logs`, so they survive updates. To read them: `docker compose -f deploy/docker-compose.yml exec app cat logs/contact_submissions.jsonl`.
- The certificate is stored in the `caddy_data` volume. Do not delete that volume.
- If you later switch on Cloudflare's orange-cloud proxy, set `TRUST_PROXY_HOPS=2`. Otherwise every message would be logged with a Cloudflare address instead of the visitor's.
- Never commit `.env`. It holds the mail password.

## Other hosts

Any service that runs a Docker image works if it lets the container send mail on port 587 and passes `PORT` and the environment variables through. Some hosts block outgoing SMTP, in which case messages are still saved but not e-mailed. Check that before paying for a plan.

For a quick look at the production build on your own computer: `npm run build`, then `npm start`.
