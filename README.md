# Seeing Red

A Cincinnati Reds recap blog. Plain HTML/CSS/JS — no build step, no server, no database. Ready to push straight to GitHub Pages.

## What's in here

```
seeing-red/
├── index.html                          ← homepage: list of recaps + standings sidebar
├── posts/
│   ├── post-template.html              ← duplicate this for every new recap
│   └── 2026-07-20-reds-vs-cardinals.html   ← filled-out example post
└── assets/
    ├── css/styles.css                  ← all site styling (Reds red/black/white theme)
    └── js/
        ├── standings.js                ← live NL + AL standings widget
        └── seeing-red-meter.js         ← the Seeing Red Meter gauge
```

## Writing a new post after each game

1. Copy `posts/post-template.html` and rename it, e.g. `posts/2026-07-22-reds-vs-cubs.html`.
2. Open the new file and fill in the bracketed `[FIELDS]` — there are 8 numbered steps marked with HTML comments (date, opponent, score, headline, box score line, recap body, and the Seeing Red Meter score).
3. At the bottom of the file, set the meter score:
   ```html
   renderSeeingRedMeter(7, "meter");
   ```
   Use 1–10, where 1 is "Fully Chill" and 10 is "Nuclear Meltdown." See the scale below.
4. Open `index.html` and copy the `<article class="post-card">...</article>` block, paste it at the top of the post list (newest first), and update the link, headline, excerpt, result pill, and `data-mini-meter` score to match your new post.
5. Save, commit, push. Done.

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

## The standings widget

`assets/js/standings.js` fetches live data from the free, public **MLB Stats API** (`statsapi.mlb.com`) — no API key needed. It runs entirely in the visitor's browser, so standings are always current as of whenever someone loads the page (no manual updates required from you).

- Shows both National League and American League standings, toggle buttons switch between them.
- The Cincinnati Reds row is highlighted in red in whichever division they're in.
- If the API is temporarily unreachable, the widget shows a "couldn't load standings" message instead of breaking the page.

The same widget markup is already on `index.html` and both post pages — copy that `<div class="widget" data-standings-widget>...</div>` block into any new page and it'll work automatically, no extra JS needed beyond the two `<script>` tags at the bottom of the file.

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
