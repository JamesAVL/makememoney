// Canonical game state. Single mutable object; sim.js and actions.js are the
// only writers. Scoping rule: `run` resets on Exit, `acct` never resets,
// `sim` is scheduler bookkeeping (sim-time timestamps only — never wall clock).

export const SCHEMA_VERSION = 1;

export function createInitialState(now) {
  return {
    v: SCHEMA_VERSION,
    meta: {
      created: now,
      lastSeen: now,
      playtimeMs: 0,
      rngState: (now ^ 0x9e3779b9) >>> 0,
    },
    sim: {
      timeMs: 0,
      sessionStartMs: 0,      // reset on every load; drives session pity timers
      // Trend waves
      waveTag: null,
      waveEndMs: 0,
      nextWaveMs: 240000,
      waveForeshadowed: false,
      waveRidden: false,
      warmTag: 'satisfying',
      // Viral moments (golden cookies)
      momentActive: false,
      momentExpireMs: 0,
      nextMomentMs: 150000,
      autoMomentMs: 0,
      // Temp buffs from moments (frenzy / mega)
      buffMult: 1,
      buffEndMs: 0,
      buffLabel: '',
      comebackEndMs: 0,
      lastPostMs: 0,
      lastAutoLaunchMs: 0,
      lastAchCheckMs: 0,
      lastHistoryMs: 0,
    },
    run: {
      number: 1,
      companyName: 'Ship Happens LLC',
      niche: null,             // niche id after first rebrand
      nicheChoices: null,      // [ids] pending pick during rebrand
      cash: 0,
      lifetimeCash: 0,         // this run; also serves as "cash seen" for gates
      followers: 0,
      hype: 0,
      energy: 3,
      products: {},            // id -> count owned
      unlocked: { banana: true },
      upgrades: {},            // id -> true
      pendingAd: null,         // { hookId, productId, tagId, title, locked: {} }
      campaigns: [],           // ClikClok bursts: {outcome, mult, startMs, endMs, title, tag}
      fbSlot: null,            // FaceSpace persistent: {outcome, mult, title}
      pity: 0,                 // non-viral launches since last VIRAL+
      startMs: 0,              // sim time the run began
      spins: 0,
    },
    acct: {
      lifetimeAllTime: 0,
      investorsEarnedTotal: 0, // claimed via exits (monotonic until IPO layer)
      investors: 0,            // unspent = +4% income each
      guru: {},                // nodeId -> true
      exits: 0,
      lastRunAvgCps: 0,
      xp: 0,                   // progress into current level
      level: 1,
      perkPoints: 0,
      perks: {},               // perkId -> rank
      achievements: {},        // id -> wall time unlocked
      hallOfFame: [],          // [{title, views, at}]
      runLog: [],              // [{name, soldFor, investors, ms}]
      standup: { day: '', streak: 0, guaranteed: false }, // daily bonus (pauses, never resets)
      stats: {
        itemsSold: 0, totalClicks: 0, crits: 0,
        totalLaunches: 0, viralHits: 0, megaVirals: 0, flops: 0,
        pityVirals: 0, chaosJackpots: 0, boostedLaunches: 0,
        maxFollowers: 0, maxHype: 0, maxOneProduct: 0, maxTierUnlocked: 1,
        wavesRidden: 0, momentsClicked: 0, whaleOrders: 0,
        offlineCollects8h: 0, logoClicks: 0, creativeAccounting: 0,
        bestCps: 0,
      },
    },
    ftue: {
      clicks: 0,
      riggedSpinDone: false,
      unlocks: {},             // panelId -> true once celebrated
      tips: {},
    },
    settings: {
      volume: 0.5, muted: false, notation: 'short',
      particles: true, shake: true,
    },
    history: [],               // [simMs, cps] samples, 1 per 2s, capped 450
  };
}
