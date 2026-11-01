# One image that runs the whole site: the Express server (contact form, static files) and the CiteCraft Python API.
# Build:  docker build -t hredoy-portfolio .
# Run:    docker run -p 7860:7860 --env-file .env hredoy-portfolio
# Free container hosts (for example Hugging Face Spaces with the Docker SDK, or Render's free web service) can build this file directly.

# ---- 1. build the front-end and keep only the production Node dependencies ----
FROM node:22-bookworm-slim AS web
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build && npm prune --omit=dev

# ---- 2. runtime: Python 3.12 (CiteCraft) plus the Node binary (Express server) ----
FROM python:3.12-slim-bookworm AS runtime
COPY --from=node:22-bookworm-slim /usr/local/bin/node /usr/local/bin/node
ENV NODE_ENV=production \
    PORT=7860 \
    LOGS_DIR=/app/logs \
    TRUST_PROXY_HOPS=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1
WORKDIR /app

COPY citecraft ./citecraft
RUN pip install -c ./citecraft/constraints.txt ./citecraft

COPY --from=web /app/node_modules ./node_modules
COPY --from=web /app/dist ./dist
COPY package.json server.ts ./
COPY server ./server

RUN useradd --uid 1000 --create-home app && mkdir -p /app/logs && chown -R app:app /app/logs
USER app
EXPOSE 7860
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s CMD python -c "import os,sys,urllib.request; sys.exit(0 if urllib.request.urlopen('http://127.0.0.1:%s/healthz' % os.environ.get('PORT','7860'), timeout=4).status == 200 else 1)"
CMD ["node", "--import", "tsx", "server.ts"]
