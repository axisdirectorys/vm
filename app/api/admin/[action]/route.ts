import { z } from "zod";
import nacl from "tweetnacl";
import bs58 from "bs58";
import crypto from "crypto";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { audit, getAdmin, roleFor, sign, verify } from "@/lib/session";
import { rpc } from "@/lib/rpc";
import { bustTokens, getTokens } from "@/lib/tokens";
import { TOKENS } from "@/config/tokens";
export const dynamic = "force-dynamic";
const J = (b: unknown, s = 200) => Response.json(b, { status: s });
const okUrl = (u: string) => /^https?:\/\//.test(u) || /^\/api\/files\/[a-z0-9]+$/.test(u);
const url = z.string().max(400).refine((u) => u === "" || okUrl(u)).nullable().optional();
const labelS = z.object({ address: z.string().min(32).max(44), label: z.string().min(1).max(60), kind: z.enum(["pool", "treasury", "burn", "team", "other"]) });
const num = z.number().finite().nonnegative().nullable().optional();
const tokenS = z.object({ id: z.enum(["gold", "silver", "bronze", "copper"]), name: z.string().min(1).max(60), ticker: z.string().min(1).max(10), mint: z.string().min(32).max(44).nullable().optional().or(z.literal("")),
  decimals: z.number().int().min(0).max(12).nullable().optional(), description: z.string().max(1000).nullable().optional(), logoUrl: url, website: url, twitter: url, telegram: url,
  totalSupply: z.string().max(40).nullable().optional(), circulating: z.string().max(40).nullable().optional(), featured: z.boolean().default(false) });
const reserveS = z.object({ tokenId: z.enum(["gold", "silver", "bronze", "copper"]), metal: z.string().max(30), amount: num, unit: z.string().max(20).nullable().optional(), valuationUsd: num, backingRatio: num,
  status: z.enum(["UNVERIFIED", "PENDING", "VERIFIED"]), custodian: z.string().max(120).nullable().optional(), notes: z.string().max(1000).nullable().optional(),
  documents: z.array(z.object({ title: z.string().min(1).max(120), url: z.string().max(400).refine(okUrl), kind: z.enum(["audit", "attestation", "custody", "other"]) })).max(10) });
const annS = z.object({ text: z.string().min(1).max(280), active: z.boolean().default(true) });

export async function GET(_: Request, { params }: { params: Promise<{ action: string }> }) {
  const { action } = await params;
  if (action === "nonce") { const nonce = crypto.randomBytes(16).toString("hex");
    (await cookies()).set("vm_nonce", sign({ nonce }, 300), { httpOnly: true, sameSite: "strict", secure: process.env.NODE_ENV === "production", path: "/" });
    return J({ message: `Sign in to Virtual Metals admin\nNonce: ${nonce}` }); }
  if (action === "logout") { (await cookies()).delete("vm_admin"); return J({ ok: true }); }
  const me = await getAdmin(); if (!me) return J({ error: "Not authorized" }, 401);
  if (action === "me") return J(me);
  if (action === "labels") return J({ labels: db ? await db.walletLabel.findMany({ orderBy: { at: "desc" } }) : [] });
  if (action === "audit") return J({ logs: db ? await db.auditLog.findMany({ orderBy: { at: "desc" }, take: 100 }) : [], dbOk: !!db });
  if (action === "health") {
    const t = async (f: () => Promise<unknown>) => { const s = Date.now(); try { await f(); return { ok: true, ms: Date.now() - s }; } catch (e) { return { ok: false, error: (e as Error).message }; } };
    const mint = TOKENS.find((x) => x.mint)?.mint;
    return J({ rpc: await t(() => rpc("getSlot", [])), database: await t(async () => { if (!db) throw new Error("DATABASE_URL not set"); await db.$queryRaw`SELECT 1`; }),
      dexscreener: await t(async () => { if (!mint) throw new Error("No mint configured"); const r = await fetch(`https://api.dexscreener.com/tokens/v1/solana/${mint}`); if (!r.ok) throw new Error(String(r.status)); }),
      jupiter: await t(async () => { const r = await fetch(`${process.env.JUPITER_API_URL ?? "https://lite-api.jup.ag/swap/v1"}/quote?inputMint=So11111111111111111111111111111111111111112&outputMint=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v&amount=1000000`, { headers: process.env.JUPITER_API_KEY ? { "x-api-key": process.env.JUPITER_API_KEY } : {} }); if (!r.ok) throw new Error(String(r.status)); }),
      wallets: db ? await db.wallet.count() : null }); }
  return J({ error: "Not found" }, 404);
}
export async function POST(req: Request, { params }: { params: Promise<{ action: string }> }) {
  const { action } = await params;
  if (!(req.headers.get("content-type") ?? "").includes("application/json")) return J({ error: "Bad content type" }, 415);
  const body = await req.json().catch(() => null);
  if (action === "login") {
    const p = z.object({ wallet: z.string().min(32).max(44), signature: z.string().max(200) }).safeParse(body); if (!p.success) return J({ error: "Invalid request" }, 400);
    const n = verify<{ nonce: string }>((await cookies()).get("vm_nonce")?.value); if (!n) return J({ error: "Login expired, try again" }, 401);
    try { const ok = nacl.sign.detached.verify(new TextEncoder().encode(`Sign in to Virtual Metals admin\nNonce: ${n.nonce}`), Buffer.from(p.data.signature, "base64"), bs58.decode(p.data.wallet)); if (!ok) throw 0; }
    catch { return J({ error: "Signature check failed" }, 401); }
    const role = await roleFor(p.data.wallet); if (!role) return J({ error: "This wallet is not an administrator" }, 403);
    const c = await cookies(); c.delete("vm_nonce");
    c.set("vm_admin", sign({ wallet: p.data.wallet }, 8 * 3600), { httpOnly: true, sameSite: "strict", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 8 * 3600 });
    await audit(p.data.wallet, "login"); return J({ wallet: p.data.wallet, role }); }
  const me = await getAdmin("EDITOR"); if (!me) return J({ error: "Not authorized" }, 403);
  if (!db) return J({ error: "DATABASE_URL is not set" }, 503);
  if (action === "token") { const p = tokenS.safeParse(body); if (!p.success) return J({ error: p.error.issues[0]?.message ?? "Invalid" }, 400);
    const d = { ...p.data, mint: p.data.mint || null }; let message = "Saved";
    if (d.mint) {
      if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(d.mint)) return J({ error: "Not a valid Solana address" }, 400);
      if ((await getTokens()).some((t) => t.id !== d.id && t.mint === d.mint)) return J({ error: "That mint is already used by another metal" }, 400);
      if (process.env.HELIUS_API_KEY) { try {
        const r = await rpc<{ value: { data?: { parsed?: { type: string; info: { decimals: number; supply: string } } } } | null }>("getAccountInfo", [d.mint, { encoding: "jsonParsed" }]);
        const x = r.value?.data?.parsed; if (!r.value) return J({ error: "Mint not found on this network (check NEXT_PUBLIC_SOLANA_NETWORK)" }, 400); if (x?.type !== "mint") return J({ error: "That address is not a token mint" }, 400);
        d.decimals = x.info.decimals; d.totalSupply = d.totalSupply || String(Number(x.info.supply) / 10 ** x.info.decimals); message = `Saved. Verified on-chain: ${x.info.decimals} decimals.`;
      } catch (e) { return J({ error: "Could not verify mint: " + (e as Error).message }, 502); } } else message = "Saved, but NOT verified on-chain (HELIUS_API_KEY is not set).";
    }
    await db.token.upsert({ where: { id: d.id }, create: d, update: d }); bustTokens(); await audit(me.wallet, "token.update", d.id, d); return J({ ok: true, message }); }
  if (action === "label") { const p = labelS.safeParse(body); if (!p.success) return J({ error: "Invalid label" }, 400); await db.walletLabel.upsert({ where: { address: p.data.address }, create: { ...p.data, createdBy: me.wallet }, update: p.data }); await audit(me.wallet, "label.set", p.data.address, p.data); return J({ ok: true }); }
  if (action === "label-delete") { const p = z.object({ address: z.string().max(44) }).safeParse(body); if (!p.success) return J({ error: "Invalid" }, 400); await db.walletLabel.deleteMany({ where: { address: p.data.address } }); await audit(me.wallet, "label.delete", p.data.address); return J({ ok: true }); }
  if (action === "reserve") { const p = reserveS.safeParse(body); if (!p.success) return J({ error: p.error.issues[0]?.message ?? "Invalid" }, 400);
    const { documents, tokenId, ...r } = p.data;
    if (r.status === "VERIFIED" && !documents.some((x) => x.kind === "audit" || x.kind === "attestation")) return J({ error: "VERIFIED requires an audit or attestation document" }, 400);
    await db.token.upsert({ where: { id: tokenId }, create: { id: tokenId, name: TOKENS.find((t) => t.id === tokenId)!.name, ticker: TOKENS.find((t) => t.id === tokenId)!.ticker }, update: {} });
    await db.reserveRecord.create({ data: { ...r, tokenId, updatedBy: me.wallet, documents: { create: documents } } }); await audit(me.wallet, "reserve.update", tokenId, p.data); return J({ ok: true }); }
  if (action === "announcement") { const p = annS.safeParse(body); if (!p.success) return J({ error: "Invalid" }, 400);
    await db.announcement.create({ data: { ...p.data, createdBy: me.wallet } }); await audit(me.wallet, "announcement.create", undefined, p.data); return J({ ok: true }); }
  if (action === "announcement-clear") { await db.announcement.updateMany({ data: { active: false } }); await audit(me.wallet, "announcement.clear"); return J({ ok: true }); }
  return J({ error: "Not found" }, 404);
}
