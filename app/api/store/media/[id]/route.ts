import { z } from "zod";
import { getStoreDb } from "@/lib/store/database";
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const parsed = z.uuid().safeParse((await context.params).id);
  if(!parsed.success) return new Response("Not found",{ status: 404 });
  try {
    const { rows } = await (await getStoreDb()).query<{ bytes: Uint8Array }>("SELECT bytes FROM edit_store.media WHERE id=$1",[parsed.data]);
    if(!rows.length) return new Response("Not found",{ status: 404 });
    return new Response(new Uint8Array(rows[0].bytes),{ headers: { "Content-Type": "image/webp", "Cache-Control": "public,max-age=31536000,immutable", "X-Content-Type-Options": "nosniff" } });
  } catch { return new Response("Image unavailable",{ status: 503 }); }
}
