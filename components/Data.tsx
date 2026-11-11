"use client";
import { createContext, useContext, useEffect, useState } from "react";
import type { MarketRow } from "@/lib/market";
type Meta = { id: string; name: string; ticker: string; symbol: string; color: string; mint: string | null; description: string | null; logoUrl: string | null; website: string | null; twitter: string | null; telegram: string | null; totalSupply: string | null; circulating: string | null; featured: boolean; holdersCount: number | null; decimals: number | null; reserve: any };
interface Ctx { market: MarketRow[]; marketErr?: string; meta: Meta[]; announcements: { id: string; text: string }[]; dbOk: boolean; loaded: boolean }
const C = createContext<Ctx>({ market: [], meta: [], announcements: [], dbOk: false, loaded: false });
export const useData = () => useContext(C);
export function DataProvider({ children }: { children: React.ReactNode }) {
  const [s, set] = useState<Ctx>({ market: [], meta: [], announcements: [], dbOk: false, loaded: false });
  useEffect(() => {
    let dead = false;
    const m = async () => { try { const j = await (await fetch("/api/market")).json(); if (!dead) set((p) => ({ ...p, market: j.data ?? p.market, marketErr: j.error, loaded: true })); } catch { if (!dead) set((p) => ({ ...p, marketErr: "Market data unavailable", loaded: true })); } };
    const t = async () => { try { const j = await (await fetch("/api/tokens")).json(); if (!dead) set((p) => ({ ...p, meta: j.tokens, announcements: j.announcements, dbOk: j.dbOk })); } catch {} };
    m(); t(); const a = setInterval(m, 15000), b = setInterval(t, 60000); return () => { dead = true; clearInterval(a); clearInterval(b); };
  }, []);
  return <C.Provider value={s}>{children}</C.Provider>;
}
export function useWatchlist() {
  const [w, setW] = useState<string[]>([]);
  useEffect(() => { try { setW(JSON.parse(localStorage.getItem("vm_watch") ?? "[]")); } catch {} }, []);
  const toggle = (id: string) => setW((p) => { const n = p.includes(id) ? p.filter((x) => x !== id) : [...p, id]; try { localStorage.setItem("vm_watch", JSON.stringify(n)); } catch {} return n; });
  return { w, toggle };
}
