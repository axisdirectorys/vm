import { TOKENS, TokenConfig } from "@/config/tokens";
import { db } from "./db";
// Single source of truth for mints: admin (database) values override .env values.
let c: { exp: number; v: TokenConfig[] } | null = null;
export const bustTokens = () => { c = null; };
export async function getTokens(): Promise<TokenConfig[]> {
  if (c && c.exp > Date.now()) return c.v;
  let rows: { id: string; name: string; ticker: string; mint: string | null }[] = [];
  if (db) try { rows = await db.token.findMany({ select: { id: true, name: true, ticker: true, mint: true } }); } catch {}
  const v = TOKENS.map((t) => { const r = rows.find((x) => x.id === t.id); return { ...t, name: r?.name ?? t.name, ticker: r?.ticker ?? t.ticker, mint: r?.mint || t.mint }; });
  c = { exp: Date.now() + 10_000, v }; return v;
}
