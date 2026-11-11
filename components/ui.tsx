import type { TokenConfig } from "@/config/tokens";
export const usd = (n?: number | null) => n == null ? "—" : n >= 1e9 ? `$${(n / 1e9).toFixed(2)}B` : n >= 1e6 ? `$${(n / 1e6).toFixed(2)}M` : n >= 1e3 ? `$${(n / 1e3).toFixed(2)}K` : `$${n < 1 ? n.toPrecision(4) : n.toFixed(2)}`;
export const NA = <span className="mu" title="Unavailable">—</span>;
export const Pc = ({ n }: { n?: number | null }) => n == null ? NA : <span className={n >= 0 ? "up" : "dn"}>{n >= 0 ? "▲" : "▼"} {Math.abs(n).toFixed(2)}%</span>;
export const Dot = ({ t, big }: { t: Pick<TokenConfig, "color" | "symbol"> & { logoUrl?: string | null }; big?: boolean }) => <span className="dot" style={{ background: t.color, width: big ? 34 : 22, height: big ? 34 : 22 }}>{t.logoUrl ? <img src={t.logoUrl} alt="" /> : t.symbol}</span>;
export const short = (a: string) => `${a.slice(0, 4)}…${a.slice(-4)}`;
export const solscan = (p: string, k: "tx" | "account" | "token" = "account") => `https://solscan.io/${k}/${p}${process.env.NEXT_PUBLIC_SOLANA_NETWORK === "devnet" ? "?cluster=devnet" : ""}`;
