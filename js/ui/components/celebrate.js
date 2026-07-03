// The juice toolbox: floating numbers, screen shake, white flash, tier slams,
// and the celebration queue (min 4s spacing so ceremonies never pile up).

import { confetti, goldRain } from './particles.js';
import { toast } from './toast.js';

let shakeEnabled = true;
let reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
export function setShakeEnabled(on) { shakeEnabled = on; }

// --- Floating +$ numbers (pooled) ---
const floatPool = [];
export function floatNum(x, y, text, crit = false) {
  if (reduced) return;
  let el = floatPool.pop();
  if (!el) {
    el = document.createElement('div');
  }
  el.className = `float-num${crit ? ' crit' : ''}`;
  el.textContent = text;
  el.style.left = `${x + (Math.random() - 0.5) * 24}px`;
  el.style.top = `${y - 18}px`;
  document.body.appendChild(el);
  setTimeout(() => {
    el.remove();
    if (floatPool.length < 30) floatPool.push(el);
  }, 700);
}

// --- Screen shake (queue-drop: max one per 500ms) ---
let lastShake = 0;
export function shake(level) {
  if (!shakeEnabled || reduced) return;
  const now = performance.now();
  if (now - lastShake < 500) return;
  lastShake = now;
  const game = document.getElementById('game');
  const cls = `shake-${level}`;
  game.classList.remove('shake-1', 'shake-2', 'shake-4', 'shake-6');
  void game.offsetWidth; // restart animation
  game.classList.add(cls);
  setTimeout(() => game.classList.remove(cls), 500);
}

export function flash() {
  if (reduced) return;
  const el = document.getElementById('flash');
  el.classList.remove('go');
  void el.offsetWidth;
  el.classList.add('go');
}

export function slam(text, viral = false) {
  if (reduced) return;
  const el = document.createElement('div');
  el.className = `tier-slam${viral ? ' viral' : ''}`;
  el.textContent = text;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 1600);
}

// --- Celebration queue: unlocks/milestones never stampede ---
const queue = [];
let lastCelebration = 0;
let draining = false;

export function celebrate(fn, weight = 1) {
  queue.push({ fn, weight });
  drain();
}

function drain() {
  if (draining || !queue.length) return;
  const wait = Math.max(0, lastCelebration + 4000 - performance.now());
  draining = true;
  setTimeout(() => {
    const item = queue.shift();
    lastCelebration = performance.now();
    try { item.fn(); } finally {
      draining = false;
      drain();
    }
  }, wait);
}

// Convenience celebration presets
export function celebrateUnlock({ icon, name, sub, big = false }) {
  celebrate(() => {
    toast({ icon, name: `NEW: ${name}`, sub, tone: 'data' });
    if (big) confetti(60);
  });
}

export function celebrateConfetti(count, gold = false) {
  celebrate(() => {
    confetti(count);
    if (gold) goldRain(Math.floor(count / 2));
  });
}
