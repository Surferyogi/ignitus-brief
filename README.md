# Ignitus Brief — PWA (v2026:07:16-15:55)

Read-only viewer for the daily weekday portfolio brief. The brief itself is produced by a
Claude scheduled task (weekdays 07:15 SGT) which INSERTs one row per day into
`public.brief_log` in the Ignitus Supabase project. This app only reads that table.

## Files
- `index.html` — the whole app (fetch, render, offline data fallback)
- `manifest.webmanifest` — install metadata
- `sw.js` — service worker (caches the app shell for offline)
- `icon-192.png`, `icon-512.png`

## Deploy (any static HTTPS host — service workers require HTTPS)
Easiest options, no build step needed:
1. **Netlify Drop** — https://app.netlify.com/drop → drag this folder in → done.
2. **Cloudflare Pages** — create a project → direct upload → drag folder.
3. **GitHub Pages** — push these 5 files to a repo → Settings → Pages → deploy from branch.

## Install on your phone
Open the deployed URL → browser menu → **Add to Home Screen** (iOS Safari) /
**Install app** (Android Chrome). It opens full-screen and shows the last cached
brief when offline.

## Configuration
`index.html` contains the Supabase URL and the **publishable (anon) key** — this key is
designed to be public. Row Level Security on `brief_log` allows SELECT only; INSERT with
this key was tested and is rejected (42501).

## Security note (important)
Anyone who has your deployed URL can read the briefs (they contain portfolio figures).
The anon key + RLS protect against *writes*, not *reads*. Keep the URL private, or ask
Claude to add Supabase Auth (email OTP) in front of it if you want real access control.

## Data contract
The app reads `brief_log(run_date, run_ts, brief_md, metrics, source)` and parses
`metrics` keys: book_sgd, unrealized_pct, act[], act_suppressed, derisk{...}, watch[],
health_changes, moat_proxy[], gaps[]. Missing keys degrade gracefully (raw brief text
always renders).

Not financial advice — the brief surfaces facts and framework signals; decisions are CK's.
