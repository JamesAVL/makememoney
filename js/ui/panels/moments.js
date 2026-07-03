// Viral Moment floaters (golden cookies): spawn a bobbing clickable in the
// stage area, pay out via actions.clickMoment, celebrate the reward.

import { clickMoment } from '../../core/actions.js';
import { bus } from '../../core/bus.js';
import { fmtCash, fmtInt } from '../fmt.js';
import { slam, flash, shake } from '../components/celebrate.js';
import { toast } from '../components/toast.js';
import { confetti, goldRain } from '../components/particles.js';
import { sViral, sHit } from '../../audio/synth.js';

let state_ = null;
let root_ = null;
let floater = null;

const EMOJI = ['🔥', '📈', '💸', '⭐', '🛒'];

export function mount(root, state) {
  state_ = state;
  root_ = document.getElementById('moment-root');

  bus.on('moment:spawn', spawn);
  bus.on('moment:expire', remove);
  bus.on('moment:reward', (r) => {
    if (r.auto && r.kind !== 'mega') return; // quiet for VA catches
    if (r.kind === 'frenzy') {
      slam(`🔥 SALES FRENZY ×${r.mult.toFixed(0)}`);
      sHit();
      confetti(40);
    } else if (r.kind === 'storm') {
      slam(`👁 FOLLOWER STORM +${fmtInt(r.followers)}`);
      sHit();
    } else if (r.kind === 'whale') {
      slam(`🐋 WHALE ORDER +${fmtCash(r.cash)}`);
      sViral();
      confetti(80);
      shake(2);
    } else if (r.kind === 'mega') {
      slam(`🌋 MEGA-VIRAL ×${r.mult.toFixed(0)}`, true);
      sViral();
      flash();
      shake(4);
      confetti(150);
      goldRain(60);
    }
  });

  // If a moment was mid-air when we saved, respawn its floater.
  if (state.sim.momentActive) spawn();
}

function spawn() {
  remove();
  const stage = document.getElementById('stage');
  const r = stage.getBoundingClientRect();
  floater = document.createElement('button');
  floater.className = 'moment';
  floater.style.left = `${r.left + 40 + Math.random() * Math.max(60, r.width - 140)}px`;
  floater.style.top = `${r.top + 50 + Math.random() * Math.max(60, r.height - 190)}px`;
  floater.innerHTML = `${EMOJI[Math.floor(Math.random() * EMOJI.length)]}<span class="m-label">TRENDING</span>`;
  floater.title = 'Something is trending. Click it before it stops.';
  floater.addEventListener('click', () => {
    clickMoment(state_);
    remove();
  });
  root_.appendChild(floater);
}

function remove() {
  if (floater) {
    floater.remove();
    floater = null;
  }
}

export function update() {}
