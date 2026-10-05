import { AudioEngine, yToMidi } from "./audio.js";
import { loadJSON, saveJSON, clearAll } from "./save.js";
import { AchievementTracker } from "./achievements.js";
import { CONSTELLATIONS } from "./constellations.js";
import { UI } from "./ui.js";
import {
  makeBody,
  FieldStars,
  ShootingStars,
  stepFreeBodies,
  stepConstellationBodies,
  checkChimes,
  layoutConstellationPoints,
  matchConstellation,
} from "./sim.js";

const canvas = document.getElementById("sky");
const ctx = canvas.getContext("2d");
const ui = new UI(document.body);

const settings = Object.assign(
  { volume: 50, soundOn: true, particleDensity: 1, reducedMotion: false },
  loadJSON("settings", {})
);

const audio = new AudioEngine();
audio.setVolume(settings.volume / 100);

let completedLevels = new Set(loadJSON("completed-levels", []));

const tracker = new AchievementTracker((def) => {
  ui.toast(def);
  audio.achievement();
});

let width = 0, height = 0, dpr = 1;
function resize() {
  dpr = Math.min(2, window.devicePixelRatio || 1);
  width = window.innerWidth;
  height = window.innerHeight;
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  canvas.style.width = width + "px";
  canvas.style.height = height + "px";
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  if (fieldStars) fieldStars.resize(baseStarCount(), width, height);
}
function baseStarCount() {
  return Math.round(120 * settings.particleDensity);
}

let fieldStars = new FieldStars(baseStarCount(), window.innerWidth, window.innerHeight);
const shootingStars = new ShootingStars(() => tracker.recordShootingStar());
window.addEventListener("resize", resize);
window.addEventListener("orientationchange", resize);
if (window.visualViewport) {
  window.visualViewport.addEventListener("resize", resize);
}

let mode = null; // "free" | "constellation"
let bodies = [];
let currentLevel = null;
let currentLevelIndex = -1;
let targetPoints = [];
let levelSolved = false;
const prevPairs = new Map();
let appState = "title"; // title | menu | playing-free | level-select | playing-constellation | settings | achievements | credits | paused
let pausedFrom = null;
let dragStart = null;
let dragBody = null;
let longPressTimer = null;

function goTo(state) {
  appState = state;
  ui.hideAllScreens();
  ui.setHint("");
  switch (state) {
    case "title":
      ui.show("title");
      ui.setHud(false);
      break;
    case "menu":
      ui.show("modeSelect");
      ui.setHud(false);
      ui.renderModeSelect({ done: completedLevels.size, total: CONSTELLATIONS.length });
      ui.renderLevelPicker(startConstellation, completedLevels);
      break;
    case "playing-free":
      ui.setHud(true);
      ui.setHint("Klicken: Stern setzen · Ziehen: Schwung geben · Rechtsklick/Halten: entfernen");
      break;
    case "playing-constellation":
      ui.setHud(true);
      ui.setHint(currentLevel ? currentLevel.hint : "");
      break;
    case "settings":
      ui.show("settings");
      ui.setHud(false);
      fillSettingsForm();
      break;
    case "achievements":
      ui.show("achievements");
      ui.setHud(false);
      ui.renderAchievements(tracker);
      break;
    case "credits":
      ui.show("credits");
      ui.setHud(false);
      break;
    case "help":
      ui.show("help");
      break;
    case "paused":
      ui.show("pause");
      ui.setHud(false);
      break;
  }
}

function startFree() {
  audio.setOn(settings.soundOn);
  mode = "free";
  bodies = [];
  prevPairs.clear();
  levelSolved = false;
  goTo("playing-free");
}

function startConstellation(level, index) {
  audio.setOn(settings.soundOn);
  mode = "constellation";
  currentLevel = level;
  currentLevelIndex = index;
  bodies = [];
  prevPairs.clear();
  levelSolved = false;
  targetPoints = layoutConstellationPoints(level, width, height);
  goTo("playing-constellation");
}

function fillSettingsForm() {
  const panel = ui.screens.settings;
  if (!panel) return;
  const vol = panel.querySelector("[data-set-volume]");
  const sound = panel.querySelector("[data-set-sound]");
  const density = panel.querySelector("[data-set-density]");
  const reduced = panel.querySelector("[data-set-reduced]");
  if (vol) vol.value = settings.volume;
  if (sound) sound.checked = settings.soundOn;
  if (density) density.value = Math.round(settings.particleDensity * 100);
  if (reduced) reduced.checked = settings.reducedMotion;
}

function persistSettings() {
  saveJSON("settings", settings);
}

function addBodyAt(x, y, vx = 0, vy = 0) {
  if (mode === "constellation" && bodies.length >= targetPoints.length + 4) return;
  const voiceIdx = Math.floor(Math.random() * 4);
  const b = makeBody(x, y, voiceIdx, vx, vy);
  bodies.push(b);
  tracker.recordBodyPlaced();
  const midi = yToMidi(y, height);
  audio.pluck(midi, 0.3, voiceIdx);
  return b;
}

function removeNearest(x, y) {
  if (!bodies.length) return;
  let best = -1, bestDist = Infinity;
  bodies.forEach((b, i) => {
    const d = Math.hypot(b.x - x, b.y - y);
    if (d < bestDist) { bestDist = d; best = i; }
  });
  if (best >= 0 && bestDist < 60) bodies.splice(best, 1);
}

function checkConstellationSolved() {
  if (mode !== "constellation" || levelSolved || !currentLevel) return;
  const tolerance = Math.min(width, height) * 0.045;
  if (matchConstellation(bodies, targetPoints, tolerance)) {
    levelSolved = true;
    completedLevels.add(currentLevel.id);
    saveJSON("completed-levels", Array.from(completedLevels));
    audio.success();
    tracker.recordConstellationCompleted(bodies.length === targetPoints.length);
    ui.setHint(`${currentLevel.name} gelöst! Esc für das Menü.`);
  }
}

function drawConstellationTargets() {
  if (mode !== "constellation") return;
  ctx.save();
  targetPoints.forEach((p) => {
    ctx.beginPath();
    ctx.arc(p.x, p.y, 10, 0, Math.PI * 2);
    ctx.strokeStyle = levelSolved ? "rgba(201,162,74,0.9)" : "rgba(201,162,74,0.35)";
    ctx.lineWidth = 2;
    ctx.setLineDash([3, 4]);
    ctx.stroke();
  });
  ctx.restore();
}

function drawBodies() {
  for (const b of bodies) {
    const hue = [42, 196, 266, 18][b.voiceIdx] + b.hueJitter;
    const grad = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.radius * 3.2);
    grad.addColorStop(0, `hsla(${hue}, 85%, 78%, 0.95)`);
    grad.addColorStop(0.4, `hsla(${hue}, 85%, 60%, 0.35)`);
    grad.addColorStop(1, `hsla(${hue}, 85%, 50%, 0)`);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.radius * 3.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = `hsla(${hue}, 90%, 85%, 1)`;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.radius * 0.55, 0, Math.PI * 2);
    ctx.fill();
  }
}

let lastT = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - lastT) / 1000);
  lastT = now;
  const playing = appState === "playing-free" || appState === "playing-constellation";

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#0b0d1a";
  ctx.fillRect(0, 0, width, height);

  if (!settings.reducedMotion) fieldStars.step(dt);
  fieldStars.draw(ctx);
  if (!settings.reducedMotion) shootingStars.step(dt, width, height);
  shootingStars.draw(ctx);

  if (playing) {
    if (mode === "free") {
      stepFreeBodies(bodies, dt, width, height);
    } else {
      stepConstellationBodies(bodies, dt, now / 1000);
    }
    checkChimes(bodies, prevPairs, width, height, (midi, voiceIdx) => {
      audio.pluck(midi, 0.22, voiceIdx);
      tracker.recordChime();
    });
    drawConstellationTargets();
    drawBodies();
    checkConstellationSolved();
    tracker.tick(dt, settings.soundOn);
  }

  requestAnimationFrame(frame);
}

function pointerDown(e) {
  if (appState !== "playing-free" && appState !== "playing-constellation") return;
  const x = e.clientX, y = e.clientY;
  if (e.button === 2) {
    removeNearest(x, y);
    return;
  }
  dragStart = { x, y, t: performance.now() };
  longPressTimer = setTimeout(() => {
    removeNearest(x, y);
    dragStart = null;
  }, 550);
}

function pointerUp(e) {
  if (!dragStart) return;
  clearTimeout(longPressTimer);
  const x = e.clientX, y = e.clientY;
  const dx = x - dragStart.x, dy = y - dragStart.y;
  const dist = Math.hypot(dx, dy);
  const dtMs = performance.now() - dragStart.t;
  const tapTolerance = e.pointerType === "touch" ? 16 : 8;
  if (dist < tapTolerance) {
    addBodyAt(x, y);
  } else {
    const speed = Math.min(260, dist) / Math.max(40, dtMs);
    addBodyAt(dragStart.x, dragStart.y, dx * speed * 0.18, dy * speed * 0.18);
  }
  dragStart = null;
}

canvas.addEventListener("contextmenu", (e) => e.preventDefault());
canvas.addEventListener("pointerdown", pointerDown);
canvas.addEventListener("pointerup", pointerUp);
canvas.addEventListener("pointerleave", () => clearTimeout(longPressTimer));
canvas.addEventListener("touchmove", (e) => e.preventDefault(), { passive: false });
canvas.addEventListener("touchstart", (e) => e.preventDefault(), { passive: false });

window.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    if (appState === "playing-free" || appState === "playing-constellation") {
      pausedFrom = appState;
      goTo("paused");
    } else if (appState === "paused") {
      goTo(pausedFrom);
    } else if (["settings", "achievements", "credits", "help"].includes(appState)) {
      goTo("menu");
    }
  } else if (e.key === " " && (appState === "playing-free" || appState === "playing-constellation")) {
    e.preventDefault();
    settings.soundOn = !settings.soundOn;
    audio.setOn(settings.soundOn);
    persistSettings();
  } else if ((e.key === "h" || e.key === "H") && appState !== "title") {
    goTo(appState === "help" ? (pausedFrom || "menu") : (pausedFrom = appState, "help"));
  } else if ((e.key === "s" || e.key === "S") && (appState === "playing-free" || appState === "playing-constellation")) {
    savePng();
  }
});

function savePng() {
  try {
    const link = document.createElement("a");
    link.download = `orrery-${Date.now()}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
    tracker.recordImageSaved();
  } catch (e) {
    console.warn("Orrery: Bild konnte nicht gespeichert werden.", e);
  }
}

function wireButtons() {
  document.querySelectorAll("[data-action]").forEach((btn) => {
    btn.addEventListener("click", () => {
      audio.uiClick();
      const action = btn.getAttribute("data-action");
      handleAction(action);
    });
    btn.addEventListener("pointerenter", () => audio.uiHover());
  });
}

async function handleAction(action) {
  switch (action) {
    case "start-free":
      startFree();
      break;
    case "goto-menu":
      goTo("menu");
      break;
    case "goto-title":
      goTo("title");
      break;
    case "goto-settings":
      pausedFrom = appState === "settings" ? pausedFrom : appState;
      goTo("settings");
      break;
    case "goto-achievements":
      pausedFrom = appState;
      goTo("achievements");
      break;
    case "goto-credits":
      pausedFrom = appState;
      goTo("credits");
      break;
    case "goto-help":
      pausedFrom = appState;
      goTo("help");
      break;
    case "resume":
      goTo(pausedFrom || "menu");
      break;
    case "restart-level":
      if (mode === "constellation" && currentLevel) startConstellation(currentLevel, currentLevelIndex);
      else if (mode === "free") startFree();
      break;
    case "save-png":
      savePng();
      break;
    case "reset-progress": {
      const ok = await ui.confirm("Wirklich den gesamten Fortschritt (Erfolge, gelöste Konstellationen, Einstellungen) löschen?");
      if (ok) {
        clearAll();
        completedLevels = new Set();
        location.reload();
      }
      break;
    }
  }
}

function wireSettingsInputs() {
  const panel = ui.screens.settings;
  if (!panel) return;
  panel.querySelector("[data-set-volume]")?.addEventListener("input", (e) => {
    settings.volume = Number(e.target.value);
    audio.setVolume(settings.volume / 100);
    persistSettings();
  });
  panel.querySelector("[data-set-sound]")?.addEventListener("change", (e) => {
    settings.soundOn = e.target.checked;
    audio.setOn(settings.soundOn);
    persistSettings();
  });
  panel.querySelector("[data-set-density]")?.addEventListener("input", (e) => {
    settings.particleDensity = Number(e.target.value) / 100;
    persistSettings();
    fieldStars.resize(baseStarCount(), width, height);
  });
  panel.querySelector("[data-set-reduced]")?.addEventListener("change", (e) => {
    settings.reducedMotion = e.target.checked;
    persistSettings();
  });
}

resize();
wireButtons();
wireSettingsInputs();
goTo("title");
requestAnimationFrame((t) => { lastT = t; requestAnimationFrame(frame); });
