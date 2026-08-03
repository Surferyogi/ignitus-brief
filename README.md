# Ignitus Brief — PWA (v2026:08:03-05:22)

Read-only viewer for the Ignitus portfolio briefs. The briefs are produced by Claude scheduled
tasks which INSERT one row per run into `public.brief_log` in the Ignitus Supabase project.
This app only reads that table.

- **Daily brief v8.11** — Tue–Sat, starts 05:40 JST, in the app by ~06:00 JST (watchdog re-fires at
  06:30 JST if the row is missing).
- **Weekly review v2.3** — Monday, starts 05:40 JST. Eight sections: portfolio performance last
  week, each sleeve vs its index, top 3 movers over 7 days and 1 year, upcoming earnings /
  dividends / macro events, opportunities plus weakness to watch, Focus 10, the exposure map,
  and the TriLens market backdrop.
- **Watchdog v2.2** — the re-fire path; same sections as the daily.

Section emojis the renderer knows (each maps to a colour, a section key and a *fallback* name —
the heading actually shown is whatever the brief itself wrote, see below): 🔴 Act today · 🟡 Watch · 💡 Opportunities & Signals ·
🎯 Focus 10 · 🗺️ Exposure map · 📈 Week in review · 🌏 Sleeves vs benchmarks · 🔝 Top movers ·
📅 Week ahead · ⚪ FYI · 📊 Derisk · 🧬 Health changes · 🌐 Market backdrop · ⚠️ Data gaps. Lines
beginning `💬` render as a **Key Highlights** callout inside their section.

> `SECDEFS` is a **closed list**. An emoji missing from it is not a parse failure you would notice —
> the line silently falls through into the *preceding* section's body (`cur.paras.push`). A new
> section must therefore be added to `SECDEFS` **before** any producer starts emitting it, and it
> must never be placed first in the brief: `renderSections` drops `key === "header"`, so a leading
> unknown section is discarded entirely and without warning.

## Heading and bullet tolerance (fixed 2026-07-31)
The three producers do not agree on markdown syntax. The primary daily writes `🔴 ACT TODAY`;
the watchdog wrote `## 🔴 ACT`. The parser matched on a leading emoji only, so on watchdog days
**no section parsed at all** — the app fell back to printing the raw markdown and no 💬 Key
Highlights appeared. The parser now strips a leading `#`…`######` and a `**` wrapper before
matching, which repairs already-stored rows without touching the database, and all three prompts
now pin bare-emoji headers. The parser also accepts `- ` and `* ` as bullets alongside `•` —
every producer to date has used `- `, so before this fix the ACT and Signals disclaimers (which
only render when a section has bullet items) had never appeared.

## KPI tile: "vs last week" (changed 2026-08-03)
The third KPI tile used to read **vs 1 year**. It could never resolve: `brief_log` only begins
2026-07-16, so the 365-day lookback found nothing and the tile permanently showed
"n/a / no history yet". It is now a week-over-week figure, computed entirely viewer-side from the
`API_HIST` query (400 rows of `run_date` / `book_sgd` / `cost_sgd`) — **no producer change was
required**. The match tolerance is ±3.5 days around `run_date − 7`, deliberately much tighter than
the ±10 days the 1-year version used: briefs run Tue–Sat plus the Monday weekly, so a wide window
would silently match a 4-day-old row and label it "last week". The exact row used is always printed
in the tile's sub-line (`vs 2026-07-27`), and `· incl. flows` appears when `cost_sgd` moved more
than 0.1% between the two rows, i.e. the change is not price-only. The old `metrics.ret_1y_pct`
fallback was **removed, not repointed** — a stored 1-year number under a "vs last week" label would
be a mislabelled figure. The only fallback now is `metrics.week.delta_pct`, which the weekly review
stores and which genuinely is a week figure.

The producers carried the same defect in their own text — the brief header line read
`Δ1y <…>` and the performance section printed "Δ1y not available (brief_log begins 2026-07-16)"
every single day. Both were changed on 2026-08-03: **daily v8.9 → v8.10** and **watchdog v2.0 →
v2.1** now compute `Δ7d` against the row nearest `RUN_DATE−7 ±3 d` and store `ret_7d_pct` in place
of `ret_1y_pct`. The weekly review v2.2 was left alone — its 1-year references (the Yahoo `range=1y`
chart, the "1-year movers" analysis) are legitimate. The viewer does not read `ret_7d_pct`: it
computes the week figure itself from `API_HIST`, which is the same table and needs no producer run
to be correct. Rows written before 2026-08-03 keep the old `ret_1y_pct: null` — nothing rewrites
history.

## Section headings now come from the brief (changed 2026-08-03)
The parser matched a section on its leading emoji and then **discarded the producer's own heading**,
substituting a hardcoded name from the `SECDEFS` table. Because the producers reuse the same emoji
for differently-named sections, headings could flatly contradict the content beneath them: on the
2026-07-31 watchdog row `📊 PERFORMANCE` displayed as "DERISK" and `⚠️ DERISK & INTEGRITY` displayed
as "DATA GAPS"; on 2026-07-28 two different sections both displayed as "FYI". The heading shown is
now the brief's own wording, with the `SECDEFS` name kept only as the fallback for a bare emoji with
no text after it. This repairs every already-stored row — **no database write and no producer
change**. Colour and section key still come from the emoji, so Focus 10 / Exposure map structured
rendering and the section ordering are unaffected.

Extracting the name is not a plain split. The heading line may carry a qualifier after a dash
(`📊 DERISK — 0 of 5 caps breached`), a parenthetical (`🧬 HEALTH CHANGES (14 screened: 0 changes)`),
a source tag (`[smart-api:alerts][db]`), and — on the early watchdog runs, which wrote the whole
section on one line — a `💬` takeaway and the entire body. So the parser splits the `💬` off first,
then locates the section colon with bracketed and parenthesised spans masked to equal-length blanks
so a colon inside `smart-api:alerts` or inside `(14 screened: 0 changes)` cannot cut the heading in
the wrong place. The dash qualifier or parenthetical becomes the small right-aligned sub when it fits
in 56 characters and is pushed into the body when it does not, so nothing is silently dropped; source
tags are stripped from the heading row and left to the body, where they are styled. A name longer
than 48 characters is rejected and the `SECDEFS` fallback is used instead. Verified by rendering all
15 stored briefs and dumping every heading and sub.

## 🌐 Market backdrop — TriLens (added 2026-08-03)
All three producers now call CK's own TriLens macro dashboard once per run
(`https://pvqwpzbjremcyobnsldd.supabase.co/functions/v1/trilens-data`, edge function `trilens-data`
v7, no auth, no params) and render a `🌐 MARKET BACKDROP` section between `🧬 HEALTH CHANGES` and
`⚠️ DATA GAPS`. The full payload is stored verbatim in `metrics.trilens`.

The section prints a **fixed** gauge set — US economy, market froth, trend, Japan carry — never a
selection of "what looks interesting", because choosing would mean inventing a significance
threshold. Each gauge shows value + as-of date, with an arrow against the *same* gauge in the prior
brief row's stored `metrics.trilens`, or `(first stored reading)` when there is no prior. Nulls,
`errors[]` entries and any `stale:true` field are named in ⚠️ Data gaps.

Two constraints that must not be relaxed:

- **Never call the endpoint with `?refresh=1` or `?ai=1`.** Those bypass TriLens's own cache and
  bill a live Claude web-search run to CK's TriLens key. If the payload is hours old the brief
  prints the age (`meta.*.age_h`) — it does not force a refresh.
- **Macro context only.** No TriLens reading may be attached to a named holding or become a 💡
  signal, and the forbidden-word list applies inside this section in full.

TriLens sits at tier 4 in the degrade order (above only the Yahoo reference ladders, which are
dropped first). A failed or timed-out call stores `{ok:false, note:"…"}`, emits one gap line, and
the run continues — TriLens is never a reason to abort.

## 💬 Key Highlights — plain English (changed 2026-08-03)
The `💬` line is the one part of a brief written for a beginner: ≤3 short sentences (~45 words),
company names rather than tickers, at most one number per sentence, and it says what a reading
*means* for the portfolio rather than what the indicator measures. Any jargon must be glossed from
a **pinned gloss table** carried in all three prompts — producers never invent their own
explanation, and a term that is neither in the table nor glossable in ≤5 plain words does not
belong in a `💬` line at all. Bullets are unchanged: still telegraphic, still dense. The
trade-recommendation ban and the banned hedge words apply inside `💬` too — plain does not mean
advisory.

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
- `sw.js` — service worker (caches the app shell for offline; `SHELL_CACHE = ignitus-shell-v13`)
- `icon-192.png`, `icon-512.png`

Do **not** deploy anything else from this folder. `fixture.json`, `fixture_live.json` and the
`shot_*` / `p_*` / `chk_*` / `v_*` / `sl_*` / `live_*` / `macro_*` PNGs and `index.html.bak` are local test artefacts that contain
real position data — they must never be uploaded to a public host.

## Deploy (any static HTTPS host — service workers require HTTPS)
Manual, no build step:
1. **Netlify Drop** — https://app.netlify.com/drop → drag the 5 files in → done.
2. **Cloudflare Pages** — create a project → direct upload → drag the files.
3. **GitHub Pages** — push the 5 files to a repo → Settings → Pages → deploy from branch.

**After redeploying, the shell cache name must change or phones keep the old app.** It is already
bumped to `ignitus-shell-v13` in `sw.js`; a redeploy is what makes that take effect. If the phone
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
`watch[]`, `health_changes`, `moat_proxy[]`, `gaps[]`, and — from daily v8.9 / weekly v2.2 —
`focus10[{rank, ticker, name, w_pct, value_sgd, price, chg_pct, chg_sgd, tags[], levels[{label,
px|null, delta_pct|null, side, note}], watch[{k, v, src}], counterpoint}]`,
`positions_x{ticker → {mkt, sector, ccy, shares, price, value_sgd, chg_pct, chg_sgd}}` and
`heat_basis{label, from_date, to_date, note}`. Missing keys degrade gracefully — the raw brief
text always renders.

One-run warm-up: `chg_pct` prefers the previous brief's stored `positions_x[ticker].price`. The
first run under the new prompts has no such row, so it falls back to a back-solved price marked
`implied`, or prints a gap. From the second run onward the move is a clean price-only figure.

Not financial advice — the brief surfaces facts and framework signals; decisions are CK's.
