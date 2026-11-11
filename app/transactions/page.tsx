"use client";
import { useState } from "react";
import { TOKENS } from "@/config/tokens";
import TxTable from "@/components/TxTable";
export default function Transactions() {
  const [t, setT] = useState("all");
  return <div className="page"><h1>Transactions</h1><div className="chips" style={{ padding: 0 }}><button className={`chip ${t === "all" ? "on" : ""}`} onClick={() => setT("all")}>All metals</button>{TOKENS.map((k) => <button key={k.id} className={`chip ${t === k.id ? "on" : ""}`} onClick={() => setT(k.id)}>${k.ticker}</button>)}</div><TxTable token={t} /></div>;
}
