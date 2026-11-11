"use client";
import { useEffect, useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { TOKENS } from "@/config/tokens";
import { useData } from "@/components/Data";
import { Dot, Pc, short, usd } from "@/components/ui";
import Positions from "@/components/Positions";
const PROGS = ["TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA", "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"];
export default function Portfolio() {
  const { connection } = useConnection(); const { publicKey } = useWallet(); const { market, meta } = useData();
  const [addr, setAddr] = useState(""); const [view, setView] = useState<PublicKey | null>(null); const [data, setData] = useState<{ sol: number; bal: Record<string, number> } | null>(null); const [err, setErr] = useState<string>();
  const key = view ?? publicKey; const live = !view && !!publicKey;
  useEffect(() => { setData(null); setErr(undefined); if (!key) return; let dead = false; (async () => { try {
    const sol = (await connection.getBalance(key)) / 1e9; const bal: Record<string, number> = {};
    for (const p of PROGS) { const r = await connection.getParsedTokenAccountsByOwner(key, { programId: new PublicKey(p) });
      for (const a of r.value) { const i = a.account.data.parsed.info; const t = TOKENS.find((x) => (meta.find((m) => m.id === x.id)?.mint ?? x.mint) === i.mint); if (t) bal[t.id] = (bal[t.id] ?? 0) + (i.tokenAmount.uiAmount ?? 0); } }
    if (!dead) setData({ sol, bal }); } catch (e) { if (!dead) setErr("Could not load wallet data: " + (e as Error).message); } })(); return () => { dead = true; }; }, [key, connection, meta]);
  const rows = TOKENS.map((t) => { const x = market.find((r) => r.id === t.id); const b = data?.bal[t.id] ?? 0; return { ...t, logoUrl: meta.find((m) => m.id === t.id)?.logoUrl, b, x, val: x?.priceUsd != null ? b * x.priceUsd : null }; });
  const metals = rows.reduce((a, r) => a + (r.val ?? 0), 0); const pie = rows.filter((r) => (r.val ?? 0) > 0);
  const change = metals > 0 ? rows.reduce((a, r) => a + ((r.val ?? 0) * (r.x?.change24h ?? 0)) / 100 / (1 + (r.x?.change24h ?? 0) / 100), 0) : null;
  return <div className="page"><h1>Portfolio</h1>
    <div className="chips" style={{ padding: "0 0 12px" }}><input className="sel" style={{ minWidth: 280 }} placeholder="View any public wallet address (read-only)" value={addr} onChange={(e) => setAddr(e.target.value)} aria-label="Wallet address" />
      <button className="chip" onClick={() => { try { setView(new PublicKey(addr.trim())); } catch { setErr("Invalid address"); } }}>View</button>{view && <button className="chip" onClick={() => { setView(null); setAddr(""); }}>Clear</button>}</div>
    {!key ? <div className="card">Connect a wallet or paste an address to see real balances.</div> : <>
      <div className="mu" style={{ marginBottom: 8 }}>{live ? "Live wallet" : "View-only mode"}: {short(key.toBase58())}</div>
      {err && <div className="err">{err}</div>}
      <Positions address={key.toBase58()} />
      {!data && !err ? <div className="mu">Loading…</div> : data && <>
        <div className="grid"><div className="card"><span className="mu">Virtual Metals value</span><b>{usd(metals)}</b></div><div className="card"><span className="mu">SOL balance</span><b>{data.sol.toFixed(4)}</b></div><div className="card"><span className="mu">≈ 24h change (metals)</span><b>{change != null ? `${change >= 0 ? "+" : "-"}${usd(Math.abs(change))}` : "—"}</b></div></div>
        <div className="grid" style={{ gridTemplateColumns: "minmax(260px,1fr) 2fr" }}><div className="card" style={{ height: 260 }}>{pie.length ? <ResponsiveContainer><PieChart><Pie data={pie} dataKey="val" nameKey="name" innerRadius={50} outerRadius={90}>{pie.map((p) => <Cell key={p.id} fill={p.color} />)}</Pie><Tooltip formatter={(v: any) => usd(Number(v))} /></PieChart></ResponsiveContainer> : <div className="mu">No Virtual Metals held.</div>}</div>
          <div className="card" style={{ overflowX: "auto" }}><table><thead><tr><th>Asset</th><th>Ticker</th><th>Balance</th><th>Price</th><th>Value</th><th>24h</th></tr></thead><tbody>{rows.map((r) => <tr key={r.id}><td><Dot t={r} /> {r.name}</td><td>${r.ticker}</td><td>{r.b.toLocaleString()}</td><td>{usd(r.x?.priceUsd)}</td><td>{usd(r.val)}</td><td><Pc n={r.x?.change24h} /></td></tr>)}</tbody></table></div></div></>}</>}</div>;
}
