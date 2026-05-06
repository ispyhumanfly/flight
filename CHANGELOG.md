# Changelog

## 2.0.0

### Breaking

- **Production middleware order** when `FLIGHT_MODE` / `mode` is `production` **and** built-assets mode is on (`--disable_vite` or `FLIGHT_DISABLE_VITE` of `true` / `1` / `yes`): Flight now uses the **production SPA pipeline** by default. Static files from `FLIGHT_DIST_PATH` (default `../dist`) and the SPA `index.html` fallback run **immediately after** the Koa `router` (your `**/*.backend.ts` routes), **before** `koa-compress`, Redis-backed rate limiting, and optional response caching.
- **`koa-cash` is off by default** in that SPA pipeline (to avoid caching HTML or mixed `vary` surprises). Enable with **`FLIGHT_HTTP_CACHE=true`** (or `1` / `yes`) if you want the previous Redis-backed cache layer in that configuration.
- **Legacy stack** (previous order: `compress` → `ratelimit` → `koa-cash` → `koa-static` after the router) remains when **either** Vite is **not** disabled in production **or** you set **`FLIGHT_DISABLE_SPA_PIPELINE=true`** (or `1` / `yes`).

### Added

- **Yargs CLI parity** for **`--mode`**, **`--port`**, **`--app_home`**, **`--app_key`**, **`--app_secret`**, **`--payload_limit`**, and **`--disable_vite`** (plus kebab-case aliases), so documented flags populate `argv` reliably instead of being dropped by the parser.
- **`FLIGHT_TRUST_PROXY`**: when `true` / `1` / `yes`, sets `app.proxy = true` so `ctx.ip` and rate-limit identity honor `X-Forwarded-For` behind a reverse proxy or load balancer.
- **`FLIGHT_STATIC_PREFIXES`**: comma-separated URL path prefixes (default `/assets,/fonts`) used to build the **rate-limit skip** list for `GET`/`HEAD` (hashed assets should not burn the API limiter).
- **`FLIGHT_RATE_LIMIT_EXCLUDE_PREFIXES`**: extra comma-separated prefixes merged into that skip list.
- **`FLIGHT_SPA_INDEX`**: path to the SPA shell inside the dist root (default `index.html`).
- **`FLIGHT_SPA_DENY_PREFIXES`**: extra comma-separated path prefixes that never receive the SPA HTML fallback (always merged with `/api` and `/health`).
- **`npm test`**: regression tests for the SPA pipeline (assets, deep links, API prefix, file-like paths).
- **`files` field** in `package.json` so publishes include only `dist/flight.js`, `dist/spa-pipeline.js`, and docs assets.

### Notes

- `FLIGHT_DISABLE_VITE` accepts **`true`**, **`1`**, or **`yes`** (case-sensitive values as implemented for the string checks).
