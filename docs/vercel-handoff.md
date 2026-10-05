# Storefront deployment

The storefront supports both its existing Sites build and a standard Next.js deployment on Vercel. Application components, styles, catalogue and assets are shared.

- Vercel framework: Next.js
- Root: repository root
- Build: `npm run build:vercel` (configured in `vercel.json`)
- Output: framework default; do not override it to `dist`
- Local production: `npm run start:vercel`
- Default commerce provider: mock. Checkout remains disabled.

The confirmed GitHub destination is `https://github.com/armis-coder/the-edit-storefront`. Its production branch is `main`. No Vercel project connected to this repository was found at handoff; import this repository as a new Vercel project. Use Node.js 22.x and leave the output directory at the Next.js default.

For an existing store repository, integrate on its current history rather than force-pushing. After importing or connecting that repository to Vercel, pushes to its configured production branch deploy automatically.

Set `SITE_URL` to the final public origin for metadata when a custom domain is known. Vercel's production URL is used when available; Sites remains the fallback origin.

Shopify variables and remaining cart work are documented in `shopify-integration-contract.md`. Do not enable the Shopify provider until the account, product publishing and integration tests are ready.
