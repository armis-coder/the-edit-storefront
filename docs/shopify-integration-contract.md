# Shopify integration contract

The storefront runs against `MockCommerceProvider` until a Shopify store is
ready. Both providers return the same product, collection, variant and cart
shapes, so the approved interface does not need to be rebuilt during the
connection phase.

## Activation

Keep mock mode as the default. To activate Shopify later, configure these
runtime values in the hosting environment:

| Variable | Required | Purpose |
| --- | --- | --- |
| `COMMERCE_PROVIDER=shopify` | Yes | Selects the Shopify provider. |
| `SHOPIFY_STORE_DOMAIN` | Yes | The permanent `store-name.myshopify.com` domain. |
| `SHOPIFY_STOREFRONT_PRIVATE_TOKEN` | Preferred | Server-side Storefront API token. |
| `SHOPIFY_STOREFRONT_PUBLIC_TOKEN` | Alternative | Public Storefront API token when a private token is not used. |
| `SHOPIFY_STOREFRONT_API_VERSION` | Optional | Defaults to the pinned version in the provider. |

Never add a private token to source control or browser-visible code.

## Native Shopify fields

- Title and handle
- Description
- Product type and vendor
- Tags
- Images
- Options and variants
- Variant price and compare-at price
- Availability and inventory
- Collections
- Search-engine title and description

## Product metafields

Create these under the `custom` namespace and expose them to the Storefront
API. JSON list values are used where multiple entries are expected.

| Key | Suggested type | Storefront use |
| --- | --- | --- |
| `curation_note` | Multi-line text | Why the object made the edit |
| `materials` | List of single-line text | Construction notes |
| `dimensions` | Single-line text | Measurements and capacity |
| `fulfillment_model` | Single-line text | `in_stock`, `supplier_fulfilled`, or `preorder` |
| `dispatch_estimate` | Single-line text | Honest dispatch window |
| `product_caveats` | List of single-line text | Limitations and buying context |
| `care_instructions` | Multi-line text | Maintenance guidance |
| `restriction_status` | Single-line text | `none`, `review_before_launch`, or `18_plus` |

## Route contract

- Product: `/products/:handle`
- Collection: `/collections/:handle`
- Search: `/search?q=:query`

These routes are already live against representative data. Shopify handles can
replace the mock handles without changing the page components.

## Cart handoff

The current cart is device-local and clearly marked as a prototype. During the
Shopify connection phase, its UI stays in place while its operations are wired
to the provider's `createCart`, `getCart`, `addCartLines`, `updateCartLines`, and
`removeCartLines` methods. Shopify's returned `checkoutUrl` then replaces the
disabled prototype checkout action.

## Launch boundary

Customer accounts, custom payment handling, supplier synchronisation and
regulated-category purchasing remain intentionally outside this foundation.
