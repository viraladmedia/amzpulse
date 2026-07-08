**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Copy `.env.example` to `.env.local` and set your keys (e.g. `GEMINI_API_KEY`)
3. Run the app:
   `npm run dev`

## Real Amazon product data

This repo now includes server-side product API routes:

- `GET /api/products/featured`
- `GET /api/products/:asin`
- `POST /api/batch/analyze` with `{ "asins": ["B0..."] }`

The browser never receives Amazon or provider API secrets — all product lookups run through `server/amazonProvider.mjs`, which fans out to one or more **product data providers** in `server/providers/`:

- `server/providers/paapi.mjs` — Amazon Product Advertising API (PA-API)
- `server/providers/spapi.mjs` — [Amazon Selling Partner API](https://developer-docs.amazon.com/sp-api) (the official long-term replacement PA-API itself points to; needs a real seller account with SP-API authorized)
- `server/providers/keepa.mjs` — [Keepa](https://keepa.com/#!api) (also the only provider here that returns real price/sales-rank history for the "History" tab)
- `server/providers/rainforest.mjs` — [Rainforest API](https://www.rainforestapi.com/)
- `server/providers/jungleScout.mjs` — [Jungle Scout API](https://developer.junglescout.com/api)

Configure credentials for any subset of these; only providers with credentials set are used. For a batch of ASINs, providers are tried in order and each one only fills in the ASINs the previous one couldn't find — so if PA-API is unconfigured, rate-limited, or missing a field for a given ASIN, the next configured provider can still cover it instead of the whole lookup failing. Set the order (or restrict to a subset) with:

- `PRODUCT_DATA_PROVIDERS=paapi,spapi,keepa,rainforest,junglescout` (default order shown; e.g. set to `keepa` alone to skip everything else)

Provider credentials:

- PA-API: `AMAZON_PAAPI_ACCESS_KEY`, `AMAZON_PAAPI_SECRET_KEY`, `AMAZON_PAAPI_PARTNER_TAG` (optional: `AMAZON_PAAPI_MARKETPLACE`, `AMAZON_PAAPI_HOST`, `AMAZON_PAAPI_REGION`, `AMAZON_PAAPI_LANGUAGE`, defaulting to the US locale)
- SP-API: `SPAPI_CLIENT_ID`, `SPAPI_CLIENT_SECRET`, `SPAPI_REFRESH_TOKEN` from an authorized SP-API app (optional: `SPAPI_REGION` — `na`/`eu`/`fe`, default `na`; `SPAPI_MARKETPLACE_ID`, default `ATVPDKIKX0DER` for amazon.com)
- Keepa: `KEEPA_API_KEY` (optional `KEEPA_DOMAIN`, default `1` for amazon.com)
- Rainforest: `RAINFOREST_API_KEY` (optional `RAINFOREST_AMAZON_DOMAIN`, default `amazon.com`)
- Jungle Scout: `JUNGLESCOUT_KEY_NAME`, `JUNGLESCOUT_API_KEY` (optional `JUNGLESCOUT_MARKETPLACE`, default `us`)
- `FEATURED_ASINS` as a comma-separated list for dashboard preload products

For local development, `.env.local` is loaded by `vite.config.ts` so the same-origin product API middleware can call these providers directly while keeping credentials out of browser code.

Amazon's Product Advertising API documentation says PA-API was deprecated on May 15, 2026 and points new integrations to the Creators API (which isn't wired up here yet). SP-API is Amazon's actual current official access path and the one most worth setting up for the long term; Keepa/Rainforest/Jungle Scout are licensed third-party data-as-a-service providers that work as fallbacks without a seller account. There is intentionally no scraping fallback here: an earlier revision scraped Amazon product pages with a headless browser and solved CAPTCHA challenges to keep working after PA-API access lapsed, which is not something this project does. If none of the configured providers can find an ASIN, the API returns a clear error instead of silently falling back to scraping.

Field coverage varies by provider — PA-API and SP-API return catalog fields like title, image, price, offer availability/offer count, and sales rank, but not review counts, FBA fees, IP risk, hazmat status, estimated monthly sales, or historical charts. Keepa additionally fills in rating, review count, and real price/BSR history. The UI marks fields no configured provider supplied as unavailable instead of filling them with mock values.

Two of the five providers are best-effort and should be verified before you rely on them in production, since this session couldn't fully confirm their exact response shapes against live docs:
- `server/providers/jungleScout.mjs` — Jungle Scout's public docs describe the Product Database endpoint mainly as a keyword/category discovery search, not a confirmed single-ASIN lookup.
- `server/providers/rainforest.mjs` — the mapper reads a couple of plausible field-name variants defensively, but the exact response schema wasn't independently confirmed this session.

`server/providers/paapi.mjs`, `server/providers/spapi.mjs`, and `server/providers/keepa.mjs` are implemented against their documented/confirmed request and response shapes.

## AI analysis

Gemini-based product analysis now runs server-side (`server/geminiProvider.mjs`, exposed at `POST /api/analysis/product`) instead of calling the Gemini SDK from the browser. Set `GEMINI_API_KEY` (server-only, no `VITE_` prefix) so it never ships in the client bundle.

## Frontend -> Backend integration

During local development, product routes under `/api/products/*` and `/api/batch/analyze` are handled by Vite middleware in this repo. Other `/api/*` requests can be proxied to `http://localhost:3001` for auth, billing, and watchlist work (see `vite.config.ts`). When deploying or using a remote API for every backend route, set `VITE_API_BASE` to that host before building:

- Local backend: `export VITE_API_BASE=http://localhost:3001`
- Production API: `export VITE_API_BASE=https://api.yourdomain.com`

If `VITE_API_BASE` is not provided, the app will call the same origin it was served from.

## Public routes

The frontend now includes a static public shell alongside the workspace. Core routes are available via hash routing so static hosts do not need server-side rewrites:

- `#/`
- `#/features`
- `#/pricing`
- `#/about`
- `#/contact`
- `#/forgot-password`
- `#/reset-password`
- `#/privacy`
- `#/terms`
- `#/billing/success`
- `#/billing/cancel`
- `#/app`

Password reset note: the API now supports forgot/reset password endpoints. In non-production environments, the forgot-password response includes the generated reset link/token for local testing until email delivery is wired up.

### Vercel / static hosts: avoid 404s
- Set `VITE_API_BASE` (or `API_BASE`) in your site environment variables to your backend host.
- On static hosts like Vercel/GitHub Pages there is no built-in `/api/*` handler for this separate backend, so missing `VITE_API_BASE` will surface as a host 404 page when you try to log in or sign up.
- If you want the frontend to talk to your deployed API, configure `VITE_API_BASE` to that backend origin before building.

### Pairing with an auth/billing backend
- Product lookup can run from the serverless API in this repo.
- Auth, Stripe billing, watchlists, and usage tracking still require a backend that implements the existing `/api/auth/*`, `/api/billing/*`, and `/api/watchlist/*` routes.
- Frontend env: set `VITE_API_BASE` (or `API_BASE`) only when you want the frontend to call a separate remote backend for every `/api/*` request.
- During local development, same-origin product routes are handled by Vite middleware first. Other `/api/*` requests can still be proxied to `http://localhost:3001` if you run a compatible backend there.
