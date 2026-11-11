import { snapshotAll } from "@/lib/snapshots";
export const dynamic = "force-dynamic";
export async function GET(req: Request) {
  const s = process.env.CRON_SECRET; if (!s || req.headers.get("authorization") !== `Bearer ${s}`) return Response.json({ error: "Unauthorized" }, { status: 401 });
  try { return Response.json(await snapshotAll(true)); } catch (e) { return Response.json({ error: (e as Error).message }, { status: 500 }); }
}
