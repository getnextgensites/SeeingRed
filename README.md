# Seeing Red

A Cincinnati Reds recap blog. Plain HTML/CSS/JS — no build step, no server, no database. Ready to push straight to GitHub Pages.

## What's in here

```
seeing-red/
├── index.html                          ← homepage: list of recaps + standings sidebar
├── feed.xml                             ← RSS feed — add an <item> per new post
├── posts/
│   └── post-template.html              ← duplicate this for every new recap
└── assets/
    ├── css/styles.css                  ← all site styling (Reds red/black/white theme)
    └── js/
        ├── standings.js                ← live NL + AL standings widget
        ├── next-game.js                ← next game countdown widget
        ├── ops.js                       ← Reds hitters ranked by OPS (homepage only)
        ├── oaa.js                       ← Reds defense ranked by Outs Above Average (homepage only)
        └── seeing-red-meter.js         ← the Seeing Red Meter gauge
```

`posts/post-template.html` is not linked anywhere on the live site — it's just sitting in the repo for you to copy from. Visitors only ever see posts you've explicitly added to `index.html`.

## Writing a new post after each game

1. Copy `posts/post-template.html` and rename it, e.g. `posts/2026-07-22-reds-vs-cubs.html`.
2. Open the new file and fill in the bracketed `[FIELDS]` — there are 8 numbered steps marked with HTML comments (date, opponent, score, headline, box score line, recap body, and the Seeing Red Meter score).
3. At the bottom of the file, set the meter score:
   ```html
   renderSeeingRedMeter(7, "meter");
   ```
   Use 1–10, where 1 is "Fully Chill" and 10 is "Nuclear Meltdown." See the scale below.
4. Open `index.html` and copy the `<article class="post-card">...</article>` block, paste it at the top of the post list (newest first), and update the link, headline, excerpt, result pill, and `data-mini-meter` score to match your new post.
5. Optional: add a matching `<item>` to `feed.xml` so RSS subscribers see the new post (see "RSS feed" below).
6. Save, commit, push. Done.

No CMS, no markdown conversion — just HTML files. You can open any of these files directly in a browser to preview before publishing.

## The Seeing Red Meter scale

| Score | Label |
|---|---|
| 1–2 | Fully Chill / Barely Bothered |
| 3–4 | Mildly Miffed / Grumbling |
| 5–6 | Getting Warm / Heated |
| 7–8 | Seeing Red / Full Rage |
| 9–10 | Throwing Remotes / Nuclear Meltdown |

The gauge and its color (green → yellow → orange → red → dark red) are driven entirely by the number you pass to `renderSeeingRedMeter()`. Pick whatever score feels right for how the game actually went — a blown save in the 9th probably deserves an 8+, a comfortable win is a 1 or 2.

## Reds hitters — OPS

`assets/js/ops.js` (homepage sidebar only) lists the current Reds hitters sorted by **OPS** (on-base % + slugging %), a simple, widely-used measure of overall hitting production.

The rank (e.g. "#22 of 412 in MLB") is built from scratch rather than pulled from MLB's official OPS leaderboard, on purpose: that official leaderboard only includes "qualified" hitters (roughly 300+ plate appearances, scaling with games played), so bench players and part-timers never show up there no matter how the results are limited. Instead, this widget pulls every team's active roster with hitting stats attached (one call per team, 30 total) and ranks every hitter across the majors itself. The OPS numbers are still 100% real MLB data — this just changes who gets compared.

Anyone with fewer than 10 plate appearances is left out entirely (too small a sample to mean anything — think a single pinch-hit at-bat). Everyone else, regulars and bench players alike, gets a real rank.

## Reds defense — Outs Above Average

`assets/js/oaa.js` (homepage sidebar only) ranks current Reds fielders by **Outs Above Average (OAA)**, MLB's own live Statcast defensive metric — roughly, how many outs a fielder's range is worth compared to an average defender at that position. Positive is good, negative is below average.

This isn't bWAR or dWAR. Those are Baseball-Reference's proprietary calculations, and Baseball-Reference has no public API and blocks scraping, so there's no legitimate way to pull their exact numbers — and unlike OPS, WAR can't be reasonably reconstructed from public data either (it needs baserunning models and replacement-level baselines that aren't published anywhere free). OAA is the closest honest, fully real substitute: it's MLB's own number, not an estimate.

One thing to know: this widget pulls from Baseball Savant (`baseballsavant.mlb.com`), a different site than the MLB Stats API the rest of the page uses. If that site ever blocks direct browser requests, the widget shows a "couldn't load" message instead of breaking the page — same graceful-fallback pattern as the other widgets. Catchers and pitchers aren't included since Statcast doesn't publish OAA for those positions.

## The standings widget

`assets/js/standings.js` fetches live data from the free, public **MLB Stats API** (`statsapi.mlb.com`) — no API key needed. It runs entirely in the visitor's browser, so standings are always current as of whenever someone loads the page (no manual updates required from you).

- Shows both National League and American League standings, toggle buttons switch between them.
- The Cincinnati Reds row is highlighted in red in whichever division they're in.
- If the API is temporarily unreachable, the widget shows a "couldn't load standings" message instead of breaking the page.

The same widget markup is already on `index.html` and both post pages — copy that `<div class="widget" data-standings-widget>...</div>` block into any new page and it'll work automatically, no extra JS needed beyond the two `<script>` tags at the bottom of the file.

## Next game countdown

`assets/js/next-game.js` fetches the Reds' upcoming schedule from the same free MLB Stats API and shows a live countdown to first pitch — opponent, home/away, venue, and a days/hours/min/sec countdown that ticks in real time. If a game is currently in progress it swaps to a "LIVE NOW" message instead. No setup required — it just works once the site is live.

## RSS feed

`feed.xml` at the repo root is a plain RSS 2.0 file readers can subscribe to. Since there's no build step, you maintain it by hand alongside your posts:

1. Open `feed.xml`.
2. Copy the example `<item>` block (in the HTML comment) and fill in the title, link, pub date (RFC 822 format, e.g. `Wed, 22 Jul 2026 19:30:00 -0400`), and description.
3. Paste it above the closing `</channel>` tag, newest post first.
4. Also update the `<link>` near the top of the file to your real GitHub Pages URL once you know it.

The homepage already links to `feed.xml` for feed readers to auto-discover, and there's an "RSS" link in the footer of every page.

## Publishing to GitHub Pages

1. Create a new GitHub repo (e.g. `seeing-red`).
2. Push the contents of this `seeing-red/` folder to the repo root (so `index.html` sits at the top level of the repo).
3. In the repo, go to **Settings → Pages**, set the source to the `main` branch, root folder.
4. Your site will be live at `https://<your-username>.github.io/seeing-red/`.

Every time you add a new post and push, GitHub Pages redeploys automatically within a minute or two — nothing else to configure.

## Customizing

- **Colors / fonts**: all in `assets/css/styles.css` under the `:root` variables at the top (`--reds-red`, `--reds-black`, etc.).
- **Site title / tagline**: edit the `<div class="brand-tag">` text in the header of each HTML file.
- **Nav links**: edit `<nav class="site-nav">` in the header.
