// Number formatting: K M B T then aa ab ac… (×1e3 each). Idle-genre
// convention, infinite headroom. Scientific notation available in settings.

let notation = 'short';
export function setNotation(n) { notation = n; }

const SUFFIXES = ['', 'K', 'M', 'B', 'T'];

function alphaSuffix(tier) {
  // tier 5 → 'aa', 6 → 'ab', … 30 → 'az', 31 → 'ba' …
  const i = tier - 5;
  return String.fromCharCode(97 + Math.floor(i / 26)) + String.fromCharCode(97 + (i % 26));
}

export function suffixFor(n) {
  if (n < 1000) return '';
  const tier = Math.floor(Math.log10(n) / 3);
  return tier < SUFFIXES.length ? SUFFIXES[tier] : alphaSuffix(tier);
}

export function fmt(n, decimals = 2) {
  if (!Number.isFinite(n)) return '∞';
  if (n < 0) return '-' + fmt(-n, decimals);
  if (notation === 'sci' && n >= 1e6) return n.toExponential(2).replace('+', '');
  if (n < 1000) {
    return n < 100 && decimals > 0 && n % 1 !== 0 ? n.toFixed(decimals) : String(Math.floor(n));
  }
  const tier = Math.floor(Math.log10(n) / 3);
  const scaled = n / Math.pow(10, tier * 3);
  const suffix = tier < SUFFIXES.length ? SUFFIXES[tier] : alphaSuffix(tier);
  return scaled.toFixed(scaled >= 100 ? 1 : 2) + suffix;
}

export function fmtCash(n) { return '$' + fmt(n); }
export function fmtRate(n) { return '$' + fmt(n) + '/sec'; }
export function fmtInt(n) {
  if (!Number.isFinite(n)) return '∞';
  if (n < 1000) return String(Math.floor(n));
  return fmt(n);
}

export function fmtDur(ms) {
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ${s % 60}s`;
  const h = Math.floor(m / 60);
  if (h < 48) return `${h}h ${m % 60}m`;
  return `${Math.floor(h / 24)}d ${h % 24}h`;
}
