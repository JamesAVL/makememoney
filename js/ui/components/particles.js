// Pooled canvas particle system. Structure-of-arrays, zero allocation after
// boot; glow via pre-blurred sprites (never per-frame shadowBlur).

const MAX = 512;
const px = new Float32Array(MAX);
const py = new Float32Array(MAX);
const vx = new Float32Array(MAX);
const vy = new Float32Array(MAX);
const life = new Float32Array(MAX);
const maxLife = new Float32Array(MAX);
const size = new Float32Array(MAX);
const rot = new Float32Array(MAX);
const vr = new Float32Array(MAX);
const sprite = new Uint8Array(MAX);
const gravity = new Float32Array(MAX);
let alive = 0;

let canvas, ctx, dpr = 1;
let sprites = [];
let enabled = true;
let reduced = false;
let lastNow = 0;

function makeGlowSprite(color, r) {
  const c = document.createElement('canvas');
  const pad = r * 3;
  c.width = c.height = pad * 2;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(pad, pad, 0, pad, pad, r * 2.6);
  grad.addColorStop(0, color);
  grad.addColorStop(0.4, color + 'aa');
  grad.addColorStop(1, color + '00');
  g.fillStyle = grad;
  g.fillRect(0, 0, pad * 2, pad * 2);
  return c;
}

function makeBoxSprite() {
  const c = document.createElement('canvas');
  c.width = c.height = 16;
  const g = c.getContext('2d');
  g.fillStyle = '#c98d4b';
  g.fillRect(2, 3, 12, 10);
  g.fillStyle = '#e8b984';
  g.fillRect(2, 3, 12, 3);
  g.strokeStyle = '#8a5a26';
  g.strokeRect(2.5, 3.5, 11, 9);
  g.fillStyle = '#f2e4c9';
  g.fillRect(7, 3, 2, 10);
  return c;
}

function makeConfettiSprite(color) {
  const c = document.createElement('canvas');
  c.width = 8; c.height = 12;
  const g = c.getContext('2d');
  g.fillStyle = color;
  g.fillRect(0, 0, 8, 12);
  return c;
}

// sprite indices
export const SPR = { MONEY: 0, GOLD: 1, DATA: 2, HYPE: 3, BOX: 4, CF0: 5, CF1: 6, CF2: 7, CF3: 8, CF4: 9 };

export function initParticles() {
  canvas = document.getElementById('fx');
  ctx = canvas.getContext('2d');
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  const resize = () => {
    canvas.width = innerWidth * dpr;
    canvas.height = innerHeight * dpr;
  };
  resize();
  window.addEventListener('resize', resize);
  reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  sprites = [
    makeGlowSprite('#22d67c', 4), makeGlowSprite('#f5b93e', 4),
    makeGlowSprite('#38bdf8', 4), makeGlowSprite('#d946ef', 4),
    makeBoxSprite(),
    makeConfettiSprite('#22d67c'), makeConfettiSprite('#f5b93e'),
    makeConfettiSprite('#38bdf8'), makeConfettiSprite('#d946ef'),
    makeConfettiSprite('#e6eaf2'),
  ];
}

export function setParticlesEnabled(on) { enabled = on; }

function spawnOne(x, y, velX, velY, ms, sz, spr, grav) {
  if (alive >= MAX) return;
  const i = alive++;
  px[i] = x; py[i] = y; vx[i] = velX; vy[i] = velY;
  life[i] = ms; maxLife[i] = ms; size[i] = sz;
  rot[i] = Math.random() * 6.28; vr[i] = (Math.random() - 0.5) * 8;
  sprite[i] = spr; gravity[i] = grav;
}

// Cone burst (clicks, buys)
export function burst(x, y, count, spr = SPR.MONEY, speed = 120) {
  if (!enabled || reduced) return;
  const n = Math.min(count, MAX - alive);
  for (let i = 0; i < n; i++) {
    const ang = -Math.PI / 2 + (Math.random() - 0.5) * 1.2;
    const v = speed * (0.5 + Math.random());
    spawnOne(x, y, Math.cos(ang) * v, Math.sin(ang) * v, 500 + Math.random() * 250, 0.8 + Math.random() * 0.6, spr, 340);
  }
}

// Full-viewport confetti shower
export function confetti(count) {
  if (!enabled || reduced) return;
  const n = Math.min(count, MAX - alive);
  for (let i = 0; i < n; i++) {
    spawnOne(
      Math.random() * innerWidth, -20 - Math.random() * innerHeight * 0.3,
      (Math.random() - 0.5) * 80, 60 + Math.random() * 120,
      1800 + Math.random() * 1200, 0.8 + Math.random() * 0.8,
      SPR.CF0 + Math.floor(Math.random() * 5), 60,
    );
  }
}

// Gold rain (mega-viral)
export function goldRain(count) {
  if (!enabled || reduced) return;
  const n = Math.min(count, MAX - alive);
  for (let i = 0; i < n; i++) {
    spawnOne(
      Math.random() * innerWidth, -20,
      (Math.random() - 0.5) * 40, 120 + Math.random() * 180,
      1500 + Math.random() * 900, 1 + Math.random(), SPR.GOLD, 120,
    );
  }
}

export function particlesFrame(now) {
  if (!ctx) return;
  if (!lastNow) lastNow = now;
  const dt = Math.min((now - lastNow) / 1000, 0.05);
  lastNow = now;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (!alive) return;
  ctx.save();
  ctx.scale(dpr, dpr);
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < alive; i++) {
    life[i] -= dt * 1000;
    if (life[i] <= 0) {
      // swap-remove
      alive--;
      px[i] = px[alive]; py[i] = py[alive]; vx[i] = vx[alive]; vy[i] = vy[alive];
      life[i] = life[alive]; maxLife[i] = maxLife[alive]; size[i] = size[alive];
      rot[i] = rot[alive]; vr[i] = vr[alive]; sprite[i] = sprite[alive]; gravity[i] = gravity[alive];
      i--;
      continue;
    }
    vy[i] += gravity[i] * dt;
    px[i] += vx[i] * dt;
    py[i] += vy[i] * dt;
    rot[i] += vr[i] * dt;
    const a = Math.min(1, life[i] / (maxLife[i] * 0.4));
    const img = sprites[sprite[i]];
    ctx.globalAlpha = a;
    if (sprite[i] >= SPR.CF0 || sprite[i] === SPR.BOX) {
      ctx.save();
      ctx.translate(px[i], py[i]);
      ctx.rotate(rot[i]);
      ctx.drawImage(img, -img.width * size[i] / 2, -img.height * size[i] / 2, img.width * size[i], img.height * size[i]);
      ctx.restore();
    } else {
      const w = img.width * size[i];
      ctx.drawImage(img, px[i] - w / 2, py[i] - w / 2, w, w);
    }
  }
  ctx.restore();
}
