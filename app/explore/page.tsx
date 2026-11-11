"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { TOKENS } from "@/config/tokens";
import { useData, useWatchlist } from "@/components/Data";
import { Dot, NA, Pc, usd } from "@/components/ui";
const cols: [string, string][] = [["mcap", "MCAP"], ["volume24h", "24H VOL"], ["liquidityUsd", "LIQUIDITY"], ["priceUsd", "PRICE"], ["change1h", "1H"], ["change6h", "6H"], ["change24h", "24H"], ["change7d", "7D"]];
export default function Explore() {
  const { market, meta, marketErr } = useData(); const { w, toggle } = useWatchlist(); const r = useRouter();
  const [q, setQ] = useState(""); const [f, setF] = useState("all"); const [sort, setSort] = useState("mcap"); const [dir, setDir] = useState(-1);
  const rows = TOKENS.map((t) => { const m = meta.find((x) => x.id === t.id); const x = market.find((y) => y.id === t.id) as any; return { ...t, name: m?.name ?? t.name, ticker: m?.ticker ?? t.ticker, featured: !!m?.featured, holdersCount: m?.holdersCount, logoUrl: m?.logoUrl, x, mcap: x?.marketCap }; })
    .filter((t) => (t.name + t.ticker).toLowerCase().includes(q.toLowerCase())).filter((t) => f === "all" || (f === "watch" && w.includes(t.id)) || (f === "up" && (t.x?.change24h ?? 0) > 0) || (f === "down" && (t.x?.change24h ?? 0) < 0) || (f === "featured" && t.featured))
    .sort((a: any, b: any) => { const g = (o: any) => (sort === "mcap" ? o.mcap : o.x?.[sort]); const av = g(a), bv = g(b); if (av == null) return 1; if (bv == null) return -1; return (av - bv) * dir; });
  return <div className="page"><h1>Explore metals</h1>{marketErr && <div className="err">{marketErr}</div>}
    <div className="chips" style={{ padding: "0 0 12px" }}><input className="sel" placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search" />{[["all", "All"], ["up", "Gainers"], ["down", "Losers"], ["featured", "Featured"], ["watch", "Watchlist"]].map(([k, l]) => <button key={k} className={`chip ${f === k ? "on" : ""}`} onClick={() => setF(k)}>{l}</button>)}</div>
    <div style={{ overflowX: "auto" }}><table><thead><tr><th>#</th><th>COIN</th>{cols.map(([k, l]) => <th key={k} className="s" onClick={() => { sort === k ? setDir(-dir) : (setSort(k), setDir(-1)); }}>{l}{sort === k ? (dir < 0 ? " ↓" : " ↑") : ""}</th>)}<th>HOLDERS</th><th></th></tr></thead><tbody>
      {rows.map((t, i) => <tr key={t.id} className="row" onClick={() => r.push(`/${t.id}`)}><td>{i + 1}</td><td><span style={{ display: "flex", gap: 10, alignItems: "center" }}><Dot t={t} big /><span><b>{t.name}</b><br /><span className="mu">${t.ticker}</span></span></span></td>
        <td>{usd(t.mcap)}</td><td>{usd(t.x?.volume24h)}</td><td>{usd(t.x?.liquidityUsd)}</td><td>{usd(t.x?.priceUsd)}</td><td><Pc n={t.x?.change1h} /></td><td><Pc n={t.x?.change6h} /></td><td><Pc n={t.x?.change24h} /></td><td><Pc n={t.x?.change7d} /></td><td>{t.holdersCount?.toLocaleString() ?? NA}</td>
        <td><button aria-label="Toggle watchlist" onClick={(e) => { e.stopPropagation(); toggle(t.id); }}>{w.includes(t.id) ? "★" : "☆"}</button></td></tr>)}
      {!rows.length && <tr><td colSpan={12} className="mu">No matches</td></tr>}</tbody></table></div>
    <p className="mu" style={{ marginTop: 8 }}>7D needs a pool with 7+ days of history. Holder counts appear after the first hourly snapshot.</p></div>;
}
