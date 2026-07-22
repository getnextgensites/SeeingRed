/**
 * Seeing Red — Reds pitchers, ranked by ERA and WHIP
 *
 * ERA (earned run average) and WHIP (walks + hits per inning pitched) are
 * both plain official MLB stats — no estimation needed, unlike WAR.
 *
 * Same approach as the OPS widget: rather than relying on MLB's official
 * ERA/WHIP leaderboards (which only include "qualified" pitchers — enough
 * innings pitched to scale with games played, which excludes most relief
 * pitchers no matter the result limit), this builds its own ranking from
 * every team's active roster with pitching stats attached ("hydrated"),
 * one call per team. That way every Reds pitcher with a meaningful
 * number of innings gets a real rank, starters and relievers alike.
 *
 * Data source: https://statsapi.mlb.com/api/v1
 *   - /teams?sportId=1&activeStatus=Yes                  all 30 MLB teams
 *   - /teams/{id}/roster?hydrate=person(stats(...))       roster + season ERA/WHIP, one call per team
 */

(function () {
  const REDS_TEAM_ID = 113;
  const MIN_INNINGS_PITCHED = 5; // filters out a single disaster (or dominant) outing

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
    return `https://statsapi.mlb.com/api/v1/teams/${teamId}/roster?rosterType=active&hydrate=person(stats(type=season,group=pitching,season=${season}))`;
  }

  async function fetchJson(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error("Request failed: " + res.status);
    return res.json();
  }

  // MLB formats innings pitched as e.g. "32.2", where the part after the
  // dot is OUTS (0, 1, or 2) — thirds of an inning — not a decimal.
  function parseInnings(ipStr) {
    if (!ipStr) return 0;
    const parts = String(ipStr).split(".");
    const whole = parseInt(parts[0], 10) || 0;
    const thirds = parts[1] ? parseInt(parts[1], 10) : 0;
    return whole + thirds / 3;
  }

  function extractPitcherFromRosterEntry(entry) {
    if (!entry.position || entry.position.type !== "Pitcher") return null;
    const person = entry.person;
    if (!person || !person.stats) return null;
    const pitchingSplit =
      person.stats.find((s) => s.group && s.group.displayName === "pitching") ?.splits ?.[0];
    if (!pitchingSplit) return null;
    const stat = pitchingSplit.stat;
    const ip = parseInnings(stat.inningsPitched);
    if (ip < MIN_INNINGS_PITCHED) return null;
    const era = parseFloat(stat.era);
    const whip = parseFloat(stat.whip);
    if (isNaN(era) || isNaN(whip)) return null;
    return {
      id: person.id,
      name: person.fullName,
      teamId: entry.parentTeamId,
      era,
      whip,
      eraDisplay: stat.era,
      whipDisplay: stat.whip,
    };
  }

  async function loadPitching(widget) {
    const body = widget.querySelector("[data-pitching-body]");
    const season = currentSeason();

    try {
      const teamsData = await fetchJson(teamsUrl());
      const teamIds = (teamsData.teams || []).map((t) => t.id);

      const rosterResults = await Promise.all(
        teamIds.map((id) => fetchJson(hydratedRosterUrl(id, season)).catch(() => null))
      );

      const allPitchers = [];
      rosterResults.forEach((data) => {
        if (!data || !data.roster) return;
        data.roster.forEach((entry) => {
          const p = extractPitcherFromRosterEntry(entry);
          if (p) allPitchers.push(p);
        });
      });

      const totalRanked = allPitchers.length;

      // Lower is better for both ERA and WHIP — and a pitcher's rank in
      // each can differ, so they're ranked independently.
      const byEra = allPitchers.slice().sort((a, b) => a.era - b.era);
      const eraRankById = new Map(byEra.map((p, i) => [p.id, i + 1]));

      const byWhip = allPitchers.slice().sort((a, b) => a.whip - b.whip);
      const whipRankById = new Map(byWhip.map((p, i) => [p.id, i + 1]));

      const redsPitchers = allPitchers
        .filter((p) => p.teamId === REDS_TEAM_ID)
        .map((p) => ({
          ...p,
          eraRank: eraRankById.get(p.id),
          whipRank: whipRankById.get(p.id),
        }))
        .sort((a, b) => a.era - b.era);

      if (!redsPitchers.length) {
        body.innerHTML = '<p class="standings-error">No pitching stats available yet.</p>';
        return;
      }

      body.innerHTML = redsPitchers
        .map((p) => {
          const colorClass = p.era <= 3.5 ? "ops-good" : p.era > 4.5 ? "ops-bad" : "ops-mid";
          return `
            <div class="ops-row">
              <div class="ops-name-block">
                <div class="ops-name">${p.name}</div>
                <div class="ops-rank">ERA #${p.eraRank} · WHIP ${p.whipDisplay} (#${p.whipRank}) of ${totalRanked}</div>
              </div>
              <div class="ops-value ${colorClass}">${p.eraDisplay}</div>
            </div>`;
        })
        .join("");
    } catch (err) {
      console.error("Seeing Red: failed to load pitching leaderboard", err);
      body.innerHTML =
        '<p class="standings-error">Couldn\'t load pitching stats right now. Refresh to try again.</p>';
    }
  }

  function init() {
    document.querySelectorAll("[data-pitching-widget]").forEach(loadPitching);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
