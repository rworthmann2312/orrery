import { ACHIEVEMENTS } from "./achievements.js";
import { CONSTELLATIONS } from "./constellations.js";

export class UI {
  constructor(root) {
    this.root = root;
    this.screens = {};
    ["title", "modeSelect", "settings", "achievements", "credits", "pause", "help", "levelComplete", "miniGameEnd"].forEach((name) => {
      this.screens[name] = root.querySelector(`[data-screen="${name}"]`);
    });
    this.hud = root.querySelector("[data-hud]");
    this.hintBanner = root.querySelector("[data-hint]");
    this.toastStack = root.querySelector("[data-toasts]");
    this.confirmOverlay = root.querySelector("[data-confirm]");
    this.activeScreen = null;
  }

  show(name) {
    Object.entries(this.screens).forEach(([key, el]) => {
      if (!el) return;
      el.classList.toggle("hidden", key !== name);
    });
    this.activeScreen = name;
  }

  hideAllScreens() {
    Object.values(this.screens).forEach((el) => el && el.classList.add("hidden"));
    this.activeScreen = null;
  }

  setHud(visible) {
    if (this.hud) this.hud.style.display = visible ? "flex" : "none";
  }

  setHint(text) {
    if (!this.hintBanner) return;
    if (!text) {
      this.hintBanner.classList.add("hidden");
      return;
    }
    this.hintBanner.textContent = text;
    this.hintBanner.classList.remove("hidden");
  }

  setTitleSubtitle(returning) {
    const el = this.screens.title?.querySelector("[data-title-subtitle]");
    if (!el) return;
    el.textContent = returning
      ? "Schön, dass du wieder da bist. Dein Himmel hat auf dich gewartet."
      : "Ein stiller Himmel, der auf dich wartet. Setze Lichter, höre ihnen zu.";
  }

  toast(def) {
    if (!this.toastStack) return;
    const el = document.createElement("div");
    el.className = "toast";
    el.innerHTML = `<span style="font-size:1.2rem">🏆</span><div><strong>${def.name}</strong><br><span style="color:var(--text-dim)">${def.desc}</span></div>`;
    this.toastStack.appendChild(el);
    setTimeout(() => el.remove(), 3200);
  }

  confirm(message, { okLabel = "Bestätigen", cancelLabel = "Abbrechen" } = {}) {
    return new Promise((resolve) => {
      if (!this.confirmOverlay) {
        resolve(window.confirm(message));
        return;
      }
      this.confirmOverlay.innerHTML = "";
      const box = document.createElement("div");
      box.className = "confirm-box";
      const p = document.createElement("p");
      p.textContent = message;
      const actions = document.createElement("div");
      actions.className = "confirm-actions";
      const ok = document.createElement("button");
      ok.className = "btn danger small";
      ok.textContent = okLabel;
      const cancel = document.createElement("button");
      cancel.className = "btn secondary small";
      cancel.textContent = cancelLabel;
      actions.append(cancel, ok);
      box.append(p, actions);
      this.confirmOverlay.appendChild(box);
      this.confirmOverlay.classList.remove("hidden");
      const close = (result) => {
        this.confirmOverlay.classList.add("hidden");
        resolve(result);
      };
      ok.addEventListener("click", () => close(true));
      cancel.addEventListener("click", () => close(false));
    });
  }

  renderModeSelect(progress) {
    const el = this.screens.modeSelect?.querySelector("[data-constellation-progress]");
    if (el) el.textContent = `${progress.done} / ${progress.total} gelöst`;
  }

  renderAchievements(tracker) {
    const list = this.screens.achievements?.querySelector("[data-ach-list]");
    if (!list) return;
    list.innerHTML = "";
    ACHIEVEMENTS.forEach((a) => {
      const unlocked = tracker.isUnlocked(a.id);
      const item = document.createElement("div");
      item.className = "ach-item" + (unlocked ? " unlocked" : "");
      item.innerHTML = `<div class="ach-icon">${unlocked ? "🏆" : "🔒"}</div><div class="ach-text"><h4>${a.name}</h4><p>${unlocked ? a.desc : "???"}</p></div>`;
      list.appendChild(item);
    });
  }

  renderLevelComplete(level, hasNext) {
    const screen = this.screens.levelComplete;
    if (!screen) return;
    const title = screen.querySelector("[data-level-complete-title]");
    const sub = screen.querySelector("[data-level-complete-sub]");
    const nextBtn = screen.querySelector("[data-level-complete-next]");
    if (title) title.textContent = `${level.name} geschafft!`;
    if (sub) sub.textContent = hasNext ? "Bereit für die nächste Konstellation?" : "Du hast alle Konstellationen gelöst.";
    if (nextBtn) nextBtn.classList.toggle("hidden", !hasNext);
  }

  renderMiniGameEnd(title, scoreText) {
    const screen = this.screens.miniGameEnd;
    if (!screen) return;
    const titleEl = screen.querySelector("[data-minigame-title]");
    const scoreEl = screen.querySelector("[data-minigame-score]");
    if (titleEl) titleEl.textContent = title;
    if (scoreEl) scoreEl.textContent = scoreText;
  }

  renderMiniGameBests(memoryBest, catchBest) {
    const memEl = this.screens.modeSelect?.querySelector("[data-memory-best]");
    const catchEl = this.screens.modeSelect?.querySelector("[data-catch-best]");
    if (memEl) memEl.textContent = memoryBest > 0 ? `Bestleistung: ${memoryBest} ${memoryBest === 1 ? "Runde" : "Runden"}` : "Bestleistung: –";
    if (catchEl) catchEl.textContent = catchBest > 0 ? `Bestleistung: ${catchBest} Punkte` : "Bestleistung: –";
  }

  renderLevelPicker(onPick, completedIds) {
    const grid = this.screens.modeSelect?.querySelector("[data-level-grid]");
    if (!grid) return;
    grid.innerHTML = "";
    CONSTELLATIONS.forEach((level, i) => {
      const btn = document.createElement("button");
      const done = completedIds.has(level.id);
      btn.className = "level-btn" + (done ? " done" : "");
      btn.textContent = String(i + 1);
      btn.title = `${level.name}${done ? " (gelöst)" : ""}`;
      btn.addEventListener("click", () => onPick(level, i));
      grid.appendChild(btn);
    });
  }
}
