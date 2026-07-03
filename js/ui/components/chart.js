// The revenue chart — the dashboard's heart. Glow line (blurred underlay +
// crisp line), gradient fill, animated y-rescale, event-marker pins.

import { fmt } from '../fmt.js';

const WINDOWS = { '60s': 60000, '10m': 600000, 'ALL': Infinity };

export function createChart(canvas) {
  const ctx = canvas.getContext('2d');
  let dpr = Math.min(window.devicePixelRatio || 1, 2);
  let yMax = 10;
  let windowKey = '60s';
  let lastDraw = 0;
  const pins = []; // {t, emoji}

  function resize() {
    const r = canvas.getBoundingClientRect();
    if (!r.width) return;
    canvas.width = r.width * dpr;
    canvas.height = r.height * dpr;
  }
  resize();
  window.addEventListener('resize', resize);

  return {
    setWindow(k) { windowKey = k; lastDraw = 0; },
    getWindow() { return windowKey; },
    addPin(t, emoji) {
      pins.push({ t, emoji });
      if (pins.length > 60) pins.shift();
    },
    draw(state, now, liveCps) {
      if (now - lastDraw < 100) return;
      lastDraw = now;
      if (!canvas.width) resize();
      const W = canvas.width, H = canvas.height;
      ctx.clearRect(0, 0, W, H);
      const hist = state.history;
      const t = state.sim.timeMs;
      const span = WINDOWS[windowKey];
      const t0 = span === Infinity
        ? (hist.length ? hist[0][0] : t - 60000)
        : t - span;

      // Collect visible points + live head
      const pts = [];
      for (const [ts, v] of hist) {
        if (ts >= t0) pts.push([ts, v]);
      }
      pts.push([t, liveCps]);
      if (pts.length < 2) pts.unshift([t0, 0]);

      let max = 1;
      for (const [, v] of pts) if (v > max) max = v;
      // animated rescale — spikes visibly blow the ceiling before it catches up
      yMax += (max * 1.15 - yMax) * 0.12;
      if (yMax < max) yMax = max;

      const X = (ts) => ((ts - t0) / (t - t0 || 1)) * (W - 8 * dpr) + 4 * dpr;
      const Y = (v) => H - 14 * dpr - (v / yMax) * (H - 26 * dpr);

      // grid
      ctx.strokeStyle = '#232a38';
      ctx.lineWidth = 1;
      ctx.setLineDash([4 * dpr, 5 * dpr]);
      for (let i = 1; i <= 3; i++) {
        const y = (H - 26 * dpr) * (i / 4) + 6 * dpr;
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
      }
      ctx.setLineDash([]);

      // area fill
      const grad = ctx.createLinearGradient(0, 0, 0, H);
      grad.addColorStop(0, 'rgba(34,214,124,0.16)');
      grad.addColorStop(1, 'rgba(34,214,124,0)');
      ctx.beginPath();
      ctx.moveTo(X(pts[0][0]), H - 14 * dpr);
      for (const [ts, v] of pts) ctx.lineTo(X(ts), Y(v));
      ctx.lineTo(X(t), H - 14 * dpr);
      ctx.closePath();
      ctx.fillStyle = grad;
      ctx.fill();

      // glow underlay + crisp line
      const drawLine = () => {
        ctx.beginPath();
        ctx.moveTo(X(pts[0][0]), Y(pts[0][1]));
        for (const [ts, v] of pts) ctx.lineTo(X(ts), Y(v));
        ctx.stroke();
      };
      ctx.strokeStyle = 'rgba(34,214,124,0.32)';
      ctx.lineWidth = 6 * dpr;
      ctx.lineJoin = 'round';
      drawLine();
      ctx.strokeStyle = '#22d67c';
      ctx.lineWidth = 2 * dpr;
      drawLine();

      // live head dot
      const hx = X(t), hy = Y(liveCps);
      ctx.fillStyle = '#22d67c';
      ctx.beginPath();
      ctx.arc(hx, hy, 3.5 * dpr, 0, 6.29);
      ctx.fill();
      ctx.fillStyle = 'rgba(34,214,124,0.3)';
      ctx.beginPath();
      ctx.arc(hx, hy, (5 + Math.sin(now / 200) * 2) * dpr, 0, 6.29);
      ctx.fill();

      // event pins
      ctx.font = `${11 * dpr}px sans-serif`;
      ctx.textAlign = 'center';
      for (const pin of pins) {
        if (pin.t < t0 || pin.t > t) continue;
        ctx.fillText(pin.emoji, X(pin.t), 12 * dpr);
      }

      // y label
      ctx.fillStyle = '#98a2b4';
      ctx.font = `${10 * dpr}px ui-monospace, monospace`;
      ctx.textAlign = 'left';
      ctx.fillText('$' + fmt(yMax) + '/s', 6 * dpr, 12 * dpr);
      ctx.textAlign = 'right';
      ctx.fillText('$' + fmt(liveCps) + '/s', W - 6 * dpr, Y(liveCps) - 6 * dpr);
    },
  };
}
