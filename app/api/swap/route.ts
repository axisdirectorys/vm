import { z } from "zod";
export const dynamic = "force-dynamic";
const base = () => process.env.JUPITER_API_URL ?? "https://lite-api.jup.ag/swap/v1";
const body = z.object({ quoteResponse: z.record(z.unknown()), userPublicKey: z.string().min(32).max(44) });
// Builds an UNSIGNED transaction. The user's wallet signs it in the browser; we never hold keys.
export async function POST(req: Request) {
  const p = body.safeParse(await req.json().catch(() => null));
  if (!p.success) return Response.json({ error: "Invalid swap request" }, { status: 400 });
  const r = await fetch(`${base()}/swap`, { method: "POST", cache: "no-store",
    headers: { "content-type": "application/json", ...(process.env.JUPITER_API_KEY ? { "x-api-key": process.env.JUPITER_API_KEY } : {}) },
    body: JSON.stringify({ ...p.data, wrapAndUnwrapSol: true, dynamicComputeUnitLimit: true }) });
  const j = await r.json().catch(() => ({}));
  return Response.json(r.ok ? { swapTransaction: j.swapTransaction } : { error: j?.error ?? "Could not build swap" }, { status: r.ok ? 200 : r.status });
}
