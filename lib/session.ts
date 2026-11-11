import crypto from "crypto";
import { cookies } from "next/headers";
import { db } from "./db";
const secret = () => { const s = process.env.ADMIN_SESSION_SECRET; if (!s || s.length < 16) throw new Error("ADMIN_SESSION_SECRET is not set"); return s; };
const b64 = (s: string) => Buffer.from(s).toString("base64url");
export function sign(p: object, ttlSec: number) {
  const body = b64(JSON.stringify({ ...p, exp: Date.now() + ttlSec * 1000 }));
  return `${body}.${crypto.createHmac("sha256", secret()).update(body).digest("base64url")}`;
}
export function verify<T>(tok?: string): (T & { exp: number }) | null {
  if (!tok) return null; const [body, mac] = tok.split("."); if (!body || !mac) return null;
  const good = crypto.createHmac("sha256", secret()).update(body).digest("base64url");
  if (mac.length !== good.length || !crypto.timingSafeEqual(Buffer.from(mac), Buffer.from(good))) return null;
  const p = JSON.parse(Buffer.from(body, "base64url").toString()); return p.exp > Date.now() ? p : null;
}
export type Role = "VIEWER" | "EDITOR" | "OWNER";
const rank = { VIEWER: 1, EDITOR: 2, OWNER: 3 };
export const allowlist = () => (process.env.ADMIN_WALLET_ALLOWLIST ?? "").split(",").map((s) => s.trim()).filter(Boolean);
export async function roleFor(wallet: string): Promise<Role | null> {
  if (allowlist().includes(wallet)) return "OWNER";
  const a = db ? await db.admin.findUnique({ where: { wallet } }) : null; return (a?.role as Role) ?? null;
}
export async function getAdmin(min: Role = "VIEWER") {
  const s = verify<{ wallet: string }>((await cookies()).get("vm_admin")?.value); if (!s) return null;
  const role = await roleFor(s.wallet); // re-checked every request, so revoked admins lose access immediately
  return role && rank[role] >= rank[min] ? { wallet: s.wallet, role } : null;
}
export async function audit(wallet: string, action: string, target?: string, detail?: object) {
  await db?.auditLog.create({ data: { adminWallet: wallet, action, target, detail: detail as any } }).catch(() => {});
}
