// Trends board: live wave status with countdown, the warm tag, and a tag
// coverage table (which of your products can ride which trend).

import { TREND_TAGS, TAGS_BY_ID } from '../../data/ads.js';
import { PRODUCTS } from '../../data/products.js';
import { NICHES_BY_ID } from '../../data/niches.js';
import { fmtDur } from '../fmt.js';

let els = {};

export function mount(root, state) {
  root.innerHTML = `
    <div class="panel">
      <div class="panel-title"><span>📈 Trend Forecast Desk</span></div>
      <div id="tr-status" style="font-size:15px;font-weight:700;margin-bottom:4px"></div>
      <div id="tr-sub" class="muted" style="font-size:12px"></div>
    </div>
    <div class="panel">
      <div class="panel-title"><span>Tag coverage — launch matching ads for better odds</span></div>
      <table class="mini-table" id="tr-table"></table>
    </div>
    <div class="panel">
      <div class="panel-title"><span>How the algorithm works (allegedly)</span></div>
      <div class="muted" style="font-size:12px;line-height:1.7">
        🌊 A <b>Trend Wave</b> surges every few minutes: matching products earn ×3 and matching ads
        get +12% better odds.<br>
        📈 One tag is always <b>warm</b> (+6% odds) between waves.<br>
        📡 The news ticker leaks the next wave ~30 seconds early. Read the news.<br>
        🎲 Ads that match <i>nothing</i> have a 5% chance to go mega-viral anyway, because that is how the internet works.
      </div>
    </div>`;
  els = {
    status: root.querySelector('#tr-status'),
    sub: root.querySelector('#tr-sub'),
    table: root.querySelector('#tr-table'),
  };
}

let lastUpdate = 0;
export function update(state, now) {
  if (now && now - lastUpdate < 400) return;
  lastUpdate = now || 0;
  const s = state.sim;
  const t = s.timeMs;

  let status, sub;
  if (s.waveTag) {
    const label = TAGS_BY_ID[s.waveTag].label;
    status = `🌊 ${label} IS SURGING`;
    sub = `${fmtDur(Math.max(0, s.waveEndMs - t))} left — matching products ×3, matching ads +12% odds`;
  } else {
    const label = TAGS_BY_ID[s.warmTag]?.label || '—';
    status = `📈 Warm right now: ${label}`;
    const eta = Math.max(0, s.nextWaveMs - t);
    sub = eta < 30000
      ? '📡 Chatter intensifying… a wave is imminent.'
      : `Next wave rumored in ~${fmtDur(eta)}. The ticker knows first.`;
  }
  if (els.status.textContent !== status) els.status.textContent = status;
  if (els.sub.textContent !== sub) els.sub.textContent = sub;

  const niche = state.run.niche ? NICHES_BY_ID[state.run.niche] : null;
  let rows = '';
  for (const tg of TREND_TAGS) {
    const owned = PRODUCTS.filter((p) => (state.run.products[p.id] || 0) > 0 && p.tags.includes(tg.id));
    if (!owned.length && tg.id !== s.waveTag && tg.id !== s.warmTag) continue;
    let mark = '';
    if (tg.id === s.waveTag) mark = '<span class="chip hot">SURGING</span>';
    else if (tg.id === s.warmTag) mark = '<span class="chip warm">warm</span>';
    if (niche && tg.id === niche.tag) mark += ' <span class="chip">your niche</span>';
    rows += `<tr><td>${tg.label} ${mark}</td><td>${owned.map((p) => p.icon).join(' ') || '<span class="muted">no products</span>'}</td></tr>`;
  }
  if (els.table.innerHTML !== rows) els.table.innerHTML = rows;
}
