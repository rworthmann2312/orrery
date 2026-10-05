// Konstellations-Level: Zielpunkte als Anteile (0..1) einer Box, die zur
// Laufzeit zentriert auf die tatsächliche Leinwandgröße skaliert wird.
// Jedes Level nennt außerdem die Mindestzahl an Körpern (= Anzahl Punkte),
// damit die "Minimalist"-Erfolgsbedingung prüfbar ist.
export const CONSTELLATIONS = [
  {
    id: "dreieck",
    name: "Das Dreieck",
    hint: "Drei Punkte, eine einfache Form.",
    points: [
      { x: 0.5, y: 0.15 },
      { x: 0.2, y: 0.75 },
      { x: 0.8, y: 0.75 },
    ],
  },
  {
    id: "kreuz",
    name: "Das Kreuz",
    hint: "Vier Punkte, rechtwinklig angeordnet.",
    points: [
      { x: 0.5, y: 0.1 },
      { x: 0.5, y: 0.9 },
      { x: 0.15, y: 0.5 },
      { x: 0.85, y: 0.5 },
    ],
  },
  {
    id: "diamant",
    name: "Der Diamant",
    hint: "Vier Punkte, auf der Spitze stehend.",
    points: [
      { x: 0.5, y: 0.08 },
      { x: 0.85, y: 0.5 },
      { x: 0.5, y: 0.92 },
      { x: 0.15, y: 0.5 },
    ],
  },
  {
    id: "pfeil",
    name: "Der Pfeil",
    hint: "Fünf Punkte, die nach oben zeigen.",
    points: [
      { x: 0.5, y: 0.08 },
      { x: 0.3, y: 0.4 },
      { x: 0.7, y: 0.4 },
      { x: 0.4, y: 0.4 },
      { x: 0.6, y: 0.4 },
      { x: 0.5, y: 0.92 },
    ],
  },
  {
    id: "krone",
    name: "Die Krone",
    hint: "Fünf Zacken in einer Reihe.",
    points: [
      { x: 0.15, y: 0.75 },
      { x: 0.3, y: 0.3 },
      { x: 0.5, y: 0.6 },
      { x: 0.7, y: 0.3 },
      { x: 0.85, y: 0.75 },
    ],
  },
  {
    id: "spirale",
    name: "Die Spirale",
    hint: "Sechs Punkte entlang eines Bogens.",
    points: (() => {
      const pts = [];
      const n = 6;
      for (let i = 0; i < n; i++) {
        const t = i / (n - 1);
        const angle = t * Math.PI * 1.6 - 0.3;
        const r = 0.12 + t * 0.32;
        pts.push({ x: 0.5 + Math.cos(angle) * r, y: 0.5 + Math.sin(angle) * r * 1.1 });
      }
      return pts;
    })(),
  },
];
