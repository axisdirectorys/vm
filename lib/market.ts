import { cached, getJson } from "./cache";
import { rpc, rpcUrl } from "./rpc";
import { getTokens } from "./tokens";
export interface MarketRow {
  id: string; mint: string | null; status: "ok" | "no_mint" | "no_pair" | "error";
  priceUsd?: number; change1h?: number; change6h?: number; change24h?: number; change7d?: number | null;
  volume24h?: number; liquidityUsd?: number; marketCap?: number; pair?: string; decimals?: number; error?: string;
}
interface DexPair { baseToken: { address: string }; pairAddress: string; priceUsd?: string; priceChange?: { h1?: number; h6?: number; h24?: number }; volume?: { h24?: number }; liquidity?: { usd?: number }; marketCap?: number; fdv?: number }
export const hourly = (pair: string) => cached(`hr:${pair}`, 600_000, async () => {
  const j = await getJson<{ data: { attributes: { ohlcv_list: number[][] } } }>(`https://api.geckoterminal.com/api/v2/networks/solana/pools/${pair}/ohlcv/hour?aggregate=1&limit=1000`);
  return j.data.attributes.ohlcv_list.map(([time, , , , close]) => ({ time, close })).sort((a, b) => a.time - b.time);
});
async function change7d(pair: string, price: number): Promise<number | null> {
  try { const c = await hourly(pair); const t = Date.now() / 1000 - 7 * 86400; const past = [...c].reverse().find((k) => k.time <= t);
    // Only report when the pool has at least 7 days of history.
    return past && past.close > 0 ? ((price / past.close) - 1) * 100 : null; } catch { return null; }
}
export async function getMarket(): Promise<MarketRow[]> {
  return cached("market", 15_000, async () => {
    const tokens = await getTokens(); const mints = tokens.map((t) => t.mint).filter(Boolean) as string[];
    let pairs: DexPair[] = []; let err: string | undefined;
    if (mints.length) { try { pairs = await getJson<DexPair[]>(`https://api.dexscreener.com/tokens/v1/solana/${mints.join(",")}`); } catch (e) { err = (e as Error).message; } }
    return Promise.all(tokens.map(async (t): Promise<MarketRow> => {
      if (!t.mint) return { id: t.id, mint: null, status: "no_mint" };
      if (err) return { id: t.id, mint: t.mint, status: "error", error: err };
      const best = pairs.filter((p) => p.baseToken.address === t.mint).sort((a, b) => (b.liquidity?.usd ?? 0) - (a.liquidity?.usd ?? 0))[0];
      if (!best) return { id: t.id, mint: t.mint, status: "no_pair" };
      const price = Number(best.priceUsd);
      const decimals = rpcUrl() ? await cached(`dec:${t.mint}`, 3_600_000, async () => (await rpc<{ value: { decimals: number } }>("getTokenSupply", [t.mint])).value.decimals).catch(() => undefined) : undefined;
      return { id: t.id, mint: t.mint, status: "ok", priceUsd: price, change1h: best.priceChange?.h1, change6h: best.priceChange?.h6, change24h: best.priceChange?.h24, change7d: await change7d(best.pairAddress, price),
        volume24h: best.volume?.h24, liquidityUsd: best.liquidity?.usd, marketCap: best.marketCap ?? best.fdv, pair: best.pairAddress, decimals };
    }));
  });
}
