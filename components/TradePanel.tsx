"use client";
import { useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { VersionedTransaction } from "@solana/web3.js";
import { SOL_MINT, TokenConfig } from "@/config/tokens";
import type { MarketRow } from "@/lib/market";
import { useBalances } from "./Balances";
const RESERVE = 0.01, HARD = 0.005; // SOL kept for fees and token-account rent
const toRaw = (s: string, d: number) => { if (!/^\d*\.?\d*$/.test(s) || s === "" || s === ".") return null; const [i, f = ""] = s.split("."); return BigInt((i || "0") + f.padEnd(d, "0").slice(0, d)).toString(); };
const fromRaw = (r: bigint, d: number) => { const s = r.toString().padStart(d + 1, "0"); const i = s.slice(0, s.length - d), f = s.slice(s.length - d).replace(/0+$/, ""); return f ? `${i}.${f}` : i; };
const fmt = (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: 6 });

export default function TradePanel({ t, row }: { t: TokenConfig; row?: MarketRow }) {
  const { connection } = useConnection(); const w = useWallet(); const bal = useBalances();
  const [side, setSide] = useState<"buy" | "sell">("buy"); const [amt, setAmt] = useState(""); const [slip, setSlip] = useState(50); const [exact, setExact] = useState<string | null>(null);
  const [quote, setQuote] = useState<any>(null); const [msg, setMsg] = useState<{ ok?: boolean; t: string } | null>(null); const [busy, setBusy] = useState(false);
  const ready = !!t.mint && row?.status === "ok" && row.decimals != null; const dec = row?.decimals ?? 0;
  const inMint = side === "buy" ? SOL_MINT : t.mint!, outMint = side === "buy" ? t.mint! : SOL_MINT; const inDec = side === "buy" ? 9 : dec, outDec = side === "buy" ? dec : 9;
  const tok = t.mint ? bal.tokens[t.mint] : undefined; const rawIn = exact ?? toRaw(amt, inDec); const hasAmt = !!rawIn && rawIn !== "0";
  let warn: string | null = null;
  if (w.connected && hasAmt) {
    if (side === "buy") { if (bal.sol != null) { const a = Number(amt); if (a > bal.sol) warn = `Not enough SOL. You have ${fmt(bal.sol)} SOL.`; else if (a > bal.sol - HARD) warn = `Leave about ${RESERVE} SOL for network fees and account rent. Try Max.`; } }
    else if (!tok || tok.raw === "0") warn = `You don't hold any $${t.ticker}.`; else if (BigInt(rawIn!) > BigInt(tok.raw)) warn = `You only hold ${fmt(tok.ui)} $${t.ticker}.`;
  }
  const pct = (p: number) => { setQuote(null); setMsg(null);
    if (side === "buy") { if (bal.lamports == null) return; const room = BigInt(Math.max(0, bal.lamports - RESERVE * 1e9)); const r = (room * BigInt(p)) / 100n; setExact(null); setAmt(r > 0n ? fromRaw(r, 9) : "0"); }
    else { if (!tok) return; const r = p === 100 ? BigInt(tok.raw) : (BigInt(tok.raw) * BigInt(p)) / 100n; setExact(p === 100 ? tok.raw : null); setAmt(fromRaw(r, dec)); } };
  async function getQuote() {
    if (!hasAmt) { setMsg({ t: "Enter an amount greater than zero." }); return null; } if (warn) { setMsg({ t: warn }); return null; }
    const r = await fetch(`/api/quote?inputMint=${inMint}&outputMint=${outMint}&amount=${rawIn}&slippageBps=${slip}`); const j = await r.json();
    if (!r.ok) { setQuote(null); setMsg({ t: j.error }); return null; } setQuote(j); setMsg(null); return j;
  }
  async function trade() {
    if (!w.publicKey || !w.signTransaction) return; setBusy(true); setMsg(null);
    try {
      const q = await getQuote(); if (!q) return;
      const r = await fetch("/api/swap", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ quoteResponse: q, userPublicKey: w.publicKey.toBase58() }) });
      const j = await r.json(); if (!r.ok) throw new Error(j.error);
      const signed = await w.signTransaction(VersionedTransaction.deserialize(Buffer.from(j.swapTransaction, "base64")));
      const sig = await connection.sendRawTransaction(signed.serialize(), { maxRetries: 3 }); setMsg({ t: `Submitted ${sig.slice(0, 8)}… waiting for confirmation` });
      for (let i = 0; i < 40; i++) { const s = (await connection.getSignatureStatuses([sig])).value[0];
        if (s?.err) throw new Error("Transaction failed on-chain");
        if (s?.confirmationStatus === "confirmed" || s?.confirmationStatus === "finalized") { setMsg({ ok: true, t: `Confirmed: ${sig}` }); setAmt(""); setExact(null); setQuote(null); bal.refresh(); return; }
        await new Promise((r) => setTimeout(r, 1500)); }
      setMsg({ t: `Not confirmed yet. Check Solscan: ${sig}` });
    } catch (e) { setMsg({ t: (e as Error).message || "Trade failed" }); } finally { setBusy(false); }
  }
  const out = quote ? Number(quote.outAmount) / 10 ** outDec : null;
  return <div className="r">
    <div className="bs"><button className={side === "buy" ? "buy" : ""} onClick={() => { setSide("buy"); setQuote(null); setAmt(""); setExact(null); }}>Buy</button><button className={side === "sell" ? "sell" : ""} onClick={() => { setSide("sell"); setQuote(null); setAmt(""); setExact(null); }}>Sell</button></div>
    <div className="card"><div className="kv"><span>SOL Balance</span><b>{w.connected ? (bal.sol != null ? fmt(bal.sol) : "…") : "—"}</b></div><div className="kv"><span>${t.ticker} Balance</span><b>{w.connected ? (bal.sol != null ? fmt(tok?.ui ?? 0) : "…") : "—"}</b></div></div>
    <input className="inp" placeholder={`Amount in ${side === "buy" ? "SOL" : "$" + t.ticker}`} inputMode="decimal" value={amt} onChange={(e) => { setAmt(e.target.value); setExact(null); setQuote(null); }} aria-label="Amount" />
    <div className="pct4">{[25, 50, 75].map((p) => <button key={p} className="chip" disabled={!w.connected} onClick={() => pct(p)}>{p}%</button>)}<button className="chip" disabled={!w.connected} onClick={() => pct(100)}>Max</button></div>
    {side === "buy" && <span className="mu" style={{ fontSize: 11 }}>Max keeps {RESERVE} SOL for fees.</span>}
    <div className="chips" style={{ padding: 0 }}>{[25, 50, 100, 300].map((b) => <button key={b} className={`chip ${slip === b ? "on" : ""}`} onClick={() => setSlip(b)}>{b / 100}% slip</button>)}</div>
    {warn && <div className="err">{warn}</div>}
    <button className="btn" disabled={!ready || busy || !w.connected || !!warn || !hasAmt} onClick={trade}>{!ready ? "Token not tradable yet" : !w.connected ? "Connect wallet to trade" : busy ? "Working…" : `${side === "buy" ? "Buy" : "Sell"} $${t.ticker}`}</button>
    {ready && <button className="chip" onClick={getQuote}>Get quote</button>}
    <div className="card"><div className="kv"><span>Estimated output</span><b>{out != null ? `${fmt(out)} ${side === "buy" ? t.ticker : "SOL"}` : "—"}</b></div><div className="kv"><span>$ impact</span><b>{quote ? `${(Number(quote.priceImpactPct) * 100).toFixed(3)}%` : "—"}</b></div><div className="kv"><span>Slippage</span><b>{slip / 100}%</b></div><div className="kv"><span>Min received</span><b>{quote ? fmt(Number(quote.otherAmountThreshold) / 10 ** outDec) : "—"}</b></div></div>
    {msg && <div className={msg.ok ? "up" : "err"} style={{ wordBreak: "break-all" }}>{msg.t}</div>}
  </div>;
}
