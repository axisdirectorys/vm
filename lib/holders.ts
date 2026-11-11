import { cached } from "./cache";
import { db } from "./db";
import { rpc } from "./rpc";
const SYS = "11111111111111111111111111111111";
const BURN: Record<string, string> = { "1nc1nerator11111111111111111111111111111111": "Burn address", [SYS]: "System program (burn)" };
export interface Holder { owner: string; amount: number; pct: number; label?: string; kind?: string }
export interface HolderData { total: number; truncated: boolean; supply: number; holders: Holder[]; note: string }
const MAX_PAGES = 10; // 10,000 token accounts; beyond that the count shows as "N+"
export const getHolders = (mint: string, pair?: string) => cached<HolderData>(`h2:${mint}`, 300_000, async () => {
  const sup = await rpc<{ value: { amount: string; decimals: number; uiAmount: number } }>("getTokenSupply", [mint]);
  const dec = sup.value.decimals, supplyRaw = Number(sup.value.amount);
  const by = new Map<string, number>(); let truncated = false;
  for (let p = 1; p <= MAX_PAGES; p++) {
    const r = await rpc<{ token_accounts: { owner: string; amount: number }[] }>("getTokenAccounts", { mint, page: p, limit: 1000 });
    const a = r.token_accounts ?? []; for (const x of a) if (x.amount > 0) by.set(x.owner, (by.get(x.owner) ?? 0) + x.amount);
    if (a.length < 1000) break; if (p === MAX_PAGES) truncated = true;
  }
  const top = [...by.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20);
  const labels = new Map<string, { label: string; kind: string }>();
  if (db) try { for (const l of await db.walletLabel.findMany({ where: { address: { in: top.map((t) => t[0]) } } })) labels.set(l.address, { label: l.label, kind: l.kind }); } catch {}
  const infos = await rpc<{ value: ({ owner: string } | null)[] }>("getMultipleAccounts", [top.map((t) => t[0]), { encoding: "base64", dataSlice: { offset: 0, length: 0 } }]).catch(() => null);
  const holders = top.map(([owner, raw], i) => {
    let l = labels.get(owner); if (!l && BURN[owner]) l = { label: BURN[owner], kind: "burn" }; if (!l && pair && owner === pair) l = { label: "Liquidity pool", kind: "pool" };
    const inf = infos?.value[i]; if (!l && inf && inf.owner !== SYS) l = { label: "Program-owned (likely pool or vault)", kind: "program" };
    return { owner, amount: raw / 10 ** dec, pct: supplyRaw ? (raw / supplyRaw) * 100 : 0, label: l?.label, kind: l?.kind };
  });
  return { total: by.size, truncated, supply: sup.value.uiAmount, holders, note: "Owners are aggregated across their token accounts. Labels come from admin entries, known burn addresses and a program-owned heuristic." };
});
