// Device-level native integrations: gesture hardening, haptics, wake lock,
// storage persistence, share. Everything feature-detected; everything a
// graceful no-op where unsupported. Listens to the bus — never touches core.

import { toast } from '../ui/components/toast.js';

// --- Gesture hardening -------------------------------------------------------

export function hardenGestures(standalone) {
  // Long-press context menu: a touch problem — desktop right-click stays.
  window.addEventListener('contextmenu', (e) => {
    if (!matchMedia('(pointer: coarse)').matches) return;
    if (e.target.closest('input, textarea')) return;
    e.preventDefault();
  });
  // iOS standalone ignores user-scalable; the non-standard gesture events are
  // the only pinch hook. Standalone-only so in-browser a11y zoom survives.
  if (standalone) {
    for (const t of ['gesturestart', 'gesturechange']) {
      document.addEventListener(t, (e) => e.preventDefault());
    }
  }
}

// --- Haptics ------------------------------------------------------------------

const PATTERNS = {
  crit: [15],
  hit: [20],
  viral: [25, 50, 45],
  mega: [30, 40, 60, 40, 110],
  whale: [30, 30, 30],
  levelup: [10, 30, 20],
  prestige: [80, 50, 80, 50, 200],
};

let hapticsOn = true;
let lastBuzz = 0;

export const hapticsSupported = () => 'vibrate' in navigator;
export const setHapticsEnabled = (on) => { hapticsOn = on; };

export function buzz(kind) {
  if (!hapticsOn || !navigator.vibrate) return;
  const now = performance.now();
  const heavy = kind === 'mega' || kind === 'prestige';
  if (!heavy && now - lastBuzz < 250) return; // never machine-gun the motor
  lastBuzz = now;
  try { navigator.vibrate(PATTERNS[kind] || 10); } catch { /* blocked pre-gesture */ }
}

export function initHaptics(bus) {
  if (!hapticsSupported()) return;
  bus.on('click', (p) => { if (p.crit) buzz('crit'); });
  bus.on('launch', (r) => {
    if (r.outcome.id === 'mega') buzz('mega');
    else if (r.outcome.id === 'viral') buzz('viral');
    else if (r.outcome.id === 'hit') buzz('hit');
  });
  bus.on('moment:reward', (r) => {
    if (r.kind === 'mega') buzz('mega');
    else if (r.kind === 'whale') buzz('whale');
  });
  bus.on('level:up', () => buzz('levelup'));
  bus.on('exit', () => buzz('prestige'));
}

// --- Screen Wake Lock ("Grind Mode") -------------------------------------------

let sentinel = null;
let wakeWanted = false;

export const wakeLockSupported = () => 'wakeLock' in navigator;

export async function setWakeLock(on) {
  wakeWanted = on;
  if (!wakeLockSupported()) return false;
  try {
    if (on && !sentinel) {
      sentinel = await navigator.wakeLock.request('screen');
      sentinel.addEventListener('release', () => { sentinel = null; });
    } else if (!on && sentinel) {
      await sentinel.release();
      sentinel = null;
    }
    return true;
  } catch {
    return false; // battery saver etc. — degrade silently
  }
}

document.addEventListener('visibilitychange', () => {
  // The OS auto-releases the lock on background; re-acquire when we return.
  if (wakeWanted && document.visibilityState === 'visible') setWakeLock(true);
});

// --- Storage persistence ---------------------------------------------------------

// Never prompts (Firefox shows a dialog on persist(); persisted() is silent).
export async function storageStatus() {
  if (!navigator.storage?.persisted) return null;
  try { return await navigator.storage.persisted(); } catch { return null; }
}

// Explicit request — user-initiated (Settings button) or standalone/post-install.
export async function requestPersistence() {
  if (!navigator.storage?.persist) return null;
  try { return await navigator.storage.persist(); } catch { return null; }
}

// --- Web Share ---------------------------------------------------------------------

export async function shareText(text) {
  const url = new URL('.', location.href).href; // subpath-safe canonical URL
  if (navigator.share) {
    try { await navigator.share({ title: 'Ship Happens', text, url }); } catch { /* cancelled */ }
    return;
  }
  try {
    await navigator.clipboard.writeText(`${text} ${url}`);
    toast({ icon: '📋', name: 'Flex copied', sub: 'Paste it somewhere people pretend to care.' });
  } catch {
    toast({ icon: '🤷', name: 'Sharing unavailable', sub: 'Screenshot it like it’s 2013.' });
  }
}

// --- Fullscreen ------------------------------------------------------------------------

export const fullscreenSupported = () => !!document.documentElement.requestFullscreen;

export function toggleFullscreen() {
  if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  else document.documentElement.requestFullscreen({ navigationUI: 'hide' }).catch(() => {});
}
