// Körper-Simulation: Freies Spiel (volle Gravitation) und Konstellationen
// (Körper ruhen sanft wippend an Zielpunkten, keine Gravitation zwischen ihnen).
import { yToMidi } from "./audio.js";

let nextId = 1;

export function makeBody(x, y, voiceIdx, vx = 0, vy = 0) {
  return {
    id: nextId++,
    x, y, vx, vy,
    baseX: x, baseY: y,
    radius: 8 + Math.random() * 10,
    get mass() { return this.radius; },
    voiceIdx: voiceIdx % 4,
    hueJitter: (Math.random() - 0.5) * 10,
    bobPhase: Math.random() * Math.PI * 2,
    trail: [],
    bornAt: performance.now(),
  };
}

export class FieldStars {
  constructor(count, width, height) {
    this.stars = [];
    this.resize(count, width, height);
  }
  resize(count, width, height) {
    this.width = width;
    this.height = height;
    this.stars = Array.from({ length: count }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      r: Math.random() * 1.3 + 0.2,
      tw: Math.random() * Math.PI * 2,
      speed: 0.4 + Math.random() * 0.8,
    }));
  }
  step(dt) {
    for (const s of this.stars) s.tw += dt * s.speed;
  }
  draw(ctx) {
    for (const s of this.stars) {
      const a = 0.35 + 0.35 * Math.sin(s.tw);
      ctx.globalAlpha = Math.max(0.1, a);
      ctx.fillStyle = "#eaeaf5";
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
}

export class RainDrops {
  constructor(count, width, height) {
    this.drops = [];
    this.resize(count, width, height);
  }
  resize(count, width, height) {
    this.width = width;
    this.height = height;
    this.drops = Array.from({ length: count }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      len: 10 + Math.random() * 14,
      speed: 220 + Math.random() * 140,
      drift: 16 + Math.random() * 10,
    }));
  }
  step(dt) {
    for (const d of this.drops) {
      d.y += d.speed * dt;
      d.x += d.drift * dt * 0.3;
      if (d.y > this.height) { d.y = -20; d.x = Math.random() * this.width; }
      if (d.x > this.width) d.x = 0;
    }
  }
  draw(ctx) {
    ctx.strokeStyle = "rgba(180,200,230,0.3)";
    ctx.lineWidth = 1.2;
    for (const d of this.drops) {
      ctx.beginPath();
      ctx.moveTo(d.x, d.y);
      ctx.lineTo(d.x - d.drift * 0.06, d.y - d.len);
      ctx.stroke();
    }
  }
}

export class ShootingStars {
  constructor(onSeen) {
    this.list = [];
    this.timer = 4 + Math.random() * 6;
    this.onSeen = onSeen || (() => {});
  }
  step(dt, width, height) {
    this.timer -= dt;
    if (this.timer <= 0) {
      this.timer = 5 + Math.random() * 10;
      const fromLeft = Math.random() < 0.5;
      this.list.push({
        x: fromLeft ? -20 : width + 20,
        y: Math.random() * height * 0.5,
        vx: (fromLeft ? 1 : -1) * (300 + Math.random() * 200),
        vy: 120 + Math.random() * 80,
        life: 1.2,
        seen: false,
      });
    }
    for (const s of this.list) {
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.life -= dt * 0.6;
      if (!s.seen && s.life < 1.0) {
        s.seen = true;
        this.onSeen();
      }
    }
    this.list = this.list.filter((s) => s.life > 0);
  }
  draw(ctx) {
    for (const s of this.list) {
      const a = Math.max(0, Math.min(1, s.life));
      ctx.strokeStyle = `rgba(255,244,214,${a})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(s.x - s.vx * 0.05, s.y - s.vy * 0.05);
      ctx.stroke();
    }
  }
}

const G = 2600;
const DAMPING = 0.985;
const MAX_SPEED = 240;
const TRAIL_LENGTH = 26;

function pushTrail(body) {
  body.trail.push({ x: body.x, y: body.y });
  if (body.trail.length > TRAIL_LENGTH) body.trail.shift();
}

export function stepFreeBodies(bodies, dt, width, height, reducedMotion) {
  const n = bodies.length;
  for (let i = 0; i < n; i++) {
    const a = bodies[i];
    for (let j = i + 1; j < n; j++) {
      const b = bodies[j];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const distSq = dx * dx + dy * dy;
      const dist = Math.sqrt(distSq) || 0.001;
      const minDist = a.radius + b.radius + 6;
      if (dist > minDist) {
        const f = (G * a.mass * b.mass) / Math.max(distSq, 900);
        const fx = (dx / dist) * f, fy = (dy / dist) * f;
        a.vx += fx * dt; a.vy += fy * dt;
        b.vx -= fx * dt; b.vy -= fy * dt;
      } else {
        const push = (minDist - dist) * 18;
        const nx = dx / dist, ny = dy / dist;
        a.vx -= nx * push * dt; a.vy -= ny * push * dt;
        b.vx += nx * push * dt; b.vy += ny * push * dt;
      }
    }
  }
  const damp = reducedMotion ? 0.9 : DAMPING;
  for (const a of bodies) {
    a.vx *= damp; a.vy *= damp;
    const speed = Math.hypot(a.vx, a.vy);
    if (speed > MAX_SPEED) { a.vx = (a.vx / speed) * MAX_SPEED; a.vy = (a.vy / speed) * MAX_SPEED; }
    a.x += a.vx * dt;
    a.y += a.vy * dt;
    const margin = a.radius + 8;
    if (a.x < margin) { a.x = margin; a.vx = Math.abs(a.vx) * 0.6; }
    if (a.x > width - margin) { a.x = width - margin; a.vx = -Math.abs(a.vx) * 0.6; }
    if (a.y < margin) { a.y = margin; a.vy = Math.abs(a.vy) * 0.6; }
    if (a.y > height - margin) { a.y = height - margin; a.vy = -Math.abs(a.vy) * 0.6; }
    if (!reducedMotion) pushTrail(a);
  }
}

export function stepConstellationBodies(bodies, dt, t, reducedMotion) {
  for (const a of bodies) {
    a.bobPhase += dt * 0.6;
    a.x = a.baseX + Math.sin(a.bobPhase) * 3;
    a.y = a.baseY + Math.cos(a.bobPhase * 0.8) * 3;
    if (!reducedMotion) pushTrail(a);
  }
}

export function drawLinks(ctx, bodies, linkDist = 170) {
  ctx.lineWidth = 1;
  for (let i = 0; i < bodies.length; i++) {
    for (let j = i + 1; j < bodies.length; j++) {
      const a = bodies[i], b = bodies[j];
      const dist = Math.hypot(b.x - a.x, b.y - a.y);
      if (dist < linkDist) {
        const alpha = (1 - dist / linkDist) * 0.55;
        ctx.strokeStyle = `rgba(201,164,106,${alpha.toFixed(3)})`;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
    }
  }
}

export function drawTrail(ctx, body, hue) {
  for (let k = 0; k < body.trail.length; k++) {
    const pt = body.trail[k];
    const a = (k / body.trail.length) * 0.35;
    ctx.fillStyle = `hsla(${hue},80%,72%,${a.toFixed(3)})`;
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, 1.4, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function checkChimes(bodies, prevPositions, width, height, onChime) {
  // Löst einen Klang aus, wenn sich zwei Körper neu nahe kommen (Abstand < Summe Radien * 2.2).
  for (let i = 0; i < bodies.length; i++) {
    for (let j = i + 1; j < bodies.length; j++) {
      const a = bodies[i], b = bodies[j];
      const dx = b.x - a.x, dy = b.y - a.y;
      const dist = Math.hypot(dx, dy);
      const threshold = (a.radius + b.radius) * 2.2;
      const key = `${a.id}-${b.id}`;
      const wasNear = prevPositions.get(key);
      const isNear = dist < threshold;
      if (isNear && !wasNear) {
        const midi = yToMidi((a.y + b.y) / 2, height);
        onChime(midi, a.voiceIdx);
      }
      prevPositions.set(key, isNear);
    }
  }
}

export function layoutConstellationPoints(level, width, height) {
  const size = Math.min(width, height) * 0.7;
  const cx = width / 2;
  const cy = height / 2;
  return level.points.map((p) => ({
    x: cx + (p.x - 0.5) * size,
    y: cy + (p.y - 0.5) * size,
  }));
}

export function matchConstellation(bodies, targetPoints, tolerance) {
  // Jeder Zielpunkt braucht mindestens einen nahen, noch nicht verwendeten Körper.
  const used = new Set();
  for (const target of targetPoints) {
    let found = false;
    for (const b of bodies) {
      if (used.has(b.id)) continue;
      if (Math.hypot(b.x - target.x, b.y - target.y) <= tolerance) {
        used.add(b.id);
        found = true;
        break;
      }
    }
    if (!found) return false;
  }
  return true;
}
