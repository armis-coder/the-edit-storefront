import { Pool } from "pg";
import { storeSchema } from "./schema";
import { defaultSettings, initialCollections } from "./validation";

export interface Database {
  query<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<{ rows: T[] }>;
  transaction<T>(fn: (db: Database) => Promise<T>): Promise<T>;
}

const globalDb = globalThis as unknown as { editDb?: Promise<Database> };

export async function getStoreDb(): Promise<Database> {
  if (!globalDb.editDb) globalDb.editDb = connect().catch((error) => { delete globalDb.editDb; throw error; });
  return globalDb.editDb;
}

async function connect(): Promise<Database> {
  let db: Database;
  if (process.env.DATABASE_URL) {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 2, connectionTimeoutMillis: 8000, idleTimeoutMillis: 10000 });
    const adapt = (client: { query: Pool["query"] }): Database => ({
      query: async <T>(sql: string, params: unknown[] = []) => ({ rows: (await client.query(sql, params)).rows as T[] }),
      transaction: async (fn) => {
        const connection = await pool.connect();
        try { await connection.query("BEGIN"); await connection.query("SET LOCAL statement_timeout = '10s'"); const value = await fn(adapt(connection)); await connection.query("COMMIT"); return value; }
        catch (error) { await connection.query("ROLLBACK"); throw error; }
        finally { connection.release(); }
      },
    });
    db = adapt(pool);
  } else if (process.env.STORE_DEVELOPMENT_DB && process.env.NODE_ENV !== "production" && !process.env.VERCEL) {
    const { PGlite } = await import("@electric-sql/pglite");
    const local = new PGlite(process.env.STORE_DEVELOPMENT_DB === "memory" ? undefined : process.env.STORE_DEVELOPMENT_DB);
    const adapt = (client: Pick<typeof local, "query">): Database => ({
      query: async <T>(sql: string, params: unknown[] = []) => client.query<T>(sql, params),
      transaction: (fn) => local.transaction((tx) => fn(adapt(tx))),
    });
    db = adapt(local);
  } else throw new Error("Connect DATABASE_URL before enabling the independent store.");

  await db.transaction(async (tx) => {
    // Multiple server instances may start together. Initialize the schema once at a time.
    await tx.query("SELECT pg_advisory_xact_lock(749200)");
    for (const statement of storeSchema.split(";").map((s) => s.trim()).filter(Boolean)) await tx.query(statement);
    await tx.query("INSERT INTO edit_store.settings(id,data) VALUES (1,$1) ON CONFLICT DO NOTHING", [JSON.stringify(defaultSettings)]);
    for (const collection of initialCollections) await tx.query("INSERT INTO edit_store.collections(handle,data) VALUES ($1,$2) ON CONFLICT DO NOTHING", [collection.handle, JSON.stringify(collection)]);
  });
  return db;
}
