import { db } from "@/lib/db";
export const dynamic = "force-dynamic";
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; if (!db || !/^[a-z0-9]{10,40}$/.test(id)) return new Response("Not found", { status: 404 });
  const f = await db.upload.findUnique({ where: { id } }); if (!f) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(f.data), { headers: { "content-type": f.mime, "x-content-type-options": "nosniff", "content-security-policy": "default-src 'none'; sandbox", "cache-control": "public, max-age=31536000, immutable", "content-disposition": "inline" } });
}
