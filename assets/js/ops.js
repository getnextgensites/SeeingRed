/**
 * Seeing Red — Reds hitters, ranked by OPS
 *
 * OPS (on-base % + slugging %) is a simple, widely-used measure of a
 * hitter's overall production. This pulls each Reds hitter's live OPS
 * from the free public MLB Stats API, plus their official rank against
 * every qualified hitter in the majors this season.
 *
 * Data source: https://statsapi.mlb.com/api/v1
 *   - /teams/113/roster            Reds active roster
 *   - /people/{id}/stats           each hitter's season OPS
 *   - /stats/leaders                MLB-wide OPS leaderboard (for rank)
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

  function leadersUrl(season) {
    return `https://statsapi.mlb.com/api/v1/stats/leaders?leaderCategories=onBasePlusSlugging&season=${season}&sportId=1&statGroup=hitting&limit=300`;
  }

  async function fetchJson(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error("Request failed: " + res.status);
    return res.json();
  }

  async function loadOps(widget) {
    const body = widget.querySelector("[data-ops-body]");
    const season = currentSeason();

    try {
      // 1. Official MLB-wide OPS leaderboard — gives us a real rank
      //    ("#22 of 148 in MLB") instead of anything self-calculated.
      const leadersData = await fetchJson(leadersUrl(season));
      const leaders =
        (leadersData.leagueLeaders &&
          leadersData.leagueLeaders[0] &&
          leadersData.leagueLeaders[0].leaders) ||
        [];
      const totalQualified = leaders.length;
      const rankById = new Map(
        leaders.filter((l) => l.person).map((l) => [l.person.id, l.rank])
      );

      // 2. Reds roster — hitters only (pitchers excluded).
      const rosterData = await fetchJson(rosterUrl());
      const hitters = (rosterData.roster || []).filter(
        (p) => p.position && p.position.type !== "Pitcher"
      );

      // 3. Each Reds hitter's own season OPS.
      const statResults = await Promise.all(
        hitters.map((p) => fetchJson(playerStatsUrl(p.person.id, season)).catch(() => null))
      );

      const redsHitters = hitters
        .map((p, i) => {
          const data = statResults[i];
          const split =
            data && data.stats && data.stats[0] && data.stats[0].splits && data.stats[0].splits[0];
          if (!split) return null;
          const stat = split.stat;
          const pa = parseInt(stat.plateAppearances, 10) || 0;
          if (pa < MIN_PLATE_APPEARANCES) return null;
          const opsNum = parseFloat(stat.ops);
          if (isNaN(opsNum)) return null;
          return {
            id: p.person.id,
            name: p.person.fullName,
            opsDisplay: stat.ops,
            opsNum,
            rank: rankById.get(p.person.id) || null,
          };
        })
        .filter(Boolean)
        .sort((a, b) => b.opsNum - a.opsNum);

      if (!redsHitters.length) {
        body.innerHTML = '<p class="standings-error">No hitting stats available yet.</p>';
        return;
      }

      body.innerHTML = redsHitters
        .map((h) => {
          const colorClass = h.opsNum >= 0.8 ? "ops-good" : h.opsNum < 0.7 ? "ops-bad" : "ops-mid";
          const rankLabel = h.rank
            ? `#${h.rank} of ${totalQualified} in MLB`
            : "Not enough PAs to qualify";
          return `
            <div class="ops-row">
              <div class="ops-name-block">
                <div class="ops-name">${h.name}</div>
                <div class="ops-rank">${rankLabel}</div>
              </div>
              <div class="ops-value ${colorClass}">${h.opsDisplay}</div>
            </div>`;
        })
        .join("");
    } catch (err) {
      console.error("Seeing Red: failed to load OPS leaderboard", err);
      body.innerHTML =
        '<p class="standings-error">Couldn\'t load hitting stats right now. Refresh to try again.</p>';
    }
  }

  function init() {
    document.querySelectorAll("[data-ops-widget]").forEach(loadOps);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
