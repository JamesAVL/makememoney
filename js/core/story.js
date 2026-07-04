// Story engine: delivers Chase Margin's DMs and applies their grants.
// Pure (no DOM/Date.now/Math.random) — runs identically in the browser and
// the headless balance harness. Alongside sim.js/actions.js this is the third
// sanctioned writer of state; it only touches state.story and the scheduler
// arming fields it owns.
//
// Delivery contract: at most ONE undelivered-unacked beat at a time, beats
// evaluate in authored order, `after` chains require the prior beat ACKED,
// and deliveries are spaced by MIN_GAP_MS of sim time. Grants (unlock flags,
// scheduler arming, xp) apply on ACK — reading the DM is the unlock.

import { STORY_BEATS, BEATS_BY_ID, MIN_GAP_MS } from '../data/story.js';
import { BAL, invalidate } from './balance.js';
import { bus } from './bus.js';

export function pendingBeat(state) {
  const st = state.story;
  for (const id in st.seen) if (!st.acked[id]) return BEATS_BY_ID[id];
  return null;
}

// Called from sim.js's 1 Hz housekeeping block.
export function checkStory(state) {
  const st = state.story;
  const t = state.sim.timeMs;
  if (t - st.lastDeliveryMs < MIN_GAP_MS && st.lastDeliveryMs > 0) return;
  if (pendingBeat(state)) return; // one DM at a time — part of the noise diet
  for (const b of STORY_BEATS) {
    if (st.seen[b.id]) continue;
    if (b.after && !st.acked[b.after]) continue;
    if (!b.trigger(state)) continue;
    st.seen[b.id] = t;
    st.lastDeliveryMs = t;
    bus.emit('story:beat', { id: b.id });
    return; // one delivery per check
  }
}

// The ACK verb. UI "read" buttons and the harness bots both call this.
export function ackStoryBeat(state, id) {
  const b = BEATS_BY_ID[id];
  const st = state.story;
  if (!b || !st.seen[id] || st.acked[id]) return false;
  st.acked[id] = state.sim.timeMs;
  if (b.unlocks) st.unlocks[b.unlocks] = true;
  if (b.arm === 'waves') {
    state.sim.nextWaveMs = state.sim.timeMs + BAL.WAVE_FIRST_DELAY_MS;
  } else if (b.arm === 'moments') {
    state.sim.nextMomentMs = state.sim.timeMs + BAL.MOMENT_FIRST_DELAY_MS;
  }
  invalidate();
  bus.emit('story:ack', { id });
  return true;
}

export function ackAllStory(state) {
  let acked = 0;
  for (const id in state.story.seen) {
    if (ackStoryBeat(state, id)) acked++;
  }
  return acked;
}

export function unreadStory(state) {
  const st = state.story;
  let n = 0;
  for (const id in st.seen) if (!st.acked[id]) n++;
  return n;
}

// The next gating beat for the goal breadcrumb: the delivered-unacked one if
// it exists, else the first un-seen gate whose `after` chain is satisfied.
export function nextGatingBeat(state) {
  const st = state.story;
  const p = pendingBeat(state);
  if (p) return { beat: p, delivered: true };
  for (const b of STORY_BEATS) {
    if (!b.gate || st.seen[b.id]) continue;
    if (b.after && !st.acked[b.after]) continue;
    return { beat: b, delivered: false };
  }
  return null;
}
