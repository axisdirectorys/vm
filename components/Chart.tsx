"use client";
import { useEffect, useRef, useState } from "react";
import { createChart, ColorType } from "lightweight-charts";
const TFS = ["1m","5m","15m","30m","1h","4h","1d","1w"];
export default function Chart({ token }: { token: string }) {
  const el = useRef<HTMLDivElement>(null);
  const [tf, setTf] = useState("1h");
  const [state, setState] = useState<{ s: "loading" | "ok" | "err"; m?: string }>({ s: "loading" });
  useEffect(() => {
    if (!el.current) return;
    const chart = createChart(el.current, { autoSize: true, layout: { background: { type: ColorType.Solid, color: "#000000" }, textColor: "#84938A" },
      grid: { vertLines: { color: "#15221B" }, horzLines: { color: "#15221B" } }, timeScale: { timeVisible: true }, rightPriceScale: { borderColor: "#1d2c24" } });
    const c = chart.addCandlestickSeries({ upColor: "#42E88A", downColor: "#EF5350", borderVisible: false, wickUpColor: "#42E88A", wickDownColor: "#EF5350" });
    const v = chart.addHistogramSeries({ priceFormat: { type: "volume" }, priceScaleId: "" });
    v.priceScale().applyOptions({ scaleMargins: { top: 0.8, bottom: 0 } });
    let dead = false;
    const load = async () => {
      try {
        const r = await fetch(`/api/candles?token=${token}&tf=${tf}`); const j = await r.json();
        if (dead) return;
        if (!r.ok) { c.setData([]); v.setData([]); return setState({ s: "err", m: j.error }); }
        c.setData(j.candles); v.setData(j.candles.map((k: any) => ({ time: k.time, value: k.volume, color: k.close >= k.open ? "#42E88A55" : "#EF535055" })));
        setState({ s: "ok" });
      } catch { if (!dead) setState({ s: "err", m: "Could not load chart data" }); }
    };
    setState({ s: "loading" }); load(); const t = setInterval(load, 30000);
    return () => { dead = true; clearInterval(t); chart.remove(); };
  }, [token, tf]);
  return <>
    <div className="chips">{TFS.map((x) => <button key={x} className={`chip ${x === tf ? "on" : ""}`} onClick={() => setTf(x)}>{x}</button>)}</div>
    <div className="chart"><div ref={el} style={{ position: "absolute", inset: 0 }} />
      {state.s !== "ok" && <div className="msg">{state.s === "loading" ? "Loading chart…" : state.m}</div>}</div></>;
}
