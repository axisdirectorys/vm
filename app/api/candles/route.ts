import { z } from "zod";
import { getMarket } from "@/lib/market";
import { getJson, cached } from "@/lib/cache";
import { getTokens } from "@/lib/tokens";
export const dynamic = "force-dynamic";
const TF: Record<string, [string, number]> = { "1m": ["minute", 1], "5m": ["minute", 5], "15m": ["minute", 15], "30m": ["minute", 30], "1h": ["hour", 1], "4h": ["hour", 4], "1d": ["day", 1], "1w": ["day", 7] };
const q = z.object({ token: z.string(), tf: z.string().refine((v) => v in TF) });
export async function GET(req: Request) {
  const p = q.safeParse(Object.fromEntries(new URL(req.url).searchParams));
  if (!p.success) return Response.json({ error: "Invalid parameters" }, { status: 400 });
  const t = (await getTokens()).find((x) => x.id === p.data.token);
  if (!t?.mint) return Response.json({ error: "Mint address not configured" }, { status: 404 });
  const row = (await getMarket()).find((r) => r.id === t.id);
  if (!row?.pair) return Response.json({ error: "No trading pool found yet" }, { status: 404 });
  const [unit, agg] = TF[p.data.tf];
  try {
    const j = await cached(`c:${row.pair}:${p.data.tf}`, 20_000, () => getJson<{ data: { attributes: { ohlcv_list: number[][] } } }>(
      `https://api.geckoterminal.com/api/v2/networks/solana/pools/${row.pair}/ohlcv/${unit}?aggregate=${agg}&limit=500`));
    const c = j.data.attributes.ohlcv_list.map(([time, open, high, low, close, volume]) => ({ time, open, high, low, close, volume })).sort((a, b) => a.time - b.time);
    return Response.json({ candles: c, source: "GeckoTerminal" });
  } catch (e) { return Response.json({ error: `Candle provider unavailable: ${(e as Error).message}` }, { status: 502 }); }
}
