/**
 * Seeing Red — live MLB standings widget
 * Pulls from the free, public MLB Stats API (no key required) and renders
 * NL + AL standings with the Cincinnati Reds row highlighted.
 *
 * Data source: https://statsapi.mlb.com/api/v1/standings
 * Docs (community-reverse-engineered, MLB has no official public docs):
 * https://github.com/toddrob99/MLB-StatsAPI/wiki
 */

(function () {
  const REDS_TEAM_ID = 113;
  const AL_LEAGUE_ID = 103;
  const NL_LEAGUE_ID = 104;

  const DIVISION_ORDER = ["East", "Central", "West"];

  const STANDINGS_URL = (season) =>
    `https://statsapi.mlb.com/api/v1/standings?leagueId=${AL_LEAGUE_ID},${NL_LEAGUE_ID}&season=${season}&standingsTypes=regularSeason`;

  function currentSeason() {
    // MLB season roughly runs March–October; if we're in the off-season
    // (Nov/Dec/Jan/Feb) still show the most recently completed season.
    const now = new Date();
    const month = now.getMonth() + 1; // 1-12
    let year = now.getFullYear();
    if (month <= 2) year -= 1;
    return year;
  }

  function pct(n) {
    if (n === null || n === undefined) return "—";
    return String(n).replace(/^0/, "");
  }

  function streakLabel(streak) {
    if (!streak || !streak.streakCode) return "—";
    return streak.streakCode;
  }

  function buildDivisionTable(division) {
    const teams = division.teamRecords.slice().sort((a, b) => {
      const ra = a.divisionRank ? parseInt(a.divisionRank, 10) : 99;
      const rb = b.divisionRank ? parseInt(b.divisionRank, 10) : 99;
      return ra - rb;
    });

    const rows = teams
      .map((tr) => {
        const isReds = tr.team && tr.team.id === REDS_TEAM_ID;
        // The standings endpoint already returns short club nicknames
        // (e.g. "Reds", "White Sox") in team.name — no mapping needed.
        const name = tr.team ? tr.team.name : "—";
        const gb = tr.gamesBack === "-" ? "—" : tr.gamesBack || "—";
        return `
          <tr class="${isReds ? "reds-row" : ""}">
            <td>${name}</td>
            <td>${tr.wins ?? "—"}</td>
            <td>${tr.losses ?? "—"}</td>
            <td>${pct(tr.winningPercentage)}</td>
            <td>${gb}</td>
            <td>${streakLabel(tr.streak)}</td>
          </tr>`;
      })
      .join("");

    return `
      <div class="division-block">
        <div class="division-title">${division.divisionName}</div>
        <table class="standings-table">
          <thead>
            <tr>
              <th>Team</th>
              <th>W</th>
              <th>L</th>
              <th>PCT</th>
              <th>GB</th>
              <th>Str</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`;
  }

  function sortDivisions(divisions) {
    return divisions.sort((a, b) => {
      const ia = DIVISION_ORDER.findIndex((d) => a.divisionName.includes(d));
      const ib = DIVISION_ORDER.findIndex((d) => b.divisionName.includes(d));
      return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
    });
  }

  async function loadStandings(container) {
    const season = currentSeason();
    const alPane = container.querySelector('[data-league-pane="AL"]');
    const nlPane = container.querySelector('[data-league-pane="NL"]');
    const updatedEl = container.querySelector("[data-standings-updated]");

    try {
      const res = await fetch(STANDINGS_URL(season));
      if (!res.ok) throw new Error("Standings request failed: " + res.status);
      const data = await res.json();

      const alDivisions = [];
      const nlDivisions = [];

      (data.records || []).forEach((record) => {
        const leagueId = record.league && record.league.id;
        const divisionName =
          (record.division && record.division.name) || "Division";
        const entry = {
          divisionName: divisionName.replace(/^(American|National) League /, ""),
          teamRecords: record.teamRecords || [],
        };
        if (leagueId === AL_LEAGUE_ID) alDivisions.push(entry);
        else if (leagueId === NL_LEAGUE_ID) nlDivisions.push(entry);
      });

      if (alPane) {
        alPane.innerHTML = sortDivisions(alDivisions)
          .map(buildDivisionTable)
          .join("");
      }
      if (nlPane) {
        nlPane.innerHTML = sortDivisions(nlDivisions)
          .map(buildDivisionTable)
          .join("");
      }
      if (updatedEl) {
        const now = new Date();
        updatedEl.textContent =
          "Updated " +
          now.toLocaleDateString(undefined, { month: "short", day: "numeric" }) +
          " at " +
          now.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
      }
    } catch (err) {
      console.error("Seeing Red: failed to load standings", err);
      if (alPane) {
        alPane.innerHTML =
          '<p class="standings-error">Couldn\'t load standings right now. Refresh to try again.</p>';
      }
      if (nlPane) {
        nlPane.innerHTML = "";
      }
    }
  }

  function initToggle(container) {
    const buttons = container.querySelectorAll("[data-league-btn]");
    const panes = container.querySelectorAll("[data-league-pane]");
    buttons.forEach((btn) => {
      btn.addEventListener("click", () => {
        const target = btn.getAttribute("data-league-btn");
        buttons.forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        panes.forEach((p) => {
          p.style.display =
            p.getAttribute("data-league-pane") === target ? "block" : "none";
        });
      });
    });
  }

  function init() {
    document.querySelectorAll("[data-standings-widget]").forEach((widget) => {
      initToggle(widget);
      loadStandings(widget);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
