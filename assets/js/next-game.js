/**
 * Seeing Red — next game countdown widget
 * Pulls the Reds' upcoming schedule from the free, public MLB Stats API
 * (no key required) and shows a live countdown to first pitch.
 *
 * Data source: https://statsapi.mlb.com/api/v1/schedule
 */

(function () {
  const REDS_TEAM_ID = 113;

  function scheduleUrl() {
    const start = new Date();
    const end = new Date();
    end.setDate(end.getDate() + 21); // look ahead 3 weeks — always finds the next game
    const fmt = (d) => d.toISOString().slice(0, 10);
    return `https://statsapi.mlb.com/api/v1/schedule?sportId=1&teamId=${REDS_TEAM_ID}&startDate=${fmt(
      start
    )}&endDate=${fmt(end)}&gameType=R`;
  }

  function flattenGames(data) {
    const games = [];
    (data.dates || []).forEach((d) => (d.games || []).forEach((g) => games.push(g)));
    return games.sort((a, b) => new Date(a.gameDate) - new Date(b.gameDate));
  }

  function pickNextGame(games) {
    const live = games.find((g) => g.status && g.status.abstractGameState === "Live");
    if (live) return live;
    return games.find((g) => g.status && g.status.abstractGameState === "Preview");
  }

  function formatDateTime(iso) {
    const d = new Date(iso);
    const dateStr = d.toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
    const timeStr = d.toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
    });
    return `${dateStr} · ${timeStr}`;
  }

  function startCountdown(container, targetIso) {
    const boxes = {
      d: container.querySelector('[data-cd="d"]'),
      h: container.querySelector('[data-cd="h"]'),
      m: container.querySelector('[data-cd="m"]'),
      s: container.querySelector('[data-cd="s"]'),
    };

    function tick() {
      const diff = new Date(targetIso).getTime() - Date.now();
      if (diff <= 0) {
        // Game has started since we loaded — flip to a live-ish message.
        clearInterval(timer);
        const liveEl = container.querySelector("[data-next-game-live]");
        const cdEl = container.querySelector("[data-next-game-countdown]");
        if (liveEl) liveEl.style.display = "block";
        if (cdEl) cdEl.style.display = "none";
        return;
      }
      const totalSeconds = Math.floor(diff / 1000);
      const days = Math.floor(totalSeconds / 86400);
      const hours = Math.floor((totalSeconds % 86400) / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;
      if (boxes.d) boxes.d.textContent = days;
      if (boxes.h) boxes.h.textContent = String(hours).padStart(2, "0");
      if (boxes.m) boxes.m.textContent = String(minutes).padStart(2, "0");
      if (boxes.s) boxes.s.textContent = String(seconds).padStart(2, "0");
    }

    tick();
    const timer = setInterval(tick, 1000);
  }

  async function loadNextGame(widget) {
    const body = widget.querySelector("[data-next-game-body]");
    try {
      const res = await fetch(scheduleUrl());
      if (!res.ok) throw new Error("Schedule request failed: " + res.status);
      const data = await res.json();
      const games = flattenGames(data);
      const game = pickNextGame(games);

      if (!game) {
        body.innerHTML = '<p class="standings-error">No upcoming games found.</p>';
        return;
      }

      const isHome = game.teams.home.team.id === REDS_TEAM_ID;
      const opponent = isHome ? game.teams.away.team.name : game.teams.home.team.name;
      const isLive = game.status && game.status.abstractGameState === "Live";

      body.innerHTML = `
        <div class="next-game-matchup">
          Reds <span class="vs-at">${isHome ? "vs" : "@"}</span> ${opponent}
        </div>
        <div class="next-game-venue">${game.venue ? game.venue.name : ""} · ${formatDateTime(
        game.gameDate
      )}</div>
        <div data-next-game-live class="next-game-live" style="display:${isLive ? "block" : "none"}">
          ⚾ LIVE NOW
        </div>
        <div data-next-game-countdown class="countdown-row" style="display:${isLive ? "none" : "flex"}">
          <div class="countdown-box"><div class="num" data-cd="d">–</div><div class="unit">Days</div></div>
          <div class="countdown-box"><div class="num" data-cd="h">–</div><div class="unit">Hrs</div></div>
          <div class="countdown-box"><div class="num" data-cd="m">–</div><div class="unit">Min</div></div>
          <div class="countdown-box"><div class="num" data-cd="s">–</div><div class="unit">Sec</div></div>
        </div>
      `;

      if (!isLive) {
        startCountdown(widget, game.gameDate);
      }
    } catch (err) {
      console.error("Seeing Red: failed to load next game", err);
      body.innerHTML =
        '<p class="standings-error">Couldn\'t load the schedule right now. Refresh to try again.</p>';
    }
  }

  function init() {
    document.querySelectorAll("[data-next-game-widget]").forEach((widget) => {
      loadNextGame(widget);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
