"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { TOKENS } from "@/config/tokens";
import { useBalances } from "./Balances";
import { useData } from "./Data";
import { Dot, NA, usd } from "./ui";
const sg = (n: number | null | undefined) => (n == null ? "—" : `${n >= 0 ? "+" : "-"}${usd(Math.abs(n))}`);
const sp = (n: number | null | undefined) => (n == null ? "" : `${n >= 0 ? "+" : "-"}${Math.abs(n).toFixed(2)}%`);
const cl = (n: number | null | undefined) => (n == null ? "mu" : n >= 0 ? "up" : "dn");
export default function Positions({ address, compact, current }: { address?: string; compact?: boolean; current?: string }) {
  const { publicKey } = useWallet(); const bal = useBalances(); const { meta } = useData(); const addr = address ?? publicKey?.toBase58();
  const [d, setD] = useState<any>(null); const [err, setErr] = useState<string>();
  useEffect(() => { setD(null); setErr(undefined); if (!addr) return; let dead = false;
    const f = async () => { try { const r = await fetch(`/api/positions?wallet=${addr}${bal.version > 0 ? "&fresh=1" : ""}`); const j = await r.json(); if (dead) return; r.ok ? (setD(j), setErr(undefined)) : setErr(j.error); } catch { if (!dead) setErr("Could not load positions"); } };
    f(); const i = setInterval(f, 30000); return () => { dead = true; clearInterval(i); }; }, [addr, bal.version]);
  const T = d?.totals;
  return <div className={compact ? "r" : ""} style={compact ? { paddingBottom: 0 } : { marginBottom: 16 }}><div className="card">
    <b>Your positions</b>
    {!addr ? <p className="mu" style={{ marginTop: 6 }}>Connect a wallet to see your Virtual Metals positions.</p> : err ? <div className="err">{err}</div> : !d ? <div className="mu" style={{ marginTop: 6 }}>Loading…</div> : <>
      <div className="ptot"><div><small className="mu">Total holdings</small><b>{usd(T.value)}</b></div>
        <div><small className="mu">Up / down since entry</small><b className={cl(T.costBasis > 0 ? T.unrealizedUsd : null)}>{T.costBasis > 0 ? `${T.unrealizedUsd >= 0 ? "▲" : "▼"} ${sg(T.unrealizedUsd)} (${sp(T.unrealizedPct)})` : "—"}</b></div></div>
      {!compact && <div className="kv"><span>Realized profit (sold)</span><b className={cl(T.realizedUsd)}>{sg(T.realizedUsd)}</b></div>}
      {!compact && <div className="kv"><span>24h change in value</span><b className={cl(T.change24hUsd)}>{sg(T.change24hUsd)}</b></div>}
      {!d.positions.length ? <p className="mu">No Virtual Metals held.</p> : <div style={{ overflowX: "auto" }}><table><thead><tr><th>Token</th>{!compact && <th>Balance</th>}{!compact && <th>Avg entry</th>}<th>Value</th><th>P/L</th></tr></thead><tbody>
        {d.positions.map((p: any) => { const t = TOKENS.find((x) => x.id === p.id)!; const m = meta.find((x) => x.id === p.id);
          return <tr key={p.id} style={p.id === current ? { background: "var(--panel2)" } : undefined}><td><Link href={`/${p.id}`} style={{ display: "flex", gap: 6, alignItems: "center" }}><Dot t={{ ...t, logoUrl: m?.logoUrl }} /><b>${p.ticker}</b></Link></td>
            {!compact && <td>{p.held.toLocaleString(undefined, { maximumFractionDigits: 4 })}</td>}{!compact && <td>{p.avgEntry != null ? usd(p.avgEntry) : NA}</td>}
            <td>{usd(p.value)}</td><td className={cl(p.unrealizedUsd)}>{sg(p.unrealizedUsd)}<br /><small>{sp(p.unrealizedPct)}{p.partial ? " *" : ""}</small></td></tr>; })}</tbody></table></div>}
      <p className="mu" style={{ fontSize: 13, marginTop: 6 }}>{d.partial ? "* Partial: some of this position has no known cost (received by transfer or older than the scanned swaps), so P/L covers only the tracked part. " : ""}Estimate from {d.swapsScanned} swaps, priced from the pool at trade time.</p></>}
  </div></div>;
}
