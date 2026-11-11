import { db } from "@/lib/db";
export const dynamic = "force-dynamic";
export async function GET(req: Request) {
  const u = new URL(req.url); const token = u.searchParams.get("token") ?? "all"; const days = Math.min(3650, Math.max(1, Number(u.searchParams.get("days") ?? 30) || 30));
  if (!db) return Response.json({ rows: [], note: "Database not configured" });
  const rows = await db.priceSnapshot.findMany({ where: { ...(token === "all" ? {} : { tokenId: token }), at: { gte: new Date(Date.now() - days * 86400_000) } }, orderBy: { at: "asc" }, take: 5000 });
  return Response.json({ rows: rows.map((r: any) => ({ tokenId: r.tokenId, at: r.at.getTime(), holders: r.holders, priceUsd: r.priceUsd, marketCap: r.marketCap, volume24h: r.volume24h, liquidityUsd: r.liquidityUsd })) });
}
