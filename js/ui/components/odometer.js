// Per-digit odometer for the hero cash number: each digit is a translateY
// reel (composite-only writes). Full rebuild only when the formatted string's
// SHAPE changes (e.g. $999 → $1.00K); digit swaps are transform updates.

const odos = [];
const DIGITS = '0123456789';

export function createOdometer(el, getTarget, format) {
  el.classList.add('odo');
  const o = { el, getTarget, format, disp: getTarget(), cells: [], shape: '', ariaT: 0 };
  odos.push(o);
  return o;
}

const shapeOf = (str) => str.replace(/[0-9]/g, '#');

function build(o, str) {
  o.el.textContent = '';
  o.cells = [];
  const wrap = document.createElement('span');
  wrap.setAttribute('aria-hidden', 'true');
  wrap.className = 'odo';
  for (const ch of str) {
    if (ch >= '0' && ch <= '9') {
      const d = document.createElement('span');
      d.className = 'odo-d';
      const reel = document.createElement('span');
      reel.className = 'odo-reel';
      for (const n of DIGITS) {
        const s = document.createElement('span');
        s.textContent = n;
        reel.appendChild(s);
      }
      d.appendChild(reel);
      wrap.appendChild(d);
      o.cells.push({ digit: true, reel, cur: -1 });
    } else {
      const s = document.createElement('span');
      s.className = 'odo-s';
      s.textContent = ch;
      wrap.appendChild(s);
      o.cells.push({ digit: false, el: s, cur: ch });
    }
  }
  o.el.appendChild(wrap);
  o.shape = shapeOf(str);
}

let last = 0;
export function odosFrame(now) {
  if (!last) last = now;
  const dt = Math.min(now - last, 100);
  last = now;
  const k = 1 - Math.exp(-dt * 0.008);
  for (const o of odos) {
    const target = o.getTarget();
    if (!Number.isFinite(o.disp)) o.disp = target;
    o.disp += (target - o.disp) * k;
    if (Math.abs(target - o.disp) < Math.max(Math.abs(target) * 1e-4, 0.005)) o.disp = target;
    const str = o.format(o.disp);
    if (shapeOf(str) !== o.shape) build(o, str);
    for (let i = 0; i < str.length; i++) {
      const c = o.cells[i];
      const ch = str[i];
      if (c.digit) {
        const d = ch.charCodeAt(0) - 48;
        if (d !== c.cur) {
          c.cur = d;
          c.reel.style.transform = `translateY(${-d}em)`;
        }
      } else if (ch !== c.cur) {
        c.cur = ch;
        c.el.textContent = ch;
      }
    }
    if (now - o.ariaT > 1000) {
      o.ariaT = now;
      o.el.setAttribute('aria-label', o.format(target));
    }
  }
}
