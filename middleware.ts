import { NextRequest, NextResponse } from "next/server";
const hits = new Map<string, { n: number; t: number }>();
// In-memory per-instance limiter. For multi-instance production use Upstash/Redis.
export function middleware(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "local";
  const admin = req.nextUrl.pathname.startsWith("/api/admin"); const key = ip + (admin ? ":a" : ""); const max = admin ? 40 : 300;
  const now = Date.now(); const h = hits.get(key);
  if (!h || now - h.t > 60_000) { hits.set(key, { n: 1, t: now }); if (hits.size > 5000) hits.clear(); return NextResponse.next(); }
  if (++h.n > max) return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  return NextResponse.next();
}
export const config = { matcher: "/api/:path*" };
