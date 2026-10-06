import { AudioEngine, yToMidi, SCALE } from "./audio.js";
import { loadJSON, saveJSON, clearAll } from "./save.js";
import { AchievementTracker } from "./achievements.js";
import { CONSTELLATIONS } from "./constellations.js";
import { UI } from "./ui.js";
import {
  makeBody,
  FieldStars,
  ShootingStars,
  RainDrops,
  stepFreeBodies,
  stepConstellationBodies,
  checkChimes,
  layoutConstellationPoints,
  matchConstellation,
  drawLinks,
  drawTrail,
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
  if (rainDrops) rainDrops.resize(90, width, height);
}
function baseStarCount() {
  return Math.round(120 * settings.particleDensity);
}

let fieldStars = new FieldStars(baseStarCount(), window.innerWidth, window.innerHeight);
const shootingStars = new ShootingStars(() => tracker.recordShootingStar());
const rainDrops = new RainDrops(90, window.innerWidth, window.innerHeight);
window.addEventListener("resize", resize);
window.addEventListener("orientationchange", resize);
if (window.visualViewport) {
  window.visualViewport.addEventListener("resize", resize);
}

let mode = null; // "free" | "constellation" | "ember" | "rain" | "memory" | "catch"
let bodies = [];
let currentLevel = null;
let currentLevelIndex = -1;
let targetPoints = [];
let levelSolved = false;
const prevPairs = new Map();
let appState = "title"; // title | menu | playing-<mode> | settings | achievements | credits | paused | levelComplete | miniGameEnd
let pausedFrom = null;
let dragStart = null;
let dragBody = null;
let longPressTimer = null;
let emberTimer = 2;
let lastMiniGame = null; // "memory" | "catch"

const MEMORY_SLOT_COUNT = 6;
let memorySlots = [];
let memorySequence = [];
let memoryPlayerIndex = 0;
let memoryShowing = false;
let memoryShowTimer = 0;
let memoryShowStep = -1;
let memoryLitSlot = -1;
let memoryLitUntil = 0;
let memoryBest = loadJSON("memory-best", 0);

const CATCH_DURATION = 45;
let catchTargets = [];
let catchNextId = 1;
let catchScore = 0;
let catchTimeLeft = 0;
let catchSpawnTimer = 0;
let catchBest = loadJSON("catch-best", 0);

function goTo(state) {
  appState = state;
  ui.hideAllScreens();
  ui.setHint("");
  switch (state) {
    case "title":
      audio.setRain(false);
      ui.show("title");
      ui.setHud(false);
      ui.setTitleSubtitle(completedLevels.size > 0 || tracker.stats.bodiesPlacedTotal > 0);
      break;
    case "menu":
      audio.setRain(false);
      ui.show("modeSelect");
      ui.setHud(false);
      ui.renderConstellationProgress(completedLevels.size, CONSTELLATIONS.length);
      ui.renderMiniGameBests(memoryBest, catchBest);
      break;
    case "levelSelect":
      ui.show("levelSelect");
      ui.setHud(false);
      ui.renderConstellationProgress(completedLevels.size, CONSTELLATIONS.length);
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
    case "playing-ember":
      ui.setHud(true);
      ui.setHint("Lehn dich zurück – dein Himmel spielt von selbst. ✕ zum Verlassen.");
      break;
    case "playing-rain":
      ui.setHud(true);
      ui.setHint("Regennacht – Klicken: Stern setzen · Ziehen: Schwung geben · Rechtsklick/Halten: entfernen");
      break;
    case "playing-memory":
      ui.setHud(true);
      ui.setHint("Schau zu, merk dir die Reihenfolge, dann tippe sie nach.");
      break;
    case "playing-catch":
      ui.setHud(true);
      ui.setHint(`Punkte: 0 · Zeit: ${CATCH_DURATION}s`);
      break;
    case "miniGameEnd":
      ui.show("miniGameEnd");
      ui.setHud(false);
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
    case "levelComplete":
      ui.show("levelComplete");
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

function startEmber() {
  audio.setOn(settings.soundOn);
  mode = "ember";
  bodies = [];
  prevPairs.clear();
  levelSolved = false;
  emberTimer = 0.6;
  goTo("playing-ember");
}

function startRain() {
  audio.setOn(settings.soundOn);
  audio.setRain(true);
  mode = "rain";
  bodies = [];
  prevPairs.clear();
  levelSolved = false;
  goTo("playing-rain");
}

function makeMemorySlots() {
  const hues = [42, 196, 266, 18, 150, 320];
  const cx = width / 2, cy = height / 2 - 10;
  const r = Math.min(width, height) * 0.3;
  const slots = [];
  for (let i = 0; i < MEMORY_SLOT_COUNT; i++) {
    const angle = -Math.PI / 2 + (i / MEMORY_SLOT_COUNT) * Math.PI * 2;
    const midiIdx = Math.floor((i * (SCALE.length - 1)) / (MEMORY_SLOT_COUNT - 1));
    slots.push({
      x: cx + Math.cos(angle) * r,
      y: cy + Math.sin(angle) * r,
      hue: hues[i % hues.length],
      midi: SCALE[midiIdx],
    });
  }
  return slots;
}

function memoryAddStep() {
  memorySequence.push(Math.floor(Math.random() * MEMORY_SLOT_COUNT));
}

function memoryBeginPlayback() {
  memoryShowing = true;
  memoryShowStep = -1;
  memoryShowTimer = 0.55;
  memoryPlayerIndex = 0;
}

function startMemory() {
  audio.setOn(settings.soundOn);
  mode = "memory";
  bodies = [];
  memorySlots = makeMemorySlots();
  memorySequence = [];
  memoryAddStep();
  goTo("playing-memory");
  memoryBeginPlayback();
}

function handleMemoryClick(x, y) {
  if (memoryShowing) return;
  const hitIdx = memorySlots.findIndex((s) => Math.hypot(s.x - x, s.y - y) < 42);
  if (hitIdx === -1) return;
  const expected = memorySequence[memoryPlayerIndex];
  if (hitIdx === expected) {
    audio.pluck(memorySlots[hitIdx].midi, 0.3, 0);
    memoryLitSlot = hitIdx;
    memoryLitUntil = performance.now() + 250;
    memoryPlayerIndex++;
    if (memoryPlayerIndex >= memorySequence.length) {
      memoryAddStep();
      memoryBeginPlayback();
    }
  } else {
    audio.wrongBuzz();
    endMemoryGame();
  }
}

function endMemoryGame() {
  const score = memorySequence.length - 1;
  if (score > memoryBest) {
    memoryBest = score;
    saveJSON("memory-best", memoryBest);
  }
  lastMiniGame = "memory";
  ui.renderMiniGameEnd("Sternenfolge vorbei", `Du hast dir ${score} ${score === 1 ? "Stern" : "Sterne"} gemerkt. Bestleistung: ${memoryBest}.`);
  goTo("miniGameEnd");
}

function drawMemorySlots() {
  const now = performance.now();
  memorySlots.forEach((slot, i) => {
    const lit = i === memoryLitSlot && now < memoryLitUntil;
    const r = lit ? 26 : 16;
    const alpha = lit ? 0.95 : 0.35;
    const grad = ctx.createRadialGradient(slot.x, slot.y, 0, slot.x, slot.y, r * 2);
    grad.addColorStop(0, `hsla(${slot.hue}, 85%, 78%, ${alpha})`);
    grad.addColorStop(1, `hsla(${slot.hue}, 85%, 50%, 0)`);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(slot.x, slot.y, r * 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = `hsla(${slot.hue}, 90%, 85%, ${lit ? 1 : 0.6})`;
    ctx.beginPath();
    ctx.arc(slot.x, slot.y, lit ? 10 : 7, 0, Math.PI * 2);
    ctx.fill();
  });
}

function spawnCatchTarget(elapsedFrac) {
  const margin = 70;
  const maxLife = Math.max(0.9, 1.7 - elapsedFrac * 0.7);
  catchTargets.push({
    id: catchNextId++,
    x: margin + Math.random() * (width - margin * 2),
    y: margin + Math.random() * (height - margin * 2) * 0.75,
    age: 0,
    maxLife,
    hue: [42, 196, 266, 18, 150, 320][Math.floor(Math.random() * 6)],
  });
}

function startCatch() {
  audio.setOn(settings.soundOn);
  mode = "catch";
  bodies = [];
  catchTargets = [];
  catchScore = 0;
  catchTimeLeft = CATCH_DURATION;
  catchSpawnTimer = 0.4;
  goTo("playing-catch");
}

function handleCatchClick(x, y) {
  const idx = catchTargets.findIndex((t) => Math.hypot(t.x - x, t.y - y) < 36);
  if (idx === -1) return;
  catchTargets.splice(idx, 1);
  catchScore += 10;
  audio.catchPing();
}

function endCatchGame() {
  if (catchScore > catchBest) {
    catchBest = catchScore;
    saveJSON("catch-best", catchBest);
  }
  lastMiniGame = "catch";
  ui.renderMiniGameEnd("Sternenfänger vorbei", `Du hast ${catchScore} Punkte gesammelt. Bestleistung: ${catchBest}.`);
  goTo("miniGameEnd");
}

function drawCatchTargets() {
  const now = performance.now();
  catchTargets.forEach((t) => {
    const lifeFrac = 1 - t.age / t.maxLife;
    const pulse = 0.85 + 0.15 * Math.sin(now / 120);
    const r = (14 + lifeFrac * 10) * pulse;
    const grad = ctx.createRadialGradient(t.x, t.y, 0, t.x, t.y, r * 2.4);
    grad.addColorStop(0, `hsla(${t.hue}, 90%, 80%, ${0.5 + lifeFrac * 0.4})`);
    grad.addColorStop(1, `hsla(${t.hue}, 90%, 60%, 0)`);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(t.x, t.y, r * 2.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = `hsla(${t.hue}, 90%, 85%, ${lifeFrac.toFixed(3)})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(t.x, t.y, r, -Math.PI / 2, -Math.PI / 2 + lifeFrac * Math.PI * 2);
    ctx.stroke();
  });
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

function addBodyAt(x, y, vx = 0, vy = 0, forcedVoiceIdx = null) {
  if (mode === "constellation" && bodies.length >= targetPoints.length + 4) return;
  const voiceIdx = forcedVoiceIdx === null ? Math.floor(Math.random() * 4) : forcedVoiceIdx;
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
    const hasNext = currentLevelIndex + 1 < CONSTELLATIONS.length;
    ui.renderLevelComplete(currentLevel, hasNext);
    setTimeout(() => {
      if (levelSolved) goTo("levelComplete");
    }, 900);
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

function drawAmbientGlow(t) {
  const pulse = settings.reducedMotion ? 0.5 : 0.5 + 0.5 * Math.sin(t * 0.25);
  const cx = width * 0.86, cy = height * 0.9;
  const r = Math.min(width, height) * (0.45 + pulse * 0.06);
  const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
  glow.addColorStop(0, `rgba(217, 122, 74, ${0.05 + pulse * 0.035})`);
  glow.addColorStop(1, "rgba(217, 122, 74, 0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, width, height);
}

function drawBodies() {
  if (!settings.reducedMotion) drawLinks(ctx, bodies, 170);
  for (const b of bodies) {
    const hue = [42, 196, 266, 18][b.voiceIdx] + b.hueJitter;
    if (!settings.reducedMotion) drawTrail(ctx, b, hue);
    const age = Math.min(1, (performance.now() - b.bornAt) / 400);
    const r = b.radius * 3.2 * age;
    const grad = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, r || 0.01);
    grad.addColorStop(0, `hsla(${hue}, 85%, 78%, 0.95)`);
    grad.addColorStop(0.4, `hsla(${hue}, 85%, 60%, 0.35)`);
    grad.addColorStop(1, `hsla(${hue}, 85%, 50%, 0)`);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(b.x, b.y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = `hsla(${hue}, 90%, 85%, 1)`;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.radius * 0.55 * age, 0, Math.PI * 2);
    ctx.fill();
  }
}

let lastT = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - lastT) / 1000);
  lastT = now;
  const playing = appState.startsWith("playing-");

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#0b0d1a";
  ctx.fillRect(0, 0, width, height);
  drawAmbientGlow(now / 1000);

  if (!settings.reducedMotion) fieldStars.step(dt);
  fieldStars.draw(ctx);
  if (!settings.reducedMotion) shootingStars.step(dt, width, height);
  shootingStars.draw(ctx);
  if (mode === "rain" && playing) {
    if (!settings.reducedMotion) rainDrops.step(dt);
    rainDrops.draw(ctx);
  }

  if (playing) {
    if (mode === "memory") {
      if (memoryShowing) {
        memoryShowTimer -= dt;
        if (memoryShowTimer <= 0) {
          memoryShowStep++;
          if (memoryShowStep >= memorySequence.length) {
            memoryShowing = false;
          } else {
            const slotIdx = memorySequence[memoryShowStep];
            const slot = memorySlots[slotIdx];
            audio.pluck(slot.midi, 0.35, 0);
            memoryLitSlot = slotIdx;
            memoryLitUntil = now + 380;
            memoryShowTimer = Math.max(0.32, 0.65 - memorySequence.length * 0.02);
          }
        }
      }
      drawMemorySlots();
    } else if (mode === "catch") {
      catchTimeLeft -= dt;
      const elapsedFrac = 1 - catchTimeLeft / CATCH_DURATION;
      catchSpawnTimer -= dt;
      if (catchSpawnTimer <= 0) {
        catchSpawnTimer = Math.max(0.45, 0.95 - elapsedFrac * 0.5);
        spawnCatchTarget(elapsedFrac);
      }
      catchTargets.forEach((t) => { t.age += dt; });
      catchTargets = catchTargets.filter((t) => t.age < t.maxLife);
      drawCatchTargets();
      ui.setHint(`Punkte: ${catchScore} · Zeit: ${Math.max(0, Math.ceil(catchTimeLeft))}s`);
      if (catchTimeLeft <= 0) endCatchGame();
    } else {
      if (mode === "constellation") {
        stepConstellationBodies(bodies, dt, now / 1000, settings.reducedMotion);
      } else {
        stepFreeBodies(bodies, dt, width, height, settings.reducedMotion);
      }

      if (mode === "ember") {
        emberTimer -= dt;
        if (emberTimer <= 0) {
          emberTimer = 2.5 + Math.random() * 2.5;
          if (bodies.length >= 9) bodies.shift();
          const margin = 60;
          const x = margin + Math.random() * (width - margin * 2);
          const y = margin + Math.random() * (height - margin * 2) * 0.7;
          addBodyAt(x, y, 0, 0, Math.random() < 0.5 ? 0 : 3);
        }
      }

      checkChimes(bodies, prevPairs, width, height, (midi, voiceIdx) => {
        audio.pluck(midi, 0.22, voiceIdx);
        tracker.recordChime();
      });
      drawConstellationTargets();
      drawBodies();
      checkConstellationSolved();
    }
    tracker.tick(dt, settings.soundOn);
  }

  requestAnimationFrame(frame);
}

function pointerDown(e) {
  if (!appState.startsWith("playing-") || mode === "ember") return;
  const x = e.clientX, y = e.clientY;
  if (mode === "memory") {
    handleMemoryClick(x, y);
    return;
  }
  if (mode === "catch") {
    handleCatchClick(x, y);
    return;
  }
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
    if (appState.startsWith("playing-")) {
      pausedFrom = appState;
      goTo("paused");
    } else if (appState === "paused") {
      goTo(pausedFrom);
    } else if (appState === "levelComplete" || appState === "miniGameEnd") {
      goTo("menu");
    } else if (["settings", "achievements", "credits", "help", "levelSelect"].includes(appState)) {
      goTo("menu");
    }
  } else if (e.key === " " && appState.startsWith("playing-")) {
    e.preventDefault();
    settings.soundOn = !settings.soundOn;
    audio.setOn(settings.soundOn);
    persistSettings();
  } else if ((e.key === "h" || e.key === "H") && appState !== "title") {
    goTo(appState === "help" ? (pausedFrom || "menu") : (pausedFrom = appState, "help"));
  } else if ((e.key === "s" || e.key === "S") && appState.startsWith("playing-")) {
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
      handleAction(action, btn);
    });
    btn.addEventListener("pointerenter", () => audio.uiHover());
  });
}

async function handleAction(action, btn) {
  switch (action) {
    case "start-free":
      startFree();
      break;
    case "start-ember":
      startEmber();
      break;
    case "start-rain":
      startRain();
      break;
    case "start-memory":
      startMemory();
      break;
    case "start-catch":
      startCatch();
      break;
    case "retry-minigame":
      if (lastMiniGame === "memory") startMemory();
      else if (lastMiniGame === "catch") startCatch();
      break;
    case "goto-menu":
      goTo("menu");
      break;
    case "goto-levels":
      goTo("levelSelect");
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
      else if (mode === "ember") startEmber();
      else if (mode === "rain") startRain();
      else if (mode === "memory") startMemory();
      else if (mode === "catch") startCatch();
      break;
    case "save-png":
      savePng();
      break;
    case "cancel-play":
      mode = null;
      goTo("title");
      break;
    case "next-level": {
      const nextIndex = currentLevelIndex + 1;
      if (nextIndex < CONSTELLATIONS.length) {
        startConstellation(CONSTELLATIONS[nextIndex], nextIndex);
      } else {
        goTo("menu");
      }
      break;
    }
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
