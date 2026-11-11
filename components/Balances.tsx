"use client";
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
interface B { sol: number | null; lamports: number | null; tokens: Record<string, { raw: string; ui: number }>; version: number; refresh: () => void }
const C = createContext<B>({ sol: null, lamports: null, tokens: {}, version: 0, refresh: () => {} });
export const useBalances = () => useContext(C);
const PROGS = ["TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA", "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"];
export function BalancesProvider({ children }: { children: React.ReactNode }) {
  const { connection } = useConnection(); const { publicKey } = useWallet(); const [s, set] = useState<Omit<B, "refresh">>({ sol: null, lamports: null, tokens: {}, version: 0 }); const [n, setN] = useState(0);
  const refresh = useCallback(() => setN((x) => x + 1), []);
  useEffect(() => {
    if (!publicKey) { set((p) => ({ ...p, sol: null, lamports: null, tokens: {} })); return; }
    let dead = false;
    const load = async () => { try {
      const lamports = await connection.getBalance(publicKey); const tokens: Record<string, { raw: string; ui: number }> = {};
      for (const p of PROGS) { const r = await connection.getParsedTokenAccountsByOwner(publicKey, { programId: new PublicKey(p) }).catch(() => ({ value: [] as any[] }));
        for (const a of r.value) { const i = a.account.data.parsed.info; const o = tokens[i.mint]; tokens[i.mint] = { raw: (BigInt(o?.raw ?? "0") + BigInt(i.tokenAmount.amount)).toString(), ui: (o?.ui ?? 0) + (i.tokenAmount.uiAmount ?? 0) }; } }
      if (!dead) set((p) => ({ sol: lamports / 1e9, lamports, tokens, version: p.version + (n > 0 ? 1 : 0) })); } catch {} };
    load(); const i = setInterval(load, 20000); return () => { dead = true; clearInterval(i); };
  }, [publicKey, connection, n]);
  return <C.Provider value={{ ...s, refresh }}>{children}</C.Provider>;
}
