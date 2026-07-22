/**
 * Seeing Red Meter
 * Renders the fan-anger gauge (1–10) used on every post.
 *
 * Usage on a full post page:
 *   <div id="meter" class="widget meter-widget"></div>
 *   <script src="../assets/js/seeing-red-meter.js"></script>
 *   <script>renderSeeingRedMeter(7, "meter");</script>
 *
 * Usage as a small inline bar on a homepage post card:
 *   <div data-mini-meter="7"></div>
 *   (rendered automatically on page load — see initMiniMeters below)
 */

const SEEING_RED_LEVELS = [
  { max: 1, label: "Fully Chill", color: "#3fae4a" },
  { max: 2, label: "Barely Bothered", color: "#3fae4a" },
  { max: 3, label: "Mildly Miffed", color: "#7fbf4a" },
  { max: 4, label: "Grumbling", color: "#e8c93a" },
  { max: 5, label: "Getting Warm", color: "#e8c93a" },
  { max: 6, label: "Heated", color: "#e07b1f" },
  { max: 7, label: "Seeing Red", color: "#e07b1f" },
  { max: 8, label: "Full Rage", color: "#c6011f" },
  { max: 9, label: "Throwing Remotes", color: "#c6011f" },
  { max: 10, label: "Nuclear Meltdown", color: "#7a0011" },
];

function seeingRedLevel(score) {
  const clamped = Math.max(1, Math.min(10, Number(score) || 1));
  const level = SEEING_RED_LEVELS.find((l) => clamped <= l.max) ||
    SEEING_RED_LEVELS[SEEING_RED_LEVELS.length - 1];
  return { score: clamped, label: level.label, color: level.color };
}

function renderSeeingRedMeter(score, containerId) {
  const el = document.getElementById(containerId);
  if (!el) return;
  const { score: clamped, label, color } = seeingRedLevel(score);
  const pct = (clamped / 10) * 100;

  el.innerHTML = `
    <h3>Seeing Red Meter</h3>
    <div class="widget-sub">How mad should the fanbase be?</div>
    <div class="meter-gauge">
      <div class="meter-readout">${clamped}<span>/10</span></div>
      <div class="meter-label" style="color:${color}">${label}</div>
      <div class="meter-scale-bar">
        <div class="meter-scale-marker" style="left:${pct}%"></div>
      </div>
      <div class="meter-scale-labels">
        <span>Chill</span>
        <span>Meltdown</span>
      </div>
    </div>
  `;
}

function initMiniMeters() {
  document.querySelectorAll("[data-mini-meter]").forEach((el) => {
    const score = el.getAttribute("data-mini-meter");
    const { score: clamped, label, color } = seeingRedLevel(score);
    const pct = (clamped / 10) * 100;
    el.classList.add("mini-meter");
    el.innerHTML = `
      <span>${label}</span>
      <span class="mini-meter-bar">
        <span class="mini-meter-fill" style="width:${pct}%; background:${color}"></span>
      </span>
      <span>${clamped}/10</span>
    `;
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initMiniMeters);
} else {
  initMiniMeters();
}
