import { bust, cached, getJson } from "./cache";
import { getMarket } from "./market";
import { rpc } from "./rpc";
import { getTokens } from "./tokens";
import { at, candles, heliusHost } from "./txs";
interface Ev { ts: number; side: "buy" | "sell"; amt: number }
// Cost basis is rebuilt from the wallet's own swaps (average-cost method), priced at the pool's price when each trade happened.
async function compute(wallet: string) {
  if (!process.env.HELIUS_API_KEY) throw new Error("HELIUS_API_KEY is not set");
  const tokens = (await getTokens()).filter((t) => t.mint); const market = await getMarket();
  const swaps: any[] = []; let before: string | undefined; let complete = false;
  for (let i = 0; i < 5; i++) {
    const page = await getJson<any[]>(`${heliusHost()}/v0/addresses/${wallet}/transactions?api-key=${process.env.HELIUS_API_KEY}&type=SWAP&limit=100${before ? `&before=${before}` : ""}`);
    swaps.push(...page); if (page.length < 100) { complete = true; break; } before = page[page.length - 1].signature;
  }
  swaps.sort((a, b) => a.timestamp - b.timestamp);
  const positions: any[] = []; let realizedAll = 0, valueAll = 0, costAll = 0, unrealAll = 0, change24hUsd = 0, anyPartial = !complete;
  for (const t of tokens) {
    const m = market.find((r) => r.id === t.id); if (m?.status !== "ok" || m.priceUsd == null) continue;
    const held = (await rpc<{ value: { account: { data: { parsed: { info: { tokenAmount: { uiAmount: number | null } } } } } }[] }>("getTokenAccountsByOwner", [wallet, { mint: t.mint }, { encoding: "jsonParsed" }]).catch(() => ({ value: [] }))).value.reduce((a, x) => a + (x.account.data.parsed.info.tokenAmount.uiAmount ?? 0), 0);
    const evs: Ev[] = []; for (const tx of swaps) { const tt = (tx.tokenTransfers ?? []).filter((x: any) => x.mint === t.mint); if (!tt.length) continue;
      const net = tt.filter((x: any) => x.toUserAccount === wallet).reduce((a: number, x: any) => a + x.tokenAmount, 0) - tt.filter((x: any) => x.fromUserAccount === wallet).reduce((a: number, x: any) => a + x.tokenAmount, 0);
      if (net !== 0) evs.push({ ts: tx.timestamp, side: net > 0 ? "buy" : "sell", amt: Math.abs(net) }); }
    if (!evs.length && held === 0) continue;
    const [cm, ch, cd] = m.pair ? await Promise.all([candles(m.pair, "minute"), candles(m.pair, "hour"), candles(m.pair, "day")]) : [[], [], []];
    let qty = 0, cost = 0, realized = 0, unpriced = 0;
    for (const e of evs) { const px = at(cm, e.ts, 60) ?? at(ch, e.ts, 3600) ?? at(cd, e.ts, 86400); if (px == null) { unpriced++; continue; }
      if (e.side === "buy") { qty += e.amt; cost += e.amt * px; } else { const q = Math.min(e.amt, qty), avg = qty > 0 ? cost / qty : px; realized += q * px - q * avg + (e.amt - q) * 0; cost -= q * avg; qty -= q; } }
    realizedAll += realized; if (held <= 0) continue;
    const avg = qty > 0 ? cost / qty : null; const eff = Math.min(held, qty); const costBasis = avg != null ? eff * avg : 0;
    const value = held * m.priceUsd; const unreal = avg != null ? eff * (m.priceUsd - avg) : null;
    const partial = unpriced > 0 || Math.abs(held - qty) > Math.max(held, qty) * 0.01; anyPartial ||= partial;
    valueAll += value; costAll += costBasis; if (unreal != null) unrealAll += unreal; if (m.change24h != null) change24hUsd += value - value / (1 + m.change24h / 100);
    positions.push({ id: t.id, ticker: t.ticker, held, price: m.priceUsd, value, avgEntry: avg, costBasis, unrealizedUsd: unreal, unrealizedPct: unreal != null && costBasis > 0 ? (unreal / costBasis) * 100 : null, realizedUsd: realized, change24h: m.change24h ?? null, partial, untrackedQty: Math.max(0, held - qty) });
  }
  return { wallet, positions, totals: { value: valueAll, costBasis: costAll, unrealizedUsd: unrealAll, unrealizedPct: costAll > 0 ? (unrealAll / costAll) * 100 : null, realizedUsd: realizedAll, change24hUsd }, partial: anyPartial, swapsScanned: swaps.length,
    note: "P/L is estimated from your swaps (average cost, priced from the pool at trade time). Tokens received by transfer, or swaps older than the last ~500, have no cost basis and are marked partial." };
}
export const getPositions = (wallet: string, fresh = false) => { const k = `pos:${wallet}`; if (fresh) bust(k); return cached(k, 30_000, () => compute(wallet)); };
