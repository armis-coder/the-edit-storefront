import { getStoreDb } from "../lib/store/database";
await getStoreDb();
console.log("Independent store schema and empty collections are ready. Checkout is closed by default.");
process.exit(0);
