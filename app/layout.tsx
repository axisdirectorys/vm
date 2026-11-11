import "./globals.css";
import "@solana/wallet-adapter-react-ui/styles.css";
import Providers from "@/components/Providers";
export const metadata = { title: "Virtual Metals" };
export default function Root({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body><Providers>{children}</Providers></body></html>;
}
