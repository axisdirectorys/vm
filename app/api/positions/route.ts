import { getPositions } from "@/lib/positions";
export const dynamic = "force-dynamic";
export async function GET(req: Request) {
  const u = new URL(req.url); const w = u.searchParams.get("wallet") ?? "";
  if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(w)) return Response.json({ error: "Invalid wallet address" }, { status: 400 });
  try { return Response.json(await getPositions(w, u.searchParams.get("fresh") === "1")); } catch (e) { return Response.json({ error: (e as Error).message }, { status: 502 }); }
}
