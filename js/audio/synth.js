// WebAudio synth — zero asset files. Lazy AudioContext (created on first
// gesture), master gain → compressor, batching rules so sale sounds never
// machine-gun.

let ctx = null;
let master = null;
let sfxGain = null;
let muted = false;
let volume = 0.5;

function ensure() {
  if (ctx) return true;
  try {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    const comp = ctx.createDynamicsCompressor();
    master = ctx.createGain();
    sfxGain = ctx.createGain();
    master.gain.value = muted ? 0 : volume;
    sfxGain.connect(master);
    master.connect(comp);
    comp.connect(ctx.destination);
    return true;
  } catch {
    return false;
  }
}

export function unlockAudio(settings) {
  muted = settings.muted;
  volume = settings.volume;
  // Persistent (not once): iOS standalone suspends the context on every
  // backgrounding and doesn't reliably auto-resume. ensure() early-returns,
  // so this is a no-op branch per interaction.
  const handler = () => {
    if (ensure() && ctx.state === 'suspended') ctx.resume().catch(() => {});
  };
  window.addEventListener('pointerdown', handler);
  window.addEventListener('keydown', handler);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && ctx && ctx.state === 'suspended') ctx.resume().catch(() => {});
  });
}

export function setVolume(v) {
  volume = v;
  if (master && !muted) master.gain.setTargetAtTime(v, ctx.currentTime, 0.02);
}
export function setMuted(m) {
  muted = m;
  if (master) master.gain.setTargetAtTime(m ? 0 : volume, ctx.currentTime, 0.02);
}

function osc(type, freq, t0, dur, gain = 0.15, dest = null, detune = 0) {
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  if (detune) o.detune.value = detune;
  g.gain.setValueAtTime(gain, t0);
  g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
  o.connect(g);
  g.connect(dest || sfxGain);
  o.start(t0);
  o.stop(t0 + dur + 0.02);
  return o;
}

let noiseBuf = null;
function noise(t0, dur, gain = 0.1, freq = 3000, q = 1) {
  if (!noiseBuf) {
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  const src = ctx.createBufferSource();
  src.buffer = noiseBuf;
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = freq;
  bp.Q.value = q;
  const g = ctx.createGain();
  g.gain.setValueAtTime(gain, t0);
  g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
  src.connect(bp); bp.connect(g); g.connect(sfxGain);
  src.start(t0);
  src.stop(t0 + dur + 0.02);
}

const semitone = (n) => Math.pow(2, n / 12);

// --- Click blip: pitch rises with hype tier ---
export function sClick(hypePct = 0) {
  if (!ensure() || muted) return;
  const t0 = ctx.currentTime;
  const steps = Math.min(12, Math.floor(hypePct * 14));
  osc('square', 880 * semitone(steps), t0, 0.035, 0.05);
}

// --- Cha-ching: batched; pitch rises with batch size ---
let lastChaChing = 0;
let chaChingCombo = 0;
export function sChaChing(big = false) {
  if (!ensure() || muted) return;
  const now = performance.now();
  if (now - lastChaChing < 125) return; // 8/sec cap
  chaChingCombo = now - lastChaChing < 2000 ? Math.min(chaChingCombo + 1, 12) : 0;
  lastChaChing = now;
  const t0 = ctx.currentTime;
  const p = semitone(chaChingCombo);
  const vary = 1 + (Math.random() - 0.5) * 0.06;
  osc('sine', 1318 * p * vary, t0, 0.09, big ? 0.14 : 0.09);
  osc('sine', 1760 * p * vary, t0 + 0.05, 0.12, big ? 0.12 : 0.08);
  noise(t0 + 0.02, 0.03, 0.03, 4200, 2);
  if (big) osc('sine', 90, t0, 0.18, 0.2);
}

export function sBuy() {
  if (!ensure() || muted) return;
  const t0 = ctx.currentTime;
  const o = osc('triangle', 180, t0, 0.12, 0.14);
  o.frequency.exponentialRampToValueAtTime(90, t0 + 0.12);
}

export function sToast() {
  if (!ensure() || muted) return;
  const t0 = ctx.currentTime;
  const o = osc('triangle', 300, t0, 0.11, 0.09);
  o.frequency.exponentialRampToValueAtTime(600, t0 + 0.09);
}

export function sUnlock() {
  if (!ensure() || muted) return;
  const t0 = ctx.currentTime;
  [880, 1108.7, 1318.5].forEach((f, i) => {
    osc('sine', f, t0 + i * 0.07, 0.9, 0.08);
    osc('sine', f * 3, t0 + i * 0.07, 0.35, 0.015);
  });
}

export function sReelTick() {
  if (!ensure() || muted) return;
  noise(ctx.currentTime, 0.012, 0.06, 2000, 3);
}

export function sHit() {
  if (!ensure() || muted) return;
  const t0 = ctx.currentTime;
  [523.25, 659.25, 784].forEach((f) => {
    const o = osc('sawtooth', f, t0, 0.28, 0.06);
    o.detune.value = (Math.random() - 0.5) * 10;
  });
}

export function sFlop() {
  if (!ensure() || muted) return;
  const t0 = ctx.currentTime;
  const o = osc('sine', 220, t0, 0.3, 0.12);
  o.frequency.exponentialRampToValueAtTime(82, t0 + 0.28);
}

export function sViral() {
  if (!ensure() || muted) return;
  const t0 = ctx.currentTime;
  const notes = [523.25, 659.25, 784, 1046.5, 1318.5, 1568];
  notes.forEach((f, i) => {
    osc('sawtooth', f, t0 + i * 0.09, 0.4, 0.07, null, -6);
    osc('sawtooth', f, t0 + i * 0.09, 0.4, 0.07, null, 6);
  });
  // riser + crash
  noise(t0, 0.9, 0.03, 1200, 0.7);
  noise(t0 + 0.55, 0.7, 0.12, 5000, 0.6);
}

export function sWave() {
  if (!ensure() || muted) return;
  noise(ctx.currentTime, 0.4, 0.08, 900, 0.6);
}

export function sStamp() {
  if (!ensure() || muted) return;
  const t0 = ctx.currentTime;
  osc('sine', 42, t0, 0.09, 0.25);
  noise(t0, 0.03, 0.08, 2500, 1);
}

export function sError() {
  if (!ensure() || muted) return;
  const t0 = ctx.currentTime;
  osc('square', 160, t0, 0.09, 0.05, null, -12);
  osc('square', 160, t0, 0.09, 0.05, null, 12);
}

export function sLevelUp() {
  if (!ensure() || muted) return;
  const t0 = ctx.currentTime;
  [392, 523.25, 659.25, 784].forEach((f, i) => osc('square', f, t0 + i * 0.08, 0.16, 0.05));
}

export function sPrestige() {
  if (!ensure() || muted) return;
  const t0 = ctx.currentTime;
  // detuned saw pad through an opening filter
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.setValueAtTime(300, t0);
  lp.frequency.exponentialRampToValueAtTime(6000, t0 + 2.6);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(0.16, t0 + 1.2);
  g.gain.exponentialRampToValueAtTime(0.001, t0 + 3.8);
  lp.connect(g); g.connect(sfxGain);
  [110, 164.8, 220].forEach((f) => {
    [-8, 0, 8].forEach((d) => {
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = f;
      o.detune.value = d;
      o.connect(lp);
      o.start(t0);
      o.stop(t0 + 4);
    });
  });
  // shimmer
  [2093, 2637, 3136].forEach((f, i) => osc('sine', f, t0 + 2 + i * 0.15, 1.4, 0.02));
}
