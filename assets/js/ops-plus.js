/**
 * Seeing Red — Reds hitters, ranked by estimated OPS+
 *
 * OPS+ is a park-and-league-adjusted version of OPS where 100 = league
 * average. The free public MLB Stats API doesn't expose official OPS+
 * (that specific number lives on Baseball-Reference, which has no public
 * API). This widget calculates a very close estimate itself:
 *
 *   OPS+ (est.) = 100 × (player OBP / league OBP + player SLG / league SLG − 1)
 *
 * League OBP/SLG are computed from MLB's own list of qualified hitters
 * for the season. The one thing this estimate leaves out is Baseball-
 * Reference's park-factor adjustment, so numbers will be close but not
 * pixel-identical to what you'd see there — labeled "est." for that reason.
 *
 * Data source: https://statsapi.mlb.com/api/v1 (roster, player stats,
 * league-wide hitting stats).
 */

(function () {
  const REDS_TEAM_ID = 113;
  const MIN_PLATE_APPEARANCES = 10; // filters out tiny, noisy samples (e.g. a single pinch-hit AB)

  function currentSeason() {
    const now = new Date();
    const month = now.getMonth() + 1;
    let year = now.getFullYear();
    if (month <= 2) year -= 1;
    return year;
  }

  function rosterUrl() {
    return `https://statsapi.mlb.com/api/v1/teams/${REDS_TEAM_ID}/roster?rosterType=active`;
  }

  function playerStatsUrl(personId, season) {
    return `https://statsapi.mlb.com/api/v1/people/${personId}/stats?stats=season&group=hitting&season=${season}`;
  }

  function leagueHittingUrl(season) {
    return `https://statsapi.mlb.com/api/v1/stats?stats=season&group=hitting&sportId=1&season=${season}`;
  }

  function num(v) {
    const n = parseFloat(v);
    return isNaN(n) ? 0 : n;
  }

  function extractCounting(stat) {
    return {
      atBats: num(stat.atBats),
      hits: num(stat.hits),
      baseOnBalls: num(stat.baseOnBalls),
      hitByPitch: num(stat.hitByPitch),
      sacFlies: num(stat.sacFlies),
      totalBases: num(stat.totalBases),
      plateAppearances: num(stat.plateAppearances),
    };
  }

  // OBP/SLG from raw counting numbers (correct way to combine across players —
  // averaging rate stats directly would bias toward small-sample players).
  function calcObp(c) {
    const denom = c.atBats + c.baseOnBalls + c.hitByPitch + c.sacFlies;
    return denom ? (c.hits + c.baseOnBalls + c.hitByPitch) / denom : null;
  }

  function calcSlg(c) {
    return c.atBats ? c.totalBases / c.atBats : null;
  }

  async function fetchJson(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error("Request failed: " + res.status);
    return res.json();
  }

  async function loadOpsPlus(widget) {
    const body = widget.querySelector("[data-ops-plus-body]");
    const season = currentSeason();

    try {
      // 1. Every qualified hitter in MLB this season — used both to build
      //    league-average OBP/SLG and to rank the Reds against everyone else.
      const leagueData = await fetchJson(leagueHittingUrl(season));
      const leagueSplits =
        (leagueData.stats && leagueData.stats[0] && leagueData.stats[0].splits) || [];

      const sums = { atBats: 0, hits: 0, baseOnBalls: 0, hitByPitch: 0, sacFlies: 0, totalBases: 0 };
      const qualified = [];

      leagueSplits.forEach((split) => {
        const c = extractCounting(split.stat);
        sums.atBats += c.atBats;
        sums.hits += c.hits;
        sums.baseOnBalls += c.baseOnBalls;
        sums.hitByPitch += c.hitByPitch;
        sums.sacFlies += c.sacFlies;
        sums.totalBases += c.totalBases;
        if (split.player) {
          qualified.push({ id: split.player.id, counting: c });
        }
      });

      const lgObp =
        (sums.hits + sums.baseOnBalls + sums.hitByPitch) /
        (sums.atBats + sums.baseOnBalls + sums.hitByPitch + sums.sacFlies);
      const lgSlg = sums.totalBases / sums.atBats;

      function opsPlusFor(c) {
        const obp = calcObp(c);
        const slg = calcSlg(c);
        if (obp === null || slg === null) return null;
        return Math.round(100 * (obp / lgObp + slg / lgSlg - 1));
      }

      const ranked = qualified
        .map((q) => ({ id: q.id, opsPlus: opsPlusFor(q.counting) }))
        .filter((q) => q.opsPlus !== null)
        .sort((a, b) => b.opsPlus - a.opsPlus);
      ranked.forEach((q, i) => (q.rank = i + 1));
      const totalQualified = ranked.length;
      const rankById = new Map(ranked.map((q) => [q.id, q.rank]));

      // 2. Reds roster — hitters only (pitchers excluded).
      const rosterData = await fetchJson(rosterUrl());
      const hitters = (rosterData.roster || []).filter(
        (p) => p.position && p.position.type !== "Pitcher"
      );

      // 3. Each Reds hitter's own season line.
      const statResults = await Promise.all(
        hitters.map((p) => fetchJson(playerStatsUrl(p.person.id, season)).catch(() => null))
      );

      const redsHitters = hitters
        .map((p, i) => {
          const data = statResults[i];
          const split =
            data && data.stats && data.stats[0] && data.stats[0].splits && data.stats[0].splits[0];
          if (!split) return null;
          const c = extractCounting(split.stat);
          if (c.plateAppearances < MIN_PLATE_APPEARANCES) return null;
          const opsPlus = opsPlusFor(c);
          if (opsPlus === null) return null;
          return {
            id: p.person.id,
            name: p.person.fullName,
            opsPlus,
            rank: rankById.get(p.person.id) || null,
          };
        })
        .filter(Boolean)
        .sort((a, b) => b.opsPlus - a.opsPlus);

      if (!redsHitters.length) {
        body.innerHTML = '<p class="standings-error">No hitting stats available yet.</p>';
        return;
      }

      body.innerHTML = redsHitters
        .map((h) => {
          const colorClass = h.opsPlus >= 110 ? "ops-good" : h.opsPlus < 90 ? "ops-bad" : "ops-mid";
          const rankLabel = h.rank
            ? `#${h.rank} of ${totalQualified} in MLB`
            : "Not enough PAs to qualify";
          return `
            <div class="ops-row">
              <div class="ops-name-block">
                <div class="ops-name">${h.name}</div>
                <div class="ops-rank">${rankLabel}</div>
              </div>
              <div class="ops-value ${colorClass}">${h.opsPlus}</div>
            </div>`;
        })
        .join("");
    } catch (err) {
      console.error("Seeing Red: failed to load OPS+ leaderboard", err);
      body.innerHTML =
        '<p class="standings-error">Couldn\'t load hitting stats right now. Refresh to try again.</p>';
    }
  }

  function init() {
    document.querySelectorAll("[data-ops-plus-widget]").forEach(loadOpsPlus);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
