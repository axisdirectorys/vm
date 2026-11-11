export type MetalId = "gold" | "silver" | "bronze" | "copper";
export interface TokenConfig { id: MetalId; name: string; ticker: string; symbol: string; color: string; mint: string | null }
const m = (v?: string) => (v && v.trim() ? v.trim() : null);
// Mints come from env. Never hardcode guessed addresses.
export const TOKENS: TokenConfig[] = [
  { id: "gold", name: "Virtual Gold", ticker: "VG", symbol: "VG", color: "#E0B84A", mint: m(process.env.NEXT_PUBLIC_MINT_VG) },
  { id: "silver", name: "Virtual Silver", ticker: "VS", symbol: "VS", color: "#C0C8CC", mint: m(process.env.NEXT_PUBLIC_MINT_VS) },
  { id: "bronze", name: "Virtual Bronze", ticker: "VB", symbol: "VB", color: "#CD7F32", mint: m(process.env.NEXT_PUBLIC_MINT_VB) },
  { id: "plat", name: "Virtual Platinum", ticker: "VP", symbol: "VP", color: "#E5E4E2", mint: m(process.env.NEXT_PUBLIC_MINT_VP) },
  { id: "tin", name: "Virtual Tin", ticker: "VT", symbol: "VT", color: "#C0C0C0", mint: m(process.env.NEXT_PUBLIC_MINT_VT) },
  { id: "nickel", name: "Virtual Nickel", ticker: "VN", symbol: "VN", color: "#C0C0C0", mint: m(process.env.NEXT_PUBLIC_MINT_VN) },
];
export const SOL_MINT = "So11111111111111111111111111111111111111112";
export const getToken = (id: string) => TOKENS.find((t) => t.id === id);
