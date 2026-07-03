// PWA plumbing: service-worker registration + update toast, install prompt
// capture (must be imported early — the event can fire before boot), and
// standalone-mode detection.

import { toast } from '../ui/components/toast.js';

// --- Install prompt (top-level: listen before the event fires) ---

let deferredPrompt = null;

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  document.dispatchEvent(new CustomEvent('sh:installable'));
});

window.addEventListener('appinstalled', () => {
  deferredPrompt = null;
  document.dispatchEvent(new CustomEvent('sh:installed'));
});

export const canInstall = () => !!deferredPrompt;

export async function promptInstall() {
  if (!deferredPrompt) return 'unavailable';
  deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;
  if (outcome === 'accepted') deferredPrompt = null;
  return outcome;
}

export const isIOS = () =>
  /iP(hone|ad|od)/.test(navigator.userAgent)
  || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

// --- Standalone detection ---

export function isStandalone() {
  return matchMedia('(display-mode: standalone)').matches
    || matchMedia('(display-mode: minimal-ui)').matches
    || navigator.standalone === true
    || new URLSearchParams(location.search).get('source') === 'pwa';
}

// --- Service worker ---

export function initServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  if (new URLSearchParams(location.search).get('sw') === 'off') {
    // Kill switch for a bad deploy: drop the SW and its caches (saves untouched).
    navigator.serviceWorker.getRegistrations().then((rs) => rs.forEach((r) => r.unregister()));
    caches?.keys().then((ks) => ks.forEach((k) => caches.delete(k)));
    return;
  }
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => { /* http, old browser */ });
  });

  // Debounced update toast: a deploy revalidates many files; wait for the
  // burst to settle so a restart loads a coherent new module graph.
  let timer = null;
  let notified = false;
  navigator.serviceWorker.addEventListener('message', (e) => {
    if (e.data?.type !== 'sw-updated' || notified) return;
    clearTimeout(timer);
    timer = setTimeout(() => {
      notified = true;
      toast({
        icon: '🔄',
        name: 'HustleOS update ready',
        sub: 'A new build shipped. Tap to restart the grind.',
        tone: 'data',
        ms: 12000,
        onClick: () => location.reload(),
      });
    }, 2500);
  });
}
