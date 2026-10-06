# THE / EDIT

Independent ecommerce storefront for curated men's gear in Pakistan. The approved graphite, silver and slate visuals and animated LightField homepage are preserved. Shopify is no longer required for the active commerce system.

## Implemented

- Homepage, collections, product details, search, saved objects and shopping bag.
- PostgreSQL catalogue with options, prices, stock, curation notes and image uploads.
- Protected `/admin` for products, orders, payments, tracking, subscribers, delivery settings and policies.
- Guest checkout in PKR with cash on delivery and bank transfer; server pricing and transactional stock reservation.
- Duplicate-request protection, interrupted-checkout recovery, private receipts and cancellation/restocking.
- Customer receipt and owner alert email outbox, with optional Resend delivery and admin retry.

This is **not an activated customer store**. Production database, owner credentials, real catalogue, courier and email sender still need configuration. Checkout starts closed. No card information is collected.

## Develop and verify

Use Node.js 22.13 or newer.

```bash
npm ci
npm run dev
```

With no configuration, the existing representative mock catalogue remains available. For the independent local system, copy `.env.example` to `.env.local`, leave `DATABASE_URL` empty and set `STORE_DEVELOPMENT_DB=.store-db`. Generate private owner values in your own terminal with `npm run store:credentials`; set `ADMIN_EMAIL` and the local `SITE_URL` too. Never commit these values.

The database starts empty. Add test objects in `/admin`, or explicitly run `npm run store:demo` to add draft, zero-stock representative objects locally. This script refuses to seed production.

```bash
npm run test:commerce
npm run test:http
npm run build
node scripts/verify-next.mjs
npm run lint
```

Commerce tests use isolated PGlite PostgreSQL. HTTP tests start an isolated Next.js server and exercise actual admin, upload, checkout, receipt and newsletter endpoints without production credentials or data. Production route verification runs in mock mode. Run only one Next.js development server per source directory at a time.

## Launch

Follow [the independent store launch guide](docs/independent-store-launch.md). Use a commercial-eligible Node.js host and hosted PostgreSQL. On Vercel, import this repository with the Next.js preset and default output directory. On another Node.js host, use `npm run build` and `npm start` behind HTTPS.

Older Shopify code/documents remain for reference and are unused in independent mode. Original Sites/Vinext scripts remain under `dev:sites`, `build:sites`, `start:sites` and `test:sites`; the independent backend targets standard Next.js and has not been validated on that worker runtime.
