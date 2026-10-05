// Kleiner, versionierter localStorage-Wrapper. Schlägt lesen/schreiben fehl
// (privater Modus, voller Speicher, deaktiviertes Storage), wird der
// Normalzustand (leer/Default) verwendet statt die Seite abstürzen zu lassen.
const PREFIX = "orrery:";
const VERSION = 1;

function key(name) {
  return `${PREFIX}${name}:v${VERSION}`;
}

export function loadJSON(name, fallback) {
  try {
    const raw = localStorage.getItem(key(name));
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return parsed === null || parsed === undefined ? fallback : parsed;
  } catch (e) {
    console.warn(`Orrery: Speicherstand "${name}" konnte nicht gelesen werden.`, e);
    return fallback;
  }
}

export function saveJSON(name, value) {
  try {
    localStorage.setItem(key(name), JSON.stringify(value));
    return true;
  } catch (e) {
    console.warn(`Orrery: Speicherstand "${name}" konnte nicht geschrieben werden.`, e);
    return false;
  }
}

export function clearAll() {
  try {
    const toRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(PREFIX)) toRemove.push(k);
    }
    toRemove.forEach((k) => localStorage.removeItem(k));
    return true;
  } catch (e) {
    console.warn("Orrery: Fortschritt konnte nicht zurückgesetzt werden.", e);
    return false;
  }
}
