import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { NextResponse } from "next/server";
import { apiError, clientKey, rateLimit, readBytes, requireOwner, requireSameOrigin } from "@/lib/store/security";
import { getStoreDb } from "@/lib/store/database";
import { StoreError } from "@/lib/store/validation";
export async function POST(request: Request) {
  try {
    requireSameOrigin(request); await requireOwner(); await rateLimit(`media:${clientKey(request)}`,50,3600);
    if(!request.headers.get("content-type")?.startsWith("multipart/form-data")) throw new StoreError("Upload an image file.");
    const body = await readBytes(request,6*1024*1024);
    const form = await new Response(new Uint8Array(body),{ headers: { "Content-Type": request.headers.get("content-type")! } }).formData();
    const file = form.get("image");
    if(!(file instanceof File) || !["image/jpeg","image/png","image/webp"].includes(file.type) || file.size>5*1024*1024) throw new StoreError("Choose a JPG, PNG or WebP image under 5 MB.");
    const image = sharp(Buffer.from(await file.arrayBuffer()),{ limitInputPixels: 24000000 });
    const metadata = await image.metadata();
    if(!["jpeg","png","webp"].includes(metadata.format ?? "") || (metadata.pages ?? 1)>1) throw new StoreError("Choose a still JPG, PNG or WebP image.");
    const bytes = await image.rotate().resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true }).webp({ quality: 85 }).toBuffer();
    const id = randomUUID(); await (await getStoreDb()).query("INSERT INTO edit_store.media(id,bytes) VALUES($1,$2)",[id,bytes]);
    return NextResponse.json({ url: `/api/store/media/${id}` });
  } catch(error) { return apiError(error); }
}
