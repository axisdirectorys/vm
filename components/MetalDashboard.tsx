"use client";
import { useEffect, useState } from "react";
import { TOKENS } from "@/config/tokens";
import { useData, useWatchlist } from "./Data";
import { Dot, NA, Pc, short, solscan, usd } from "./ui";
import Positions from "./Positions"; import Chart from "./Chart"; import GrowthChart from "./GrowthChart"; import TradePanel from "./TradePanel"; import TxTable from "./TxTable";
const Link = ({ h, c }: { h?: string | null; c: string }) => h ? <a className="chip" href={h} target="_blank" rel="noreferrer">{c}</a> : null;
export default function MetalDashboard({ initial }: { initial: string }) {
  const [sel, setSel] = useState(initial); const { market, meta, marketErr } = useData(); const { w, toggle } = useWatchlist();
  const [h, setH] = useState<{ holders?: any[]; error?: string; total?: number; supply?: number; truncated?: boolean; note?: string }>({}); const [tab, setTab] = useState("Holders"); const [info, setInfo] = useState(true);
  useEffect(() => { setH({}); fetch(`/api/holders?token=${sel}`).then((r) => r.json()).then(setH).catch(() => setH({ error: "Holder data unavailable" })); }, [sel]);
  const t = TOKENS.find((x) => x.id === sel)!, m = meta.find((x) => x.id === sel), row = market.find((r) => r.id === sel);
  const mint = m?.mint ?? t.mint, tk = { ...t, name: m?.name ?? t.name, ticker: m?.ticker ?? t.ticker, mint };
  const why = row?.status === "no_mint" ? "Mint address not configured yet. :( Set it in .env.local or /admin." : row?.status === "no_pair" ? "No trading pool found on DexScreener yet." : row?.status === "error" ? row.error : marketErr;
  const r = m?.reserve;
  return <><div className="metals">{TOKENS.map((k) => { const x = market.find((y) => y.id === k.id); const mm = meta.find((y) => y.id === k.id);
    return <button key={k.id} className={`m ${k.id === sel ? "on" : ""}`} onClick={() => { setSel(k.id); setTab("Holders"); }}><Dot t={{ ...k, logoUrl: mm?.logoUrl }} /><b>${mm?.ticker ?? k.ticker}</b><span>{usd(x?.priceUsd)}</span><Pc n={x?.change24h} /></button>; })}</div>
  <div className="layout"><div className="l">
    <div className="hd"><Dot t={{ ...t, logoUrl: m?.logoUrl }} big /><div><b style={{ fontSize: 18 }}>{tk.name}</b><small>${tk.ticker} · Solana</small></div>
      <div><small>Price</small><b>{usd(row?.priceUsd)}</b></div><div><small>Market cap</small><b>{usd(row?.marketCap)}</b></div><div><small>24h volume</small><b>{usd(row?.volume24h)}</b></div>
      <div><small>Liquidity</small><b>{usd(row?.liquidityUsd)}</b></div><div><small>Holders</small><b>{h.total != null ? `${h.total.toLocaleString()}${h.truncated ? "+" : ""}` : m?.holdersCount?.toLocaleString() ?? "—"}</b></div><div><small>7d</small><b><Pc n={row?.change7d} /></b></div><div><small>24h</small><b><Pc n={row?.change24h} /></b></div>
      <button className="chip" onClick={() => toggle(sel)}>{w.includes(sel) ? "★ Watching" : "☆ Watch"}</button></div>
    {why && <div className="err" style={{ padding: "0 16px" }}>{why}</div>}
    <Chart token={sel} />
    <div className="tabs">{["Holders", "Activity", "Trades", "Reserves"].map((x) => <button key={x} className={tab === x ? "on" : ""} onClick={() => setTab(x)}>{x}</button>)}</div>
    {tab === "Holders" && <div style={{ padding: 16 }}>
      {h.error ? <div className="err">{h.error}</div> : !h.holders ? <div className="mu">Loading…</div> : <><div className="mu" style={{ marginBottom: 8 }}>{h.total?.toLocaleString()}{h.truncated ? "+" : ""} holders</div><div style={{ overflowX: "auto" }}><table><thead><tr><th>Owner</th><th>Amount</th><th>% supply</th><th>Label</th></tr></thead><tbody>{h.holders.slice(0, 10).map((x) => <tr key={x.owner}>
        <td><a href={solscan(x.owner)} target="_blank" rel="noreferrer">{short(x.owner)}</a></td><td>{x.amount.toLocaleString()}</td><td><span className="bar" style={{ width: Math.min(100, x.pct * 2) }} />{x.pct.toFixed(2)}%</td><td>{x.label ? <span className="badge">{x.label}</span> : <span className="mu">Wallet</span>}</td></tr>)}</tbody></table></div></>}
      <p className="mu" style={{ margin: "8px 0" }}>{h.note ?? "Labels are shown only when known."}</p>
      <b>Holder growth (30 days)</b><div style={{ marginTop: 8 }}><GrowthChart token={sel} days={30} /></div>
      {mint && <a className="chip" style={{ display: "inline-block", marginTop: 8 }} href={`https://app.bubblemaps.io/sol/token/${mint}`} target="_blank" rel="noreferrer">Generate bubble map (Bubblemaps)</a>}</div>}
    {tab === "Activity" && <TxTable token={sel} fixed="all" />}
    {tab === "Trades" && <TxTable token={sel} fixed="trades" />}
    {tab === "Reserves" && <div style={{ padding: 16 }}>{!r ? <div className="card"><b>No reserve data</b><p className="mu">No reserve information has been entered or verified for {tk.name}. Nothing is claimed as backed.</p></div> :
      <div className="card"><div className="kv"><span>Metal</span><b>{r.metal}</b></div><div className="kv"><span>Physical reserve</span><b>{r.amount != null ? `${r.amount} ${r.unit ?? ""}` : "—"}</b></div><div className="kv"><span>Valuation</span><b>{usd(r.valuationUsd != null ? Number(r.valuationUsd) : null)}</b></div>
        <div className="kv"><span>Backing ratio</span><b>{r.backingRatio ?? "—"}</b></div><div className="kv"><span>Custodian</span><b>{r.custodian ?? "—"}</b></div><div className="kv"><span>Last update</span><b>{new Date(r.at).toLocaleString()}</b></div>
        <div className="kv"><span>Status</span><b className={r.status === "VERIFIED" ? "up" : "mu"}>{r.status}</b></div>
        {r.documents?.map((d: any) => <div key={d.id}><a className="chip" href={d.url} target="_blank" rel="noreferrer">{d.kind}: {d.title}</a></div>)}
        {r.status !== "VERIFIED" && <p className="mu">Unverified: figures are as reported by the administrator and have not been independently confirmed.</p>}</div>}</div>}
  </div>
  <div><Positions compact current={sel} /><TradePanel t={tk} row={row} />
    <div className="r" style={{ paddingTop: 0 }}><div className="card"><button className="chip" onClick={() => setInfo(!info)}>{info ? "Hide" : "Show"} token info</button>{info && <>
      <p className="mu" style={{ margin: "8px 0" }}>{m?.description ?? "No description set (add one in /admin)."}</p>
      <div className="kv"><span>Network</span><b>Solana</b></div><div className="kv"><span>Mint</span><b>{mint ? <a href={solscan(mint, "token")} target="_blank" rel="noreferrer">{short(mint)}</a> : "Not set"}</b></div>
      <div className="kv"><span>Decimals</span><b>{row?.decimals ?? m?.decimals ?? "—"}</b></div><div className="kv"><span>Total supply</span><b>{h.supply?.toLocaleString() ?? m?.totalSupply ?? "—"}</b></div><div className="kv"><span>Circulating</span><b>{m?.circulating ?? "—"}</b></div>
      <div className="kv"><span>Holders</span><b>{h.total != null ? `${h.total.toLocaleString()}${h.truncated ? "+" : ""}` : m?.holdersCount?.toLocaleString() ?? "—"}</b></div><div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}><Link h={m?.website} c="Website" /><Link h={m?.twitter} c="X / Twitter" /><Link h={m?.telegram} c="Telegram" />{mint && <Link h={solscan(mint, "token")} c="Solscan" />}</div></>}</div></div></div></div></>;
}
