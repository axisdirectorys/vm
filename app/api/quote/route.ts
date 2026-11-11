import { z } from "zod";
export const dynamic = "force-dynamic";
const base = () => process.env.JUPITER_API_URL ?? "https://lite-api.jup.ag/swap/v1";
const hdr = () => ({ "content-type": "application/json", ...(process.env.JUPITER_API_KEY ? { "x-api-key": process.env.JUPITER_API_KEY } : {}) });
const q = z.object({ inputMint: z.string().min(32).max(44), outputMint: z.string().min(32).max(44), amount: z.string().regex(/^\d+$/), slippageBps: z.string().regex(/^\d+$/).default("50") });
export async function GET(req: Request) {
  const p = q.safeParse(Object.fromEntries(new URL(req.url).searchParams));
  if (!p.success) return Response.json({ error: "Invalid quote request" }, { status: 400 });
  const u = new URL(`${base()}/quote`); Object.entries(p.data).forEach(([k, v]) => u.searchParams.set(k, v));
  const r = await fetch(u, { headers: hdr(), cache: "no-store" });
  const j = await r.json().catch(() => ({}));
  return Response.json(r.ok ? j : { error: j?.error ?? "No route found for this swap" }, { status: r.ok ? 200 : r.status });
}
