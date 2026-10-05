# Shopify connection checklist

## Current checkpoint

The interface has a mock catalogue, product and collection routes, search, variant selection and a device-local bag. A server-side Shopify provider implements catalogue and cart API methods. The interface's cart still needs to be wired to those methods and Shopify's hosted checkout. Merely setting `COMMERCE_PROVIDER=shopify` is not a complete launch.

## Owner setup

1. Create a Shopify store using the real business country and address. Set Pakistan and PKR for the initial market. Use the working brand name until the final identity is chosen.
2. Record the permanent `*.myshopify.com` domain. Do not buy a premium theme for this custom front end.
3. Add two or three real test products with images, prices, variants, weights, inventory and supplier/dispatch notes. Use draft products until ready to publish to the test storefront.
4. Install Shopify's Headless sales channel. Create a storefront named `The Edit Web` and enable the permissions needed for products, collections, metafields and carts. Publish test products to Headless.
5. Put its private Storefront API token into the host's server-side environment variable `SHOPIFY_STOREFRONT_PRIVATE_TOKEN`. Do not commit it or send an admin password. Keep `COMMERCE_PROVIDER` unset/mock until the connection is ready for verification.
6. Set a fulfilment location, shipping coverage/rates, customer contact details and draft delivery/return policies. Prices and dispatch promises must match the actual supplier arrangement.
7. Select payment methods available for the Pakistan-based business. Cash on delivery and bank transfer are possible manual methods. Confirm courier handling and settlement terms before advertising COD.
8. Choose a paid plan when required to test the checkout. Use Shopify's test gateway or the selected provider's sandbox for integration testing, then disable test mode before live selling.

## Development after account setup

- Configure domain and server-side token; verify published products and collections.
- Map editorial fields and real imagery onto the existing components.
- Add validated server-side cart operations, error handling and buyer-context forwarding.
- Replace mock cart persistence with Shopify cart identity; re-check prices and availability from Shopify.
- Hand off to Shopify's returned checkout URL and verify order creation in the admin.
- Test variant selection, quantity updates, stock limits, shipping charges, failed payment, successful order, cancellation and refund paths.
- Verify order emails and shipping/tracking status before launch.

## Operations planning after checkout works

For each product, decide whether it is stocked, supplier fulfilled or ordered after purchase. Then define who confirms the order, who purchases from the supplier, who checks/dispatches the object, which courier carries it, how tracking reaches the customer, how COD is reconciled, and who owns returns. No supplier purchase or fulfilment automation is currently active.

## Official setup references

- https://shopify.dev/docs/storefronts/headless/building-with-the-storefront-api/getting-started
- https://help.shopify.com/en/manual/payments/manual-payments
- https://help.shopify.com/en/manual/payments/shopify-payments/supported-countries
- https://help.shopify.com/en/manual/checkout-settings/test-orders/payments-test-mode
