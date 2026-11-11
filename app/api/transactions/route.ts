import { getTxs } from "@/lib/txs";
export const dynamic = "force-dynamic";
export async function GET(req: Request) {
  const u = new URL(req.url); const tok = u.searchParams.get("token") ?? "all"; const type = u.searchParams.get("type") ?? "all";
  const page = Math.max(0, Number(u.searchParams.get("page") ?? 0) || 0);
  try {
    let t = await getTxs(tok === "all" ? undefined : tok); if (type !== "all") t = t.filter((x) => x.type === type);
    return Response.json({ txs: t.slice(page * 25, page * 25 + 25), total: t.length, note: "USD value = tokens x the pool price at trade time (hourly or minute candle). Shown as — when no candle covers that time." });
  } catch (e) { return Response.json({ error: (e as Error).message }, { status: 502 }); }
}
