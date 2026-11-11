"use client";
import { useEffect, useState } from "react";
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { TOKENS } from "@/config/tokens";
export default function GrowthChart({ token, days, height = 220 }: { token: string; days: number; height?: number }) {
  const [d, setD] = useState<any[] | null>(null); const [pts, setPts] = useState(0);
  useEffect(() => { setD(null); fetch(`/api/history?token=${token}&days=${days}`).then((r) => r.json()).then((j) => {
    const m = new Map<number, any>(); for (const r of j.rows ?? []) { if (r.holders == null) continue; const k = Math.round(r.at / 3600_000) * 3600; const t = TOKENS.find((x) => x.id === r.tokenId)?.ticker ?? r.tokenId; m.set(k, { ...(m.get(k) ?? { time: k }), [t]: r.holders }); }
    const rows = [...m.values()].sort((a, b) => a.time - b.time).map((x) => ({ ...x, label: new Date(x.time * 1000).toLocaleDateString(undefined, { month: "short", day: "numeric", hour: days <= 2 ? "numeric" : undefined }) })); setPts(rows.length); setD(rows); }).catch(() => setD([])); }, [token, days]);
  if (!d) return <div className="mu">Loading…</div>;
  if (pts < 2) return <div className="mu">Collecting data: holder counts are saved about once an hour ({pts} point{pts === 1 ? "" : "s"} so far). Requires DATABASE_URL.</div>;
  return <div style={{ height }}><ResponsiveContainer><LineChart data={d}><CartesianGrid stroke="#15221B" /><XAxis dataKey="label" stroke="#84938A" minTickGap={40} /><YAxis stroke="#84938A" allowDecimals={false} domain={["auto", "auto"]} /><Tooltip contentStyle={{ background: "#101A15", border: "1px solid #1d2c24" }} /><Legend />
    {TOKENS.filter((t) => token === "all" || t.id === token).map((t) => <Line key={t.id} dataKey={t.ticker} stroke={t.color} dot={false} connectNulls />)}</LineChart></ResponsiveContainer></div>;
}
