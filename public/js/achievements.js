import { loadJSON, saveJSON } from "./save.js";

export const ACHIEVEMENTS = [
  { id: "first-light", name: "Erstes Licht", desc: "Platziere deinen ersten Himmelskörper." },
  { id: "star-cluster", name: "Sternenhaufen", desc: "Platziere insgesamt 100 Himmelskörper." },
  { id: "harmony", name: "Perfekte Harmonie", desc: "Löse 250 Klänge durch nahe Begegnungen aus." },
  { id: "night-owl", name: "Nachtschwärmer", desc: "Spiele insgesamt 15 Minuten." },
  { id: "meteor-watcher", name: "Sternschnuppen-Beobachter", desc: "Sieh 20 Sternschnuppen." },
  { id: "first-constellation", name: "Erste Konstellation", desc: "Schließe eine Konstellation ab." },
  { id: "cartographer", name: "Himmelskartograph", desc: "Schließe alle Konstellationen ab." },
  { id: "composer", name: "Komponist", desc: "Lausche 5 Minuten am Stück bei eingeschaltetem Klang." },
  { id: "minimalist", name: "Minimalist", desc: "Schließe eine Konstellation mit genau der Mindestzahl an Körpern ab." },
  { id: "snapshot", name: "Bildschirmfoto", desc: "Speichere deinen ersten Himmel als Bild." },
];

const DEFAULT_STATS = {
  bodiesPlacedTotal: 0,
  chimesTotal: 0,
  playSeconds: 0,
  shootingStarsSeen: 0,
  constellationsCompleted: 0,
  soundOnStreakSeconds: 0,
  imagesSaved: 0,
};

export class AchievementTracker {
  constructor(onUnlock) {
    this.onUnlock = onUnlock || (() => {});
    this.unlocked = new Set(loadJSON("achievements", []));
    this.stats = Object.assign({}, DEFAULT_STATS, loadJSON("stats", {}));
  }

  isUnlocked(id) {
    return this.unlocked.has(id);
  }

  _persist() {
    saveJSON("achievements", Array.from(this.unlocked));
    saveJSON("stats", this.stats);
  }

  _unlock(id) {
    if (this.unlocked.has(id)) return;
    this.unlocked.add(id);
    const def = ACHIEVEMENTS.find((a) => a.id === id);
    this._persist();
    if (def) this.onUnlock(def);
  }

  _checkThresholds() {
    const s = this.stats;
    if (s.bodiesPlacedTotal >= 1) this._unlock("first-light");
    if (s.bodiesPlacedTotal >= 100) this._unlock("star-cluster");
    if (s.chimesTotal >= 250) this._unlock("harmony");
    if (s.playSeconds >= 15 * 60) this._unlock("night-owl");
    if (s.shootingStarsSeen >= 20) this._unlock("meteor-watcher");
    if (s.constellationsCompleted >= 1) this._unlock("first-constellation");
    if (s.constellationsCompleted >= 6) this._unlock("cartographer");
    if (s.soundOnStreakSeconds >= 5 * 60) this._unlock("composer");
    if (s.imagesSaved >= 1) this._unlock("snapshot");
  }

  recordBodyPlaced() {
    this.stats.bodiesPlacedTotal += 1;
    this._persist();
    this._checkThresholds();
  }

  recordChime() {
    this.stats.chimesTotal += 1;
    if (this.stats.chimesTotal % 10 === 0) this._persist();
    this._checkThresholds();
  }

  recordShootingStar() {
    this.stats.shootingStarsSeen += 1;
    this._persist();
    this._checkThresholds();
  }

  recordImageSaved() {
    this.stats.imagesSaved += 1;
    this._persist();
    this._checkThresholds();
  }

  recordConstellationCompleted(exactMinimum) {
    this.stats.constellationsCompleted += 1;
    this._persist();
    this._checkThresholds();
    if (exactMinimum) this._unlock("minimalist");
  }

  tick(dtSeconds, soundOn) {
    this.stats.playSeconds += dtSeconds;
    this.stats.soundOnStreakSeconds = soundOn ? this.stats.soundOnStreakSeconds + dtSeconds : 0;
    this._checkThresholds();
  }

  flush() {
    this._persist();
  }
}
