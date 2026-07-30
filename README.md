# Ignitus Brief — PWA (v2026:07:30-14:05)

Read-only viewer for the Ignitus portfolio briefs. The briefs are produced by Claude scheduled
tasks which INSERT one row per run into `public.brief_log` in the Ignitus Supabase project.
This app only reads that table.

- **Daily brief v8.8** — Tue–Sat, starts 05:40 JST, in the app by ~06:00 JST (watchdog re-fires at
  06:30 JST if the row is missing).
- **Weekly review v2.1** — Monday, starts 05:40 JST. Seven sections: portfolio performance last
  week, each sleeve vs its index, top 3 movers over 7 days and 1 year, upcoming earnings /
  dividends / macro events, opportunities plus weakness to watch, Focus 10, and the exposure map.

Sections the renderer knows: 🔴 Act today · 🟡 Watch · 💡 Opportunities & Signals ·
🎯 Focus 10 · 🗺️ Exposure map · 📈 Week in review · 🌏 Sleeves vs benchmarks · 🔝 Top movers ·
📅 Week ahead · ⚪ FYI · 📊 Derisk · 🧬 Health changes · ⚠️ Data gaps. Lines beginning `💬` render
as a **Key Highlights** callout inside their section.

## The two rich sections
🎯 **Focus 10** and 🗺️ **Exposure map** are drawn from `metrics`, not from the markdown. When the
structured data is present the app draws it and suppresses the plain-text version of that section;
when it is absent (every brief written before 2026-07-30) the app prints why it is absent rather
than back-filling anything.

- **Focus 10** — a ranked attention list. Each card expands to an ascending reference-level ladder
  (cost basis, 52-week and 6-month extremes, SMA50, SMA200, and the algebraically-solved derisk-cap
  breach price) with the last price in its true slot, so above and below are visible rather than
  asserted. The right column is each level's distance from that last price. These are arithmetic
  reference levels, not targets and not recommendations.
- **Exposure map** — two squarified treemaps of every holding, sized by SGD value, grouped by market
  and by sector, coloured on the move stated in `heat_basis.label`. Red is down, blue is up, with a
  neutral gray midpoint (CVD-safe — deliberately not red/green). Tap any tile for its figures. Any
  group or tile too small to draw at the current width is named in the note under the map, and the
  full 80-row table below the maps is the complete view.

## Files
- `index.html` — the whole app (fetch, render, treemaps, offline data fallback)
- `manifest.webmanifest` — install metadata
- `sw.js` — service worker (caches the app shell for offline; `SHELL_CACHE = ignitus-shell-v9`)
- `icon-192.png`, `icon-512.png`

Do **not** deploy anything else from this folder. `fixture.json` and the `shot_*.png` /
`p_*.png` / `chk_*.png` screenshots are local test artefacts that contain real position data —
they must never be uploaded to a public host.

## Deploy (any static HTTPS host — service workers require HTTPS)
Manual, no build step:
1. **Netlify Drop** — https://app.netlify.com/drop → drag the 5 files in → done.
2. **Cloudflare Pages** — create a project → direct upload → drag the files.
3. **GitHub Pages** — push the 5 files to a repo → Settings → Pages → deploy from branch.

**After redeploying, the shell cache name must change or phones keep the old app.** It is already
bumped to `ignitus-shell-v9` in `sw.js`; a redeploy is what makes that take effect. If the phone
still shows the old version, close all tabs of the app and reopen, or uninstall and reinstall.

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
The app reads `brief_log(run_date, run_ts, brief_md, metrics, source)` and parses these
`metrics` keys: `book_sgd`, `unrealized_pct`, `act[]`, `act_suppressed`, `derisk{...}`,
`watch[]`, `health_changes`, `moat_proxy[]`, `gaps[]`, and — from daily v8.8 / weekly v2.1 —
`focus10[{rank, ticker, name, w_pct, value_sgd, price, chg_pct, chg_sgd, tags[], levels[{label,
px|null, delta_pct|null, side, note}], watch[{k, v, src}], counterpoint}]`,
`positions_x{ticker → {mkt, sector, ccy, shares, price, value_sgd, chg_pct, chg_sgd}}` and
`heat_basis{label, from_date, to_date, note}`. Missing keys degrade gracefully — the raw brief
text always renders.

One-run warm-up: `chg_pct` prefers the previous brief's stored `positions_x[ticker].price`. The
first run under the new prompts has no such row, so it falls back to a back-solved price marked
`implied`, or prints a gap. From the second run onward the move is a clean price-only figure.

Not financial advice — the brief surfaces facts and framework signals; decisions are CK's.
