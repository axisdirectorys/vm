import { SOL_MINT } from "@/config/tokens";
import { cached, getJson } from "./cache";
import { getMarket } from "./market";
import { getTokens } from "./tokens";
export interface Tx { signature: string; token: string; wallet: string; type: "buy" | "sell" | "transfer"; tokenAmount: number; solAmount?: number; usdValue?: number; time: number; status: "confirmed" }
export const heliusHost = () => `https://api${process.env.NEXT_PUBLIC_SOLANA_NETWORK === "devnet" ? "-devnet" : ""}.helius.xyz`;
const fetchAddr = (a: string) => cached(`tx:${a}`, 15_000, () => getJson<any[]>(`${heliusHost()}/v0/addresses/${a}/transactions?api-key=${process.env.HELIUS_API_KEY}&limit=50`));
export type C = { time: number; close: number }[];
export const candles = (pair: string, unit: "minute" | "hour" | "day") => cached<C>(`pc:${pair}:${unit}`, unit === "minute" ? 60_000 : unit === "hour" ? 600_000 : 3_600_000, async () => {
  const j = await getJson<{ data: { attributes: { ohlcv_list: number[][] } } }>(`https://api.geckoterminal.com/api/v2/networks/solana/pools/${pair}/ohlcv/${unit}?aggregate=1&limit=1000`);
  return j.data.attributes.ohlcv_list.map(([time, , , , close]) => ({ time, close })).sort((a, b) => a.time - b.time);
}).catch(() => [] as C);
// Price at trade time from the pool's own candles (minute candles for recent trades, hourly for older). Never the current price.
export function at(c: C, ts: number, step: number) { if (!c.length || ts < c[0].time) return undefined; let k: { time: number; close: number } | undefined; for (const x of c) { if (x.time <= ts) k = x; else break; } return k && ts - k.time <= step * 2 ? k.close : undefined; }
function parse(tx: any, id: string, mint: string, px: (ts: number) => number | undefined): Tx | null {
  const tt = (tx.tokenTransfers ?? []).filter((x: any) => x.mint === mint); if (!tt.length) return null;
  const p = tx.feePayer; const rec = tt.find((x: any) => x.toUserAccount === p), sent = tt.find((x: any) => x.fromUserAccount === p);
  const swap = tx.type === "SWAP"; const type = swap ? (rec ? "buy" : sent ? "sell" : "transfer") : "transfer";
  const amt = (rec ?? sent ?? tt[0]).tokenAmount as number; let sol: number | undefined;
  if (swap && type !== "transfer") {
    const dir = (x: any) => (type === "buy" ? x.fromUserAccount === p : x.toUserAccount === p);
    const w = (tx.tokenTransfers ?? []).filter((x: any) => x.mint === SOL_MINT && dir(x)).reduce((a: number, x: any) => a + x.tokenAmount, 0);
    const n = (tx.nativeTransfers ?? []).filter(dir).reduce((a: number, x: any) => a + x.amount, 0) / 1e9; sol = w || (n > 0.001 ? n : undefined);
  }
  const price = px(tx.timestamp);
  return { signature: tx.signature, token: id, wallet: p, type, tokenAmount: amt, solAmount: sol, usdValue: price != null ? amt * price : undefined, time: tx.timestamp * 1000, status: "confirmed" };
}
export async function getTxs(tokenId?: string): Promise<Tx[]> {
  if (!process.env.HELIUS_API_KEY) throw new Error("HELIUS_API_KEY is not set");
  const market = await getMarket(); const out = new Map<string, Tx>();
  for (const t of (await getTokens()).filter((x) => x.mint && (!tokenId || x.id === tokenId))) {
    const m = market.find((r) => r.id === t.id);
    const [cm, ch, cd] = m?.pair ? await Promise.all([candles(m.pair, "minute"), candles(m.pair, "hour"), candles(m.pair, "day")]) : [[], [], []] as [C, C, C];
    const px = (ts: number) => at(cm, ts, 60) ?? at(ch, ts, 3600) ?? at(cd, ts, 86400);
    for (const r of await Promise.allSettled([m?.pair, t.mint!].filter(Boolean).map((a) => fetchAddr(a as string)))) if (r.status === "fulfilled")
      for (const tx of r.value) { const p = parse(tx, t.id, t.mint!, px); if (p && !out.has(p.signature + t.id)) out.set(p.signature + t.id, p); }
  }
  return [...out.values()].sort((a, b) => b.time - a.time);
}
