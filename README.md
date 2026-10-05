# THE / EDIT storefront

Custom, responsive storefront for curated men's gear. The latest visual direction uses graphite surfaces, silver controls, restrained product imagery and a lightweight animated light field. The earlier Obsidian Core experiment is retained in source but is not rendered on the homepage.

## Current functionality

- Homepage, collection browsing, search and product detail routes
- Variant selection, device-local shopping bag and saved products
- Replaceable commerce provider with representative mock catalogue data
- Server-side Shopify Storefront API adapter for catalogue and cart operations

This is a prototype. The shopping bag is still local; Shopify cart persistence and checkout handoff are not connected. Checkout is disabled. Newsletter submissions are not collected. There is no custom merchant admin UI. Product, inventory and order management will use Shopify's admin after integration.

## Local Next.js development

Use Node.js 22.13 or newer.

```bash
npm ci
npm run dev:vercel
```

For a production build:

```bash
npm run build:vercel
npm run start:vercel
```

After building, run the Next.js route verification with `node scripts/verify-next.mjs`.

## Deploy to Vercel

Import `armis-coder/the-edit-storefront` from GitHub. Use the repository root, the Next.js framework preset, Node.js 22.x and the default output directory. `vercel.json` configures `npm run build:vercel`; do not select the Sites build script or set the output directory to `dist`.

No Shopify credentials are needed to preview mock mode. Once the Git integration is connected, pushes to `main` can trigger production deployments. Set `SITE_URL` to the final public origin when known.

## Shopify connection

Keep mock mode until Shopify is configured and the remaining cart integration is tested. The implementation and account checklist are documented in:

- [Integration contract](docs/shopify-integration-contract.md)
- [Shopify setup checklist](docs/shopify-setup-checklist.md)
- [Deployment handoff](docs/vercel-handoff.md)

Shopify credentials belong in server-side hosting environment variables, never source control. Selecting `COMMERCE_PROVIDER=shopify` is not sufficient to finish checkout; the shopping bag still needs to be wired to Shopify's cart API and returned checkout URL.

## Existing Sites runtime

The original Sites/Vinext build is preserved alongside Next.js: `npm run dev`, `npm run build`, `npm start`, and `npm test` target that runtime. The Vercel scripts above target standard Next.js. Both runtimes share the same application code and assets.

## Source checkpoint

The storefront application was recovered from saved source commit `8c6b1cffdaa97a4f62efa35ddcacb6b220bbbb80`. The GitHub handoff adds these deployment instructions without changing the validated storefront implementation.
