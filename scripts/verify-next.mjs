import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";

const origin = "http://127.0.0.1:3129";
const server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1", "--port", "3129"], { stdio: ["ignore", "pipe", "pipe"] });
let output = "";
server.stdout.on("data", data => { output += data; });
server.stderr.on("data", data => { output += data; });

try {
  let ready = false;
  for (let attempt = 0; attempt < 100; attempt++) {
    if (server.exitCode !== null) throw new Error(`Next.js exited early: ${output}`);
    if (output.includes("Ready")) { ready = true; break; }
    await delay(100);
  }
  if (!ready) throw new Error(`Next.js did not become ready: ${output}`);
  const test = spawn(process.execPath, ["--test", "tests/rendered-html.test.mjs"], {
    env: { ...process.env, STOREFRONT_TEST_URL: origin }, stdio: "inherit",
  });
  const code = await new Promise(resolve => test.on("exit", resolve));
  if (code !== 0) throw new Error("Next.js route regression tests failed");
  const paths = [
    "/", "/collections/current-edit", "/collections/everyday-carry", "/collections/time-and-carry",
    "/collections/collector-masks", "/collections/blades-and-tools", "/collections/under-3000",
    "/products/kestrel-fold-no-03", "/products/atlas-minimal-40mm", "/products/noir-card-sleeve",
    "/products/cipher-display-mask", "/products/titan-key-system", "/products/field-light-mini",
    "/search?q=wallet", "/products/missing-object", "/fonts/manrope-variable.ttf", "/product-sprite.png",
  ];
  for (const path of paths) {
    const response = await fetch(new URL(path, origin), { signal: AbortSignal.timeout(10000) });
    if (path.includes("missing-object")) {
      // Next.js can flush a loading boundary before notFound(), resulting in a
      // streamed 200 response; the not-found view and noindex must still render.
      const html = await response.text();
      if (![200, 404].includes(response.status) || !html.includes("noindex") || !html.includes("This object")) {
        throw new Error("Missing product did not render an indexed-safe not-found response");
      }
    } else {
      if (response.status !== 200) throw new Error(`${path}: ${response.status}, expected 200`);
      await response.arrayBuffer();
    }
  }
  console.log(`${paths.length} Next.js routes/assets verified`);
} catch (error) {
  console.error(error); process.exitCode = 1;
} finally {
  server.kill("SIGTERM");
}
