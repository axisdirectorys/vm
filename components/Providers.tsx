"use client";
import { useMemo } from "react";
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { PhantomWalletAdapter, SolflareWalletAdapter } from "@solana/wallet-adapter-wallets";
import { DataProvider } from "./Data"; import { BalancesProvider } from "./Balances"; import Shell from "./Shell";
export default function Providers({ children }: { children: React.ReactNode }) {
  const endpoint = typeof window !== "undefined" ? `${window.location.origin}/api/rpc` : "http://localhost:3000/api/rpc";
  const wallets = useMemo(() => [new PhantomWalletAdapter(), new SolflareWalletAdapter()], []);
  return <ConnectionProvider endpoint={endpoint}><WalletProvider wallets={wallets} autoConnect><WalletModalProvider><DataProvider><BalancesProvider><Shell>{children}</Shell></BalancesProvider></DataProvider></WalletModalProvider></WalletProvider></ConnectionProvider>;
}
