"use client";
import Link from "next/link";
import { TOKENS } from "@/config/tokens";
import { useData, useWatchlist } from "@/components/Data";
import { Dot, Pc, usd } from "@/components/ui";
export default function Watchlist() {
  const { market, meta } = useData(); const { w, toggle } = useWatchlist(); const L = TOKENS.filter((t) => w.includes(t.id));
  return <div className="page"><h1>Watchlist</h1><p className="mu" style={{ marginBottom: 12 }}>Saved in this browser.</p>
    {!L.length ? <div className="card">Nothing saved. Open <Link className="up" href="/explore">Explore</Link> and tap ☆.</div> : <div className="grid">{L.map((t) => { const x = market.find((r) => r.id === t.id);
      return <div key={t.id} className="card"><div style={{ display: "flex", gap: 8, alignItems: "center" }}><Dot t={{ ...t, logoUrl: meta.find((m) => m.id === t.id)?.logoUrl }} /><Link href={`/${t.id}`}><b style={{ fontSize: 14 }}>{t.name}</b></Link><span className="sp" /><button onClick={() => toggle(t.id)} aria-label="Remove">★</button></div>
        <b>{usd(x?.priceUsd)}</b><Pc n={x?.change24h} /><div className="kv"><span>Mcap</span><b style={{ fontSize: 13 }}>{usd(x?.marketCap)}</b></div><div className="kv"><span>Volume</span><b style={{ fontSize: 13 }}>{usd(x?.volume24h)}</b></div></div>; })}</div>}</div>;
}
