import { rpcUrl } from "@/lib/rpc";
export const dynamic = "force-dynamic";
const ALLOWED = new Set(["getLatestBlockhash","getBalance","getSignatureStatuses","sendTransaction","getTokenAccountsByOwner","getParsedTokenAccountsByOwner","getAccountInfo","getTransaction","simulateTransaction","getBlockHeight","getSlot","getVersion","getMinimumBalanceForRentExemption","getFeeForMessage","isBlockhashValid","getRecentBlockhash"]);
// Allow-listed JSON-RPC proxy: keeps the Helius key server-side.
export async function POST(req: Request) {
  const url = rpcUrl(); if (!url) return Response.json({ error: "HELIUS_API_KEY is not set" }, { status: 503 });
  const b = await req.json().catch(() => null);
  const calls = Array.isArray(b) ? b : [b];
  if (!calls.length || calls.length > 10 || calls.some((c) => !c || !ALLOWED.has(c.method))) return Response.json({ error: "Method not allowed" }, { status: 403 });
  const r = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(b) });
  return new Response(await r.text(), { status: r.status, headers: { "content-type": "application/json" } });
}
