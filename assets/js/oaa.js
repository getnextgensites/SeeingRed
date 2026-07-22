/**
 * Seeing Red — Reds defense, ranked by Outs Above Average (OAA)
 *
 * bWAR and dWAR (Baseball-Reference's calculations) aren't available here —
 * Baseball-Reference has no public API, and WAR in general requires
 * proprietary defensive/baserunning models that no free API exposes,
 * including MLB's own Stats API (it has no WAR category at all).
 *
 * Outs Above Average is the closest honest substitute: it's MLB's own
 * modern, publicly published Statcast defensive metric — how many outs a
 * fielder's range is worth compared to an average defender at that
 * position. It's not dWAR, but it's real, live, and free.
 *
 * Data source: Baseball Savant (Statcast) —
 * https://baseballsavant.mlb.com/leaderboard/outs_above_average
 * This is a different site than the MLB Stats API used elsewhere on this
 * page, so if it ever blocks direct browser requests, this widget falls
 * back to a friendly error instead of breaking the page.
 */

(function () {
  const REDS_DISPLAY_NAME = "Reds";

  function currentSeason() {
    const now = new Date();
    const month = now.getMonth() + 1;
    let year = now.getFullYear();
    if (month <= 2) year -= 1;
    return year;
  }

  function oaaUrl(season) {
    return `https://baseballsavant.mlb.com/leaderboard/outs_above_average?type=Fielder&season=${season}&csv=true`;
  }

  // Small CSV parser that respects quoted fields with embedded commas
  // (player names come through as "Last, First" inside quotes).
  function parseCsvLine(line) {
    const fields = [];
    let cur = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQuotes) {
        if (ch === '"') {
          if (line[i + 1] === '"') {
            cur += '"';
            i++;
          } else {
            inQuotes = false;
          }
        } else {
          cur += ch;
        }
      } else if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        fields.push(cur);
        cur = "";
      } else {
        cur += ch;
      }
    }
    fields.push(cur);
    return fields;
  }

  function parseCsv(text) {
    const clean = text.replace(/^﻿/, "");
    const lines = clean.split(/\r?\n/).filter((l) => l.trim().length);
    if (!lines.length) return [];
    const header = parseCsvLine(lines[0]);
    return lines.slice(1).map((line) => {
      const values = parseCsvLine(line);
      const row = {};
      header.forEach((h, i) => (row[h] = values[i]));
      return row;
    });
  }

  // CSV gives "Last, First" — flip to "First Last" for display.
  function formatName(lastFirst) {
    if (!lastFirst) return "";
    const parts = lastFirst.split(",").map((s) => s.trim());
    return parts.length === 2 ? `${parts[1]} ${parts[0]}` : lastFirst;
  }

  async function loadOaa(widget) {
    const body = widget.querySelector("[data-oaa-body]");
    const season = currentSeason();

    try {
      const res = await fetch(oaaUrl(season));
      if (!res.ok) throw new Error("OAA request failed: " + res.status);
      const text = await res.text();
      const rows = parseCsv(text);

      const allFielders = rows
        .map((r) => ({
          name: r["last_name, first_name"],
          team: r["display_team_name"],
          pos: r["primary_pos_formatted"],
          oaa: parseInt(r["outs_above_average"], 10),
        }))
        .filter((r) => r.name && !isNaN(r.oaa));

      const ranked = allFielders.slice().sort((a, b) => b.oaa - a.oaa);
      ranked.forEach((r, i) => (r.rank = i + 1));
      const total = ranked.length;

      const redsFielders = ranked
        .filter((r) => r.team === REDS_DISPLAY_NAME)
        .sort((a, b) => b.oaa - a.oaa);

      if (!redsFielders.length) {
        body.innerHTML = '<p class="standings-error">No defensive stats available yet.</p>';
        return;
      }

      body.innerHTML = redsFielders
        .map((r) => {
          const colorClass = r.oaa > 2 ? "ops-good" : r.oaa < -2 ? "ops-bad" : "ops-mid";
          const oaaLabel = r.oaa > 0 ? `+${r.oaa}` : `${r.oaa}`;
          return `
            <div class="ops-row">
              <div class="ops-name-block">
                <div class="ops-name">${formatName(r.name)} <span class="ops-pos">${r.pos}</span></div>
                <div class="ops-rank">#${r.rank} of ${total} in MLB</div>
              </div>
              <div class="ops-value ${colorClass}">${oaaLabel}</div>
            </div>`;
        })
        .join("");
    } catch (err) {
      console.error("Seeing Red: failed to load OAA leaderboard", err);
      body.innerHTML =
        '<p class="standings-error">Couldn\'t load defensive stats right now. Refresh to try again.</p>';
    }
  }

  function init() {
    document.querySelectorAll("[data-oaa-widget]").forEach(loadOaa);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
