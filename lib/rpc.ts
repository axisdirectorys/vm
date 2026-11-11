import { getJson } from "./cache";
export function rpcUrl() {
  const k = process.env.HELIUS_API_KEY;
  if (k) return `https://${process.env.NEXT_PUBLIC_SOLANA_NETWORK === "devnet" ? "devnet" : "mainnet"}.helius-rpc.com/?api-key=${k}`;
  return null; // no key: we do not fall back silently
}
export async function rpc<T>(method: string, params: unknown): Promise<T> {
  const url = rpcUrl();
  if (!url) throw new Error("HELIUS_API_KEY is not set");
  const j = await getJson<{ result: T; error?: { message: string } }>(url, {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  if (j.error) throw new Error(j.error.message);
  return j.result;
}
