import { db } from "./db";
import { getHolders } from "./holders";
import { getMarket } from "./market";
import { getTokens } from "./tokens";
let lastTry = 0;
// Stores one row per token per ~hour: price, market cap, volume, liquidity and holder count. Powers holder growth and history.
export async function snapshotAll(force = false) {
  if (!db) return { skipped: "DATABASE_URL not set" };
  if (!force && Date.now() - lastTry < 600_000) return { skipped: "recent" }; lastTry = Date.now();
  const market = await getMarket(); let n = 0;
  for (const t of await getTokens()) {
    const m = market.find((r) => r.id === t.id); if (!t.mint || m?.status !== "ok") continue;
    const last = await db.priceSnapshot.findFirst({ where: { tokenId: t.id }, orderBy: { at: "desc" } });
    if (!force && last && Date.now() - last.at.getTime() < 55 * 60_000) continue;
    const h = await getHolders(t.mint, m.pair).catch(() => null);
    await db.token.upsert({ where: { id: t.id }, create: { id: t.id, name: t.name, ticker: t.ticker }, update: {} });
    await db.priceSnapshot.create({ data: { tokenId: t.id, priceUsd: m.priceUsd ?? 0, marketCap: m.marketCap, volume24h: m.volume24h, liquidityUsd: m.liquidityUsd, holders: h?.total } }); n++;
  }
  return { saved: n };
}
