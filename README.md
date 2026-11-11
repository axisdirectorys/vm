# Virtual Metals
Solana trading dashboard for $VG, $VS, $VB, $VC.

## What's built
Pages: / , /gold /silver /bronze /copper, /explore, /portfolio, /analytics, /transactions, /watchlist, /about, /admin.
- Market data (DexScreener), real candles (GeckoTerminal), holders + RPC (Helius), swaps (Jupiter quote -> wallet signs -> confirmation polling).
- Transactions: Helius enhanced API for each pool and mint, refreshed every 10s (polling, no WebSocket yet).
- Portfolio: live wallet or read-only view of any address. Watchlist: saved in the browser.
- Admin: sign-in by wallet signature, wallet allowlist/DB roles (VIEWER/EDITOR/OWNER), token + reserve editing, reserve documents by link, announcements, health checks, audit log. All checked server-side on every request.
- Rate limiting in middleware (per instance). Use Upstash/Redis if you run several instances.

## First run
1. Fill `.env.local` (a random ADMIN_SESSION_SECRET is already set). Put your wallet in ADMIN_WALLET_ALLOWLIST.
2. `npm install && npx prisma generate && npx prisma db push`
3. `npm run dev`, then open /admin and sign in.

## Mints in admin
/admin -> Tokens: paste or change a mint and press Save. It is verified on-chain (must be a real token mint), decimals and supply are filled in, and it applies to prices, charts, holders, transactions and swaps within ~10 seconds. A blank mint falls back to .env.local.

## Holders, growth and history
Holder counts and top owners come from Helius (up to 10,000 token accounts; larger tokens show "N+"). Snapshots (price, market cap, volume, liquidity, holders) are saved about hourly, which powers holder growth. Set CRON_SECRET; vercel.json calls /api/cron/snapshot hourly (Vercel Hobby only allows daily crons; snapshots are also taken opportunistically while the site is visited). History starts from the first snapshot.

## Uploads
Logos (PNG/JPG/WebP, 1 MB) and reserve documents (PDF/PNG/JPG, PDF 4 MB) are stored in Postgres and served from /api/files/<id>. Type is detected from file contents; SVG is rejected.

## Trading panel and positions
The trade panel shows SOL and token balances, 25/50/75%/Max buttons (buy Max keeps 0.01 SOL for fees; sell Max uses the exact balance) and blocks trades that exceed the balance. "Your positions" (on every metal page and /portfolio) shows holdings value and total up/down since entry. P/L is rebuilt from the wallet's swaps (average cost, priced from the pool at trade time via GeckoTerminal), scanning up to ~500 swaps. Tokens received by transfer or older swaps have no cost basis and are flagged with *.

## Supabase setup
1. Create a project. In Project Settings -> Database copy the Transaction pooler string into DATABASE_URL (port 6543, keep `?pgbouncer=true`) and the Direct (or Session pooler) string into DIRECT_URL.
2. `npm run db:push` (reads .env.local; creates the tables).
3. Paste `supabase-rls.sql` into Supabase's SQL Editor and run it. This blocks Supabase's public API from every table. The app is unaffected (Prisma uses the postgres role). Re-run it if you add tables.
4. On Vercel add DATABASE_URL and DIRECT_URL (plus the other env vars).
The app never uses Supabase's anon or service-role keys.

## Logos
/admin -> Tokens -> pick a metal -> upload a logo. It saves immediately and appears in the nav ticker, metal selector, Explore, Watchlist, Portfolio and Positions within about a minute. Remove restores the default letter badge.

## Known limits
Live updates are polling (5-15s), not WebSockets: a secure WebSocket needs a persistent server, since the Helius key can't go in the browser. 7D change needs a pool with 7+ days of history. Wallet count in admin health is not tracked (no visitor wallets are stored).
