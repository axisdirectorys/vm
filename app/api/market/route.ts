import { getMarket } from "@/lib/market";
import { snapshotAll } from "@/lib/snapshots";
export const dynamic = "force-dynamic";
export async function GET() {
  try { const data = await getMarket(); void snapshotAll().catch(() => {}); return Response.json({ data, at: Date.now() }); }
  catch (e) { return Response.json({ error: (e as Error).message }, { status: 502 }); }
}
