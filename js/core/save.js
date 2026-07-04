// Persistence: dual-slot localStorage saves, append-only migrations,
// checksummed base64 export/import, and offline-progress calculation.
// Everything except the localStorage IO is pure (usable headlessly).

import { SCHEMA_VERSION, createInitialState } from './state.js';
import { offlineCps, getDerived, invalidate, BAL } from './balance.js';
import { addCash, addFollowers, addHype } from './sim.js';
import { bus } from './bus.js';

const KEY = 'shiphappens.save';
const BAK = 'shiphappens.save.bak';
export const EXPORT_PREFIX = 'SHIP1|';

// Append-only: migrations[v] upgrades a save FROM schema v to v+1.
const migrations = {
  // 1: (s) => { ... },
};

function fnv1a(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16);
}

export function serialize(state, now) {
  state.meta.lastSeen = now;
  const s = JSON.stringify(state);
  return JSON.stringify({ v: state.v, t: now, c: fnv1a(s), s });
}

export function deserialize(payloadStr) {
  const payload = JSON.parse(payloadStr);
  if (!payload || typeof payload.s !== 'string') throw new Error('bad save shape');
  if (payload.c && fnv1a(payload.s) !== payload.c) throw new Error('checksum mismatch');
  let save = JSON.parse(payload.s);
  let v = payload.v ?? save.v ?? 1;
  while (v < SCHEMA_VERSION) {
    if (!migrations[v]) {
      throw new Error(`save is from HustleOS 4.x (schema v${v}) — retired by the 5.0 "Mentorship" reset`);
    }
    save = migrations[v](save) || save;
    v++;
  }
  return { save, savedAt: payload.t };
}

// Deep-merge the loaded save over fresh defaults so missing fields always
// get sane values (belt and suspenders on top of migrations).
export function rehydrate(save, now) {
  const base = createInitialState(now);
  deepMerge(base, save);
  base.v = SCHEMA_VERSION;
  // Wallet fields must be finite numbers — reject NaN corruption.
  for (const k of ['cash', 'lifetimeCash', 'followers', 'hype', 'energy']) {
    if (!Number.isFinite(base.run[k])) base.run[k] = 0;
  }
  if (!Number.isFinite(base.acct.lifetimeAllTime)) base.acct.lifetimeAllTime = 0;
  // Easter egg: impossible ledger → fix it, grant content not warfare.
  if (base.run.cash > base.run.lifetimeCash) {
    base.run.lifetimeCash = base.run.cash;
    base.acct.stats.creativeAccounting = 1;
  }
  return base;
}

function deepMerge(target, src) {
  for (const k in src) {
    const sv = src[k];
    if (sv && typeof sv === 'object' && !Array.isArray(sv)
      && target[k] && typeof target[k] === 'object' && !Array.isArray(target[k])) {
      deepMerge(target[k], sv);
    } else if (sv !== undefined) {
      target[k] = sv;
    }
  }
}

// --- Browser IO -------------------------------------------------------------

export function saveToStorage(state, now) {
  try {
    const data = serialize(state, now);
    const prev = localStorage.getItem(KEY);
    if (prev) localStorage.setItem(BAK, prev);
    localStorage.setItem(KEY, data);
    bus.emit('saved');
    return true;
  } catch {
    return false;
  }
}

export function loadFromStorage(now) {
  for (const key of [KEY, BAK]) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const { save, savedAt } = deserialize(raw);
      const state = rehydrate(save, now);
      return { state, savedAt, restoredBackup: key === BAK };
    } catch {
      // fall through to backup
    }
  }
  return null;
}

export function hardReset() {
  localStorage.removeItem(KEY);
  localStorage.removeItem(BAK);
}

// --- Export / import ----------------------------------------------------------

export function exportSave(state, now) {
  const data = serialize(state, now);
  const bytes = new TextEncoder().encode(data);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return EXPORT_PREFIX + btoa(bin);
}

export function importSave(text, now) {
  const trimmed = text.trim();
  if (!trimmed.startsWith(EXPORT_PREFIX)) throw new Error('not a Ship Happens export');
  const bin = atob(trimmed.slice(EXPORT_PREFIX.length));
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  const { save, savedAt } = deserialize(new TextDecoder().decode(bytes));
  return { state: rehydrate(save, now), savedAt };
}

// --- Offline progress -----------------------------------------------------------

// Compute (but do not apply) offline gains for a freshly loaded state.
export function computeOffline(state, awayMs) {
  const d = getDerived(state);
  const cappedMs = Math.max(0, Math.min(awayMs, d.offlineCapMs));
  const cps = offlineCps(state);
  const cash = cps * (cappedMs / 1000) * d.offlineRate;
  let followers = 0;
  if (d.offlineFollowers && state.run.followers >= 1) {
    followers = BAL.DRIP_COEF * Math.sqrt(state.run.followers) * (cappedMs / 1000);
  }
  return { awayMs, cappedMs, cash, followers, rate: d.offlineRate };
}

export function applyOffline(state, report, doubled) {
  const mult = doubled ? 2 : 1;
  if (report.cash > 0) addCash(state, report.cash * mult);
  if (report.followers > 0) addFollowers(state, report.followers * mult);
  addHype(state, 10);
  if (doubled) state.acct.stats.sponsorDoubles++;
  if (report.cappedMs >= 8 * 3600 * 1000) state.acct.stats.offlineCollects8h++;
  bus.emit('offline:collected', { ...report, doubled });
}

// Session-start bookkeeping after any load or long absence.
export function onSessionStart(state, awayMs) {
  const s = state.sim;
  s.sessionStartMs = s.timeMs;
  s.momentActive = false;
  // Null timers = system not story-armed yet; leave dormant (Math.min against
  // null would coerce to 0 and fire a moment instantly on load).
  if (s.nextMomentMs != null) {
    s.nextMomentMs = Math.min(s.nextMomentMs, s.timeMs + BAL.MOMENT_SESSION_PITY_MS);
  }
  // Don't let a wave that "should" have fired mid-absence fire instantly.
  s.waveForeshadowed = false;
  s.pendingWaveTag = null;
  if (s.nextWaveMs != null && s.nextWaveMs < s.timeMs + 45000) {
    s.nextWaveMs = s.timeMs + 45000 + (s.timeMs % 30000);
  }
  // Energy regenerates while away.
  const d = getDerived(state);
  state.run.energy = Math.min(d.energyMax, state.run.energy + awayMs / d.energyRegenMs);
  // Comeback buff after a long absence.
  if (awayMs >= BAL.COMEBACK_AWAY_MS) {
    s.comebackEndMs = s.timeMs + BAL.COMEBACK_MS;
  }
  invalidate();
}
