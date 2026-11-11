"use client";
import Link from "next/link";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { TOKENS } from "@/config/tokens";
import { useData } from "./Data";
import { Dot, Pc, usd } from "./ui";
const WalletButton = dynamic(async () => (await import("@solana/wallet-adapter-react-ui")).WalletMultiButton, { ssr: false });
const NAV = [ ["/explore", "Explore"], ["/portfolio", "Portfolio"], ["/analytics", "Analytics"], ["/transactions", "Transactions"]];
export default function Shell({ children }: { children: React.ReactNode }) {
  const path = usePathname(); const { market, meta, announcements } = useData(); const { publicKey } = useWallet(); const { connection } = useConnection();
  const [bal, setBal] = useState<number | null>(null); const [open, setOpen] = useState(false);
  useEffect(() => { setBal(null); if (publicKey) connection.getBalance(publicKey).then((l) => setBal(l / 1e9)).catch(() => {}); }, [publicKey, connection]);
  const items = TOKENS.map((t) => { const m = meta.find((x) => x.id === t.id); const r = market.find((x) => x.id === t.id); return { ...t, ticker: m?.ticker ?? t.ticker, logoUrl: m?.logoUrl, r }; });
  const tk = items.map((t) => <Link key={t.id} className="tk" href={`/${t.id}`}><Dot t={t} /><b>${t.ticker}</b><span>{usd(t.r?.priceUsd)}</span><Pc n={t.r?.change24h} /></Link>);
  return <>
    {announcements.map((a) => <div key={a.id} className="ann">{a.text}</div>)}
    <header className="top"><Link href="/"><b>VM</b></Link>
      <nav className={`nav ${open ? "open" : ""}`}>{NAV.map(([h, l]) => <Link key={h} href={h} onClick={() => setOpen(false)} className={path === h ? "act" : ""}>{l}</Link>)}
        <details className="sup"><summary>Support</summary><div><a href="https://solscan.io" target="_blank" rel="noreferrer">View on Solscan</a><a href="/about" target="_blank" rel="noreferrer">What is Virtual Metals?</a><a href="/about" target="_blank" rel="noreferrer">Documentation & Tokenomics</a></div></details></nav>
      <span className="sp" />{bal != null && <span className="mu">{bal.toFixed(3)} SOL</span>}<WalletButton />
      <button className="burger" aria-label="Menu" onClick={() => setOpen(!open)}>☰</button></header>
    <div className="tick" aria-label="Price ticker"><div>{tk}{tk}</div></div>
    <main>{children}</main></>;
}
