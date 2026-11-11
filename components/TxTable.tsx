"use client";
import { useEffect, useState } from "react";
import { TOKENS } from "@/config/tokens";
import { short, solscan, usd } from "./ui";
export default function TxTable({ token, fixed }: { token: string; fixed?: "all" | "trades" }) {
  const [type, setType] = useState(fixed === "trades" ? "trades" : "all"); const [d, setD] = useState<any>(null); const [err, setErr] = useState<string>(); const [page, setPage] = useState(0);
  useEffect(() => { setPage(0); }, [token, type]);
  useEffect(() => { let dead = false; const f = async () => { try {
    const q = type === "trades" ? "all" : type; const j = await (await fetch(`/api/transactions?token=${token}&type=${q}&page=${page}`)).json();
    if (dead) return; if (j.error) { setErr(j.error); setD(null); } else { setErr(undefined); setD(type === "trades" ? { ...j, txs: j.txs.filter((x: any) => x.type !== "transfer") } : j); } } catch { if (!dead) setErr("Could not load transactions"); } };
    setD(null); f(); const i = setInterval(f, 10000); return () => { dead = true; clearInterval(i); }; }, [token, type, page]);
  return <div style={{ padding: 16 }}>
    {fixed !== "trades" && <div className="chips" style={{ padding: "0 0 10px" }}>{["all", "buy", "sell", "transfer"].map((x) => <button key={x} className={`chip ${type === x ? "on" : ""}`} onClick={() => setType(x)}>{x === "all" ? "All" : x === "transfer" ? "Transfers" : x === "buy" ? "Buys" : "Sells"}</button>)}</div>}
    {err ? <div className="err">{err}</div> : !d ? <div className="mu">Loading…</div> : !d.txs.length ? <div className="mu">No transactions found yet.</div> : <div style={{ overflowX: "auto" }}><table><thead><tr>{token === "all" && <th>Token</th>}<th>Type</th><th>Wallet</th><th>SOL</th><th>Tokens</th><th>≈ USD</th><th>Time</th><th>Status</th><th>Signature</th></tr></thead><tbody>
      {d.txs.map((x: any) => <tr key={x.signature + x.token}>{token === "all" && <td>${TOKENS.find((t) => t.id === x.token)?.ticker}</td>}<td className={x.type === "buy" ? "up" : x.type === "sell" ? "dn" : "mu"}>{x.type}</td>
        <td><a href={solscan(x.wallet)} target="_blank" rel="noreferrer">{short(x.wallet)}</a></td><td>{x.solAmount != null ? x.solAmount.toFixed(4) : "—"}</td><td>{x.tokenAmount.toLocaleString()}</td><td>{usd(x.usdValue)}</td>
        <td>{new Date(x.time).toLocaleString()}</td><td>{x.status}</td><td><a href={solscan(x.signature, "tx")} target="_blank" rel="noreferrer">{short(x.signature)}</a></td></tr>)}</tbody></table></div>}
    <div style={{ display: "flex", gap: 8, marginTop: 8, alignItems: "center" }}><button className="chip" disabled={page === 0} onClick={() => setPage(page - 1)}>Prev</button><button className="chip" disabled={!d || (page + 1) * 25 >= d.total} onClick={() => setPage(page + 1)}>Next</button><span className="mu">{d?.note}</span></div></div>;
}
