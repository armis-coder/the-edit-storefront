export const storeSchema = `
CREATE SCHEMA IF NOT EXISTS edit_store;
CREATE TABLE IF NOT EXISTS edit_store.settings (id integer PRIMARY KEY CHECK(id=1), data jsonb NOT NULL);
CREATE TABLE IF NOT EXISTS edit_store.collections (handle text PRIMARY KEY, data jsonb NOT NULL);
CREATE TABLE IF NOT EXISTS edit_store.products (id uuid PRIMARY KEY, handle text UNIQUE NOT NULL, status text NOT NULL CHECK(status IN ('draft','active','archived')), data jsonb NOT NULL, updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS edit_store.variants (id uuid PRIMARY KEY, product_id uuid NOT NULL REFERENCES edit_store.products(id), price_paisa integer NOT NULL CHECK(price_paisa>0), stock integer NOT NULL DEFAULT 0 CHECK(stock>=0));
CREATE TABLE IF NOT EXISTS edit_store.orders (id uuid PRIMARY KEY, reference text UNIQUE NOT NULL, access_hash text NOT NULL, request_key uuid UNIQUE NOT NULL, request_hash text NOT NULL, status text NOT NULL DEFAULT 'pending', payment_status text NOT NULL DEFAULT 'unpaid', data jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS edit_store.order_items (order_id uuid NOT NULL REFERENCES edit_store.orders(id), variant_id uuid NOT NULL REFERENCES edit_store.variants(id), quantity integer NOT NULL CHECK(quantity>0), PRIMARY KEY(order_id,variant_id));
CREATE TABLE IF NOT EXISTS edit_store.order_events (id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, order_id uuid NOT NULL REFERENCES edit_store.orders(id), data jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS edit_store.rate_limits (key text PRIMARY KEY, hits integer NOT NULL, expires_at timestamptz NOT NULL);
CREATE TABLE IF NOT EXISTS edit_store.subscribers (email text PRIMARY KEY, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS edit_store.media (id uuid PRIMARY KEY, bytes bytea NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS edit_store.outbox (id uuid PRIMARY KEY, order_id uuid NOT NULL REFERENCES edit_store.orders(id), kind text NOT NULL, sent_at timestamptz, attempts integer NOT NULL DEFAULT 0, last_attempt_at timestamptz, UNIQUE(order_id,kind));
CREATE INDEX IF NOT EXISTS edit_products_status ON edit_store.products(status);
CREATE INDEX IF NOT EXISTS edit_orders_created ON edit_store.orders(created_at DESC);
CREATE INDEX IF NOT EXISTS edit_order_events_order ON edit_store.order_events(order_id);
-- No browser-facing database access. The server uses a private PostgreSQL connection.
REVOKE ALL ON SCHEMA edit_store FROM PUBLIC;
REVOKE ALL ON ALL TABLES IN SCHEMA edit_store FROM PUBLIC;
`;
