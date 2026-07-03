// Bottom hustle ticker: 70% jokes, 30% actionable signal (wave foreshadows
// are injected live and highlighted).

import { TICKER_JOKES } from '../../data/flavor.js';
import { TAGS_BY_ID } from '../../data/ads.js';
import { bus } from '../../core/bus.js';

let track = null;

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function mount(root) {
  track = document.getElementById('ticker-track');
  rebuild();
  bus.on('wave:foreshadow', ({ tag }) => {
    const label = TAGS_BY_ID[tag]?.label || tag;
    inject(`📡 BREAKING: ${label} engagement up 400% among people with wallets`);
  });
  bus.on('wave:start', ({ tag }) => {
    const label = TAGS_BY_ID[tag]?.label || tag;
    inject(`🌊 ${label} IS SURGING — matching products flying off the (virtual) shelves`);
  });
}

function rebuild() {
  const jokes = shuffle(TICKER_JOKES).slice(0, 12);
  track.innerHTML = jokes.map((j) => `<span>${j}</span>`).join('');
}

function inject(text) {
  if (!track) return;
  const el = document.createElement('span');
  el.className = 'hint';
  el.textContent = `⚡ ${text}`;
  track.prepend(el);
  setTimeout(() => el.remove(), 90000);
}

export function update() {}
