// Fixed-timestep sim (10 Hz) decoupled from a rAF render loop. Browser-only —
// the headless harness drives simTick directly.

import { simTick, addCash } from './sim.js';
import { BAL, offlineCps, getDerived } from './balance.js';
import { saveToStorage, onSessionStart } from './save.js';
import { bus } from './bus.js';

const MAX_CATCHUP_TICKS = 600; // 60s of real ticks per frame batch

export function startLoop(state, renderFlush) {
  let acc = 0;
  let lastFrame = performance.now();
  let lastSave = Date.now();

  function frame(now) {
    let delta = now - lastFrame;
    lastFrame = now;
    if (delta < 0) delta = 0;
    acc += delta;

    if (acc >= BAL.SIM_DT * MAX_CATCHUP_TICKS) {
      // Tab was throttled/hidden for a long stretch: route the remainder
      // through the offline formula at 100% (short absences aren't penalized),
      // advance the sim clock, and re-arm schedulers.
      const gap = acc;
      acc = 0;
      const earned = offlineCps(state) * (gap / 1000);
      addCash(state, earned);
      state.sim.timeMs += gap;
      state.meta.playtimeMs += gap;
      onSessionStart(state, gap);
      bus.emit('catchup', { ms: gap, earned });
    }

    let ticks = 0;
    while (acc >= BAL.SIM_DT && ticks < MAX_CATCHUP_TICKS) {
      simTick(state, BAL.SIM_DT);
      acc -= BAL.SIM_DT;
      ticks++;
    }

    renderFlush(state, now);

    // Autosave every 15s of wall time.
    if (Date.now() - lastSave > 15000) {
      lastSave = Date.now();
      saveToStorage(state, Date.now());
    }

    requestAnimationFrame(frame);
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) saveToStorage(state, Date.now());
  });
  window.addEventListener('pagehide', () => saveToStorage(state, Date.now()));

  requestAnimationFrame(frame);
}
