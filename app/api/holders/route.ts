import { getHolders } from "@/lib/holders";
import { getMarket } from "@/lib/market";
import { getTokens } from "@/lib/tokens";
export const dynamic = "force-dynamic";
export async function GET(req: Request) {
  const t = (await getTokens()).find((x) => x.id === new URL(req.url).searchParams.get("token"));
  if (!t?.mint) return Response.json({ error: "Mint address not configured" }, { status: 404 });
  try { const m = (await getMarket()).find((r) => r.id === t.id); return Response.json(await getHolders(t.mint, m?.pair)); }
  catch (e) { return Response.json({ error: (e as Error).message }, { status: 502 }); }
}
