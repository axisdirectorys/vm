import { TOKENS } from "@/config/tokens";
import { db } from "@/lib/db";
export const dynamic = "force-dynamic";
export async function GET() {
  let snaps: any[] = [], meta: any[] = [], res: any[] = [], ann: any[] = [], dbOk = !!db;
  if (db) try {
    meta = await db.token.findMany();
    res = await Promise.all(TOKENS.map((t) => db!.reserveRecord.findFirst({ where: { tokenId: t.id }, orderBy: { at: "desc" }, include: { documents: true } })));
    snaps = await Promise.all(TOKENS.map((t) => db!.priceSnapshot.findFirst({ where: { tokenId: t.id, holders: { not: null } }, orderBy: { at: "desc" } })));
    ann = await db.announcement.findMany({ where: { active: true }, orderBy: { at: "desc" }, take: 3 });
  } catch { dbOk = false; }
  const tokens = TOKENS.map((t, i) => { const m = meta.find((x) => x.id === t.id);
    return { ...t, name: m?.name ?? t.name, ticker: m?.ticker ?? t.ticker, mint: m?.mint ?? t.mint, decimals: m?.decimals ?? null, description: m?.description ?? null, logoUrl: m?.logoUrl ?? null,
      website: m?.website ?? null, twitter: m?.twitter ?? null, telegram: m?.telegram ?? null, totalSupply: m?.totalSupply ?? null, circulating: m?.circulating ?? null, featured: !!m?.featured, holdersCount: snaps[i]?.holders ?? null, reserve: res[i] ?? null }; });
  return Response.json({ tokens, announcements: ann.map((a) => ({ id: a.id, text: a.text })), dbOk });
}
