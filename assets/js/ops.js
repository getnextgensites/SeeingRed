/**
 * Seeing Red — Reds hitters, ranked by OPS
 *
 * OPS (on-base % + slugging %) is a simple, widely-used measure of a
 * hitter's overall production. This builds its own full-league ranking
 * by pulling every team's active roster with hitting stats embedded
 * ("hydrated") in one call per team — 30 calls total, one per MLB club.
 *
 * Why not just use MLB's official OPS leaderboard? Because that endpoint
 * only includes "qualified" hitters (roughly 300+ plate appearances,
 * scaling with games played) — bench players and part-timers never show
 * up there no matter how high you set the result limit. Building the
 * ranking ourselves from every active roster means every Reds hitter with
 * a meaningful number of plate appearances gets a real rank, not just the
 * regulars.
 *
 * Data source: https://statsapi.mlb.com/api/v1
 *   - /teams?sportId=1&activeStatus=Yes                  all 30 MLB teams
 *   - /teams/{id}/roster?hydrate=person(stats(...))       roster + season OPS, one call per team
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

  function teamsUrl() {
    return `https://statsapi.mlb.com/api/v1/teams?sportId=1&activeStatus=Yes`;
  }

  function hydratedRosterUrl(teamId, season) {
    return `https://statsapi.mlb.com/api/v1/teams/${teamId}/roster?rosterType=active&hydrate=person(stats(type=season,group=hitting,season=${season}))`;
  }

  async function fetchJson(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error("Request failed: " + res.status);
    return res.json();
  }

  function extractHitterFromRosterEntry(entry) {
    if (!entry.position || entry.position.type === "Pitcher") return null;
    const person = entry.person;
    if (!person || !person.stats) return null;
    const hittingSplit =
      person.stats
        .find((s) => s.group && s.group.displayName === "hitting") ?.splits?.[0];
    if (!hittingSplit) return null;
    const stat = hittingSplit.stat;
    const pa = parseInt(stat.plateAppearances, 10) || 0;
    if (pa < MIN_PLATE_APPEARANCES) return null;
    const opsNum = parseFloat(stat.ops);
    if (isNaN(opsNum)) return null;
    return {
      id: person.id,
      name: person.fullName,
      teamId: entry.parentTeamId,
      opsDisplay: stat.ops,
      opsNum,
    };
  }

  async function loadOps(widget) {
    const body = widget.querySelector("[data-ops-body]");
    const season = currentSeason();

    try {
      const teamsData = await fetchJson(teamsUrl());
      const teamIds = (teamsData.teams || []).map((t) => t.id);

      const rosterResults = await Promise.all(
        teamIds.map((id) => fetchJson(hydratedRosterUrl(id, season)).catch(() => null))
      );

      const allHitters = [];
      rosterResults.forEach((data) => {
        if (!data || !data.roster) return;
        data.roster.forEach((entry) => {
          const hitter = extractHitterFromRosterEntry(entry);
          if (hitter) allHitters.push(hitter);
        });
      });

      allHitters.sort((a, b) => b.opsNum - a.opsNum);
      allHitters.forEach((h, i) => (h.rank = i + 1));
      const totalRanked = allHitters.length;

      const redsHitters = allHitters
        .filter((h) => h.teamId === REDS_TEAM_ID)
        .sort((a, b) => b.opsNum - a.opsNum);

      if (!redsHitters.length) {
        body.innerHTML = '<p class="standings-error">No hitting stats available yet.</p>';
        return;
      }

      body.innerHTML = redsHitters
        .map((h) => {
          const colorClass = h.opsNum >= 0.8 ? "ops-good" : h.opsNum < 0.7 ? "ops-bad" : "ops-mid";
          return `
            <div class="ops-row">
              <div class="ops-name-block">
                <div class="ops-name">${h.name}</div>
                <div class="ops-rank">#${h.rank} of ${totalRanked} in MLB</div>
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
