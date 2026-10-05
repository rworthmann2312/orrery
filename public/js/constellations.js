// Konstellations-Level: Zielpunkte als Anteile (0..1) einer Box, die zur
// Laufzeit zentriert auf die tatsächliche Leinwandgröße skaliert wird.
// Jedes Level nennt außerdem die Mindestzahl an Körpern (= Anzahl Punkte),
// damit die "Minimalist"-Erfolgsbedingung prüfbar ist.
//
// Die ersten sechs Level sind von Hand entworfen. Damit das Spiel auf
// insgesamt 100 Level kommt, werden die restlichen 94 aus einfachen
// geometrischen Familien (Vielecke, Sterne, Gitter, Wellen, Spiralen,
// Sonnen, Doppelringe, Buchstaben, Zickzack, Sternbild-Cluster) erzeugt.
// Das hält die Datei kurz, garantiert eindeutige Koordinaten/IDs und
// liefert trotzdem spürbar unterschiedliche Formen.

const HAND_MADE = [
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

function clampUnit(v) {
  return Math.min(0.94, Math.max(0.06, v));
}

function shape(points) {
  return points.map((p) => ({ x: clampUnit(p.x), y: clampUnit(p.y) }));
}

function regularPolygon(n) {
  const pts = [];
  for (let i = 0; i < n; i++) {
    const angle = -Math.PI / 2 + (i / n) * Math.PI * 2;
    pts.push({ x: 0.5 + Math.cos(angle) * 0.36, y: 0.5 + Math.sin(angle) * 0.36 });
  }
  return shape(pts);
}

function starShape(n, innerRatio) {
  const pts = [];
  for (let i = 0; i < n * 2; i++) {
    const angle = -Math.PI / 2 + (i / (n * 2)) * Math.PI * 2;
    const r = i % 2 === 0 ? 0.38 : 0.38 * innerRatio;
    pts.push({ x: 0.5 + Math.cos(angle) * r, y: 0.5 + Math.sin(angle) * r });
  }
  return shape(pts);
}

function grid(rows, cols) {
  const pts = [];
  const mx = 0.18, my = 0.18;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = cols === 1 ? 0.5 : mx + (c / (cols - 1)) * (1 - 2 * mx);
      const y = rows === 1 ? 0.5 : my + (r / (rows - 1)) * (1 - 2 * my);
      pts.push({ x, y });
    }
  }
  return shape(pts);
}

function wave(n, cycles) {
  const pts = [];
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    pts.push({ x: 0.1 + t * 0.8, y: 0.5 + Math.sin(t * Math.PI * 2 * cycles) * 0.3 });
  }
  return shape(pts);
}

function spiralShape(n, turns, reverse) {
  const pts = [];
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const angle = (reverse ? -1 : 1) * t * Math.PI * 2 * turns;
    const r = 0.08 + t * 0.34;
    pts.push({ x: 0.5 + Math.cos(angle) * r, y: 0.5 + Math.sin(angle) * r * 1.05 });
  }
  return shape(pts);
}

function burst(rays) {
  const pts = [{ x: 0.5, y: 0.5 }];
  for (let i = 0; i < rays; i++) {
    const angle = -Math.PI / 2 + (i / rays) * Math.PI * 2;
    pts.push({ x: 0.5 + Math.cos(angle) * 0.4, y: 0.5 + Math.sin(angle) * 0.4 });
  }
  return shape(pts);
}

function doubleRing(outerN, innerN) {
  const pts = [];
  for (let i = 0; i < outerN; i++) {
    const angle = -Math.PI / 2 + (i / outerN) * Math.PI * 2;
    pts.push({ x: 0.5 + Math.cos(angle) * 0.4, y: 0.5 + Math.sin(angle) * 0.4 });
  }
  for (let i = 0; i < innerN; i++) {
    const angle = -Math.PI / 2 + (i / innerN) * Math.PI * 2 + Math.PI / innerN;
    pts.push({ x: 0.5 + Math.cos(angle) * 0.17, y: 0.5 + Math.sin(angle) * 0.17 });
  }
  return shape(pts);
}

function zigzag(n, vertical) {
  const pts = [];
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const off = i % 2 === 0 ? -0.3 : 0.3;
    if (vertical) pts.push({ x: 0.5 + off, y: 0.1 + t * 0.8 });
    else pts.push({ x: 0.1 + t * 0.8, y: 0.5 + off });
  }
  return shape(pts);
}

function mulberry32(seed) {
  let a = seed;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function cluster(n, seed) {
  const rnd = mulberry32(seed * 7919 + 17);
  const pts = [];
  for (let i = 0; i < n; i++) {
    const angle = rnd() * Math.PI * 2;
    const r = 0.12 + rnd() * 0.3;
    pts.push({ x: 0.5 + Math.cos(angle) * r, y: 0.5 + Math.sin(angle) * r });
  }
  return shape(pts);
}

const LETTERS = {
  V: [{ x: 0.15, y: 0.12 }, { x: 0.5, y: 0.9 }, { x: 0.85, y: 0.12 }],
  W: [{ x: 0.1, y: 0.15 }, { x: 0.3, y: 0.85 }, { x: 0.5, y: 0.35 }, { x: 0.7, y: 0.85 }, { x: 0.9, y: 0.15 }],
  M: [{ x: 0.1, y: 0.85 }, { x: 0.1, y: 0.15 }, { x: 0.5, y: 0.55 }, { x: 0.9, y: 0.15 }, { x: 0.9, y: 0.85 }],
  N: [{ x: 0.15, y: 0.85 }, { x: 0.15, y: 0.15 }, { x: 0.85, y: 0.85 }, { x: 0.85, y: 0.15 }],
  X: [{ x: 0.15, y: 0.15 }, { x: 0.5, y: 0.5 }, { x: 0.85, y: 0.85 }, { x: 0.15, y: 0.85 }, { x: 0.85, y: 0.15 }],
  Y: [{ x: 0.15, y: 0.1 }, { x: 0.5, y: 0.5 }, { x: 0.85, y: 0.1 }, { x: 0.5, y: 0.9 }],
  Z: [{ x: 0.15, y: 0.15 }, { x: 0.85, y: 0.15 }, { x: 0.15, y: 0.85 }, { x: 0.85, y: 0.85 }],
  T: [{ x: 0.15, y: 0.15 }, { x: 0.5, y: 0.15 }, { x: 0.85, y: 0.15 }, { x: 0.5, y: 0.9 }],
  L: [{ x: 0.25, y: 0.1 }, { x: 0.25, y: 0.9 }, { x: 0.8, y: 0.9 }],
  H: [{ x: 0.15, y: 0.1 }, { x: 0.15, y: 0.5 }, { x: 0.15, y: 0.9 }, { x: 0.85, y: 0.5 }, { x: 0.85, y: 0.1 }, { x: 0.85, y: 0.9 }],
  I: [{ x: 0.5, y: 0.1 }, { x: 0.5, y: 0.5 }, { x: 0.5, y: 0.9 }],
  A: [{ x: 0.5, y: 0.1 }, { x: 0.2, y: 0.9 }, { x: 0.35, y: 0.55 }, { x: 0.65, y: 0.55 }, { x: 0.8, y: 0.9 }],
};

const ORDINALS = ["", "Ein", "Zwei", "Drei", "Vier", "Fünf", "Sechs", "Sieben", "Acht", "Neun", "Zehn", "Elf", "Zwölf", "Dreizehn", "Vierzehn", "Fünfzehn", "Sechzehn"];

const generated = [];

function addLevel(id, name, hint, points) {
  generated.push({ id, name, hint, points });
}

// Vielecke (12 Formen, 4 bis 15 Ecken)
for (let n = 4; n <= 15; n++) {
  addLevel(`vieleck-${n}`, `Das ${ORDINALS[n]}eck`, `${n} Punkte, gleichmäßig im Kreis verteilt.`, regularPolygon(n));
}

// Sterne (10 Formen, 3 bis 12 Zacken)
for (let n = 3; n <= 12; n++) {
  addLevel(`stern-${n}`, `Stern mit ${n} Zacken`, `${n * 2} Punkte, abwechselnd nah und fern vom Zentrum.`, starShape(n, n <= 5 ? 0.45 : 0.55));
}

// Gitter (12 Formen)
const GRIDS = [[2, 2], [2, 3], [3, 2], [3, 3], [2, 4], [4, 2], [3, 4], [4, 3], [4, 4], [2, 5], [5, 2], [3, 5]];
GRIDS.forEach(([rows, cols]) => {
  addLevel(`gitter-${rows}x${cols}`, `Gitter ${rows}×${cols}`, `${rows * cols} Punkte in einem regelmäßigen Raster.`, grid(rows, cols));
});

// Wellen (8 Formen)
const WAVES = [[6, 1], [7, 1], [6, 1.5], [8, 1.5], [7, 2], [9, 2], [8, 2.5], [10, 2.5]];
WAVES.forEach(([n, cycles], i) => {
  addLevel(`welle-${i + 1}`, `Welle Nr. ${i + 1}`, `${n} Punkte entlang einer schwingenden Linie.`, wave(n, cycles));
});

// Spiralen (8 weitere, zusätzlich zur handgemachten)
const SPIRALS = [[7, 1.2, false], [8, 1.4, true], [9, 1.6, false], [10, 1.8, true], [11, 2, false], [12, 2.2, true], [13, 2.4, false], [14, 2.6, true]];
SPIRALS.forEach(([n, turns, reverse], i) => {
  addLevel(`spirale-${i + 2}`, `Spirale Nr. ${i + 2}`, `${n} Punkte entlang einer ${reverse ? "linksdrehenden" : "rechtsdrehenden"} Spirale.`, spiralShape(n, turns, reverse));
});

// Sonnen / Strahlenbündel (8 Formen)
for (let rays = 4; rays <= 11; rays++) {
  addLevel(`sonne-${rays}`, `Sonne mit ${rays} Strahlen`, `Ein Mittelpunkt plus ${rays} Strahlen drumherum, macht ${rays + 1} Punkte.`, burst(rays));
}

// Doppelringe (6 Formen)
const RINGS = [[4, 3], [5, 4], [6, 3], [5, 5], [6, 4], [7, 3]];
RINGS.forEach(([outerN, innerN], i) => {
  addLevel(`doppelring-${i + 1}`, `Doppelring Nr. ${i + 1}`, `${outerN} Punkte außen, ${innerN} Punkte innen.`, doubleRing(outerN, innerN));
});

// Buchstaben (12 Formen)
Object.entries(LETTERS).forEach(([letter, pts]) => {
  addLevel(`buchstabe-${letter.toLowerCase()}`, `Buchstabe ${letter}`, `${pts.length} Punkte, die den Buchstaben ${letter} andeuten.`, shape(pts));
});

// Zickzack (5 Formen)
for (let i = 0; i < 5; i++) {
  const n = 5 + i;
  const vertical = i % 2 === 1;
  addLevel(`zickzack-${i + 1}`, `Zickzack Nr. ${i + 1}`, `${n} Punkte im Zickzack, ${vertical ? "senkrecht" : "waagerecht"} angeordnet.`, zigzag(n, vertical));
}

// Sternbild-Cluster (13 Formen, unregelmäßig wie echte Sternbilder)
for (let i = 0; i < 13; i++) {
  const n = 7 + i;
  addLevel(`sternbild-${i + 1}`, `Sternbild Nr. ${i + 1}`, `${n} Punkte in unregelmäßiger Anordnung. Schau genau hin.`, cluster(n, i + 1));
}

export const CONSTELLATIONS = [...HAND_MADE, ...generated].sort((a, b) => a.points.length - b.points.length);
