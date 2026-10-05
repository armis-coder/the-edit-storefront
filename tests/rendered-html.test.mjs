import assert from "node:assert/strict";
import test from "node:test";

async function getWorker() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("route-test", `${process.pid}-${Date.now()}`);
  return (await import(workerUrl.href)).default;
}

async function render(pathname) {
  if (process.env.STOREFRONT_TEST_URL) return fetch(new URL(pathname, process.env.STOREFRONT_TEST_URL), { headers: { accept: "text/html" } });
  const worker = await getWorker();
  return worker.fetch(
    new Request(`http://localhost${pathname}`, {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("renders the redesigned homepage from the commerce provider", async () => {
  const response = await render("/");
  const html = await response.text();

  assert.equal(response.status, 200);
  assert.match(html, /Built to/);
  assert.match(html, /Kestrel Fold/);
  assert.match(html, /Explore the edit/);
  assert.match(html, /light-field/);
  assert.doesNotMatch(html, /monolith-scene/);
});

test("renders a product route with variants and editorial details", async () => {
  const response = await render("/products/noir-card-sleeve");
  const html = await response.text();

  assert.equal(response.status, 200);
  assert.match(html, /Noir Card Sleeve/);
  assert.match(html, /Obsidian/);
  assert.match(html, /WHY IT MADE THE EDIT/);
});

test("renders a collection route from mock catalogue data", async () => {
  const response = await render("/collections/current-edit");
  const html = await response.text();

  assert.equal(response.status, 200);
  assert.match(html, /The Current Edit/);
  assert.match(html, /Six representative objects/);
  assert.match(html, /Field Light Mini/);
});

test("renders searchable catalogue results", async () => {
  const response = await render("/search?q=wallet");
  const html = await response.text();

  assert.equal(response.status, 200);
  assert.match(html, /Results for/);
  assert.match(html, /Noir Card Sleeve/);
  assert.doesNotMatch(html, /Cipher Display Mask/);
});
