import { db } from "@/lib/db";
import { audit, getAdmin } from "@/lib/session";
export const dynamic = "force-dynamic";
const sniff = (b: Buffer) => b.subarray(0, 4).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47])) ? "image/png" : b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff ? "image/jpeg"
  : b.subarray(0, 4).toString() === "RIFF" && b.subarray(8, 12).toString() === "WEBP" ? "image/webp" : b.subarray(0, 4).toString() === "%PDF" ? "application/pdf" : null;
export async function POST(req: Request) {
  const me = await getAdmin("EDITOR"); if (!me) return Response.json({ error: "Not authorized" }, { status: 403 });
  if (!db) return Response.json({ error: "DATABASE_URL is not set" }, { status: 503 });
  const f = (await req.formData().catch(() => null))?.get("file"); if (!(f instanceof File)) return Response.json({ error: "No file" }, { status: 400 });
  const buf = Buffer.from(await f.arrayBuffer()); const mime = sniff(buf); // type decided by file contents, not the name; SVG is not allowed
  if (!mime) return Response.json({ error: "Only PNG, JPEG, WebP or PDF files are allowed" }, { status: 400 });
  if (mime === "application/pdf" ? buf.length > 4_000_000 : buf.length > 1_000_000) return Response.json({ error: mime === "application/pdf" ? "PDF must be under 4 MB" : "Image must be under 1 MB" }, { status: 400 });
  const u = await db.upload.create({ data: { name: f.name.slice(0, 120), mime, size: buf.length, data: buf, createdBy: me.wallet } });
  await audit(me.wallet, "upload", u.id, { name: f.name, mime, size: buf.length }); return Response.json({ url: `/api/files/${u.id}` });
}
