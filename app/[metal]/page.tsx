import { notFound } from "next/navigation";
import MetalDashboard from "@/components/MetalDashboard";
import { TOKENS } from "@/config/tokens";
export const dynamicParams = false;
export const generateStaticParams = () => TOKENS.map((t) => ({ metal: t.id }));
export default async function Metal({ params }: { params: Promise<{ metal: string }> }) { const { metal } = await params; if (!TOKENS.some((t) => t.id === metal)) notFound(); return <MetalDashboard initial={metal} />; }
