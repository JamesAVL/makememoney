// Prestige layer 1: "The Exit". Investors = floor(√(lifetimeAllTime / 1e5)),
// each UNSPENT investor gives +4% global income. Spending them on the Guru
// Grindset Tree removes them from the passive pool — that tension is the
// heart of the layer.

export const INVESTOR_DIVISOR = 6e11;
export const INVESTOR_INCOME = 0.04;
export const EXIT_MIN_LEVEL = 10;

// Virtual-assistant hires by Hustler Level — the single source read by
// sim.js, dashboard.js and LEVEL_UNLOCKS below.
export const VA_LEVELS = Object.freeze({
  autopacker: 8,
  intern: 12,
  campaignmgr: 15,
  trendwatcher: 22,
});

export const GURU_TREE = Object.freeze([
  {
    id: 'rise_grind',
    name: 'Rise & Grind',
    icon: '⏰',
    cost: 10,
    desc: 'Start each run with 30 seconds of your previous run’s average income.',
    flavor: 'It plays airhorn sounds at 4:59 AM. You smile now.',
    effects: [{ type: 'startCash', value: 30 }],
  },
  {
    id: 'mindset_10x',
    name: '10x Your Mindset',
    icon: '🧠',
    cost: 25,
    desc: 'All income ×3, permanently.',
    flavor: 'You read the first chapter of twelve business books.',
    effects: [{ type: 'globalMult', value: 3 }],
  },
  {
    id: 'timezone',
    name: 'Timezone Arbitrage',
    icon: '🌍',
    cost: 60,
    desc: 'Offline earnings rate +25%, offline cap 8h → 24h.',
    flavor: 'It is always business hours somewhere.',
    effects: [
      { type: 'offlineRateAdd', value: 0.25 },
      { type: 'offlineCapMs', value: 24 * 3600 * 1000 },
    ],
  },
  {
    id: 'sigma_supply',
    name: 'Sigma Supply Chain',
    icon: '📦',
    cost: 150,
    desc: 'All income ×3. Product costs −10%.',
    flavor: 'Your supplier has never been seen. It ships things. Don’t ask.',
    effects: [
      { type: 'globalMult', value: 3 },
      { type: 'costMult', value: 0.9 },
    ],
  },
  {
    id: 'printer',
    name: 'Money Printer Never Sleeps',
    icon: '🖨️',
    cost: 400,
    desc: 'Offline time also earns organic followers.',
    flavor: 'The printer dreams of paper.',
    effects: [{ type: 'offlineFollowers', value: 1 }],
  },
  {
    id: 'cult',
    name: 'Cult of Personality',
    icon: '👁️',
    cost: 1000,
    desc: 'Reach exponent 0.40 → 0.45. Followers matter more. A lot more.',
    flavor: 'They don’t follow the products. They follow you.',
    effects: [{ type: 'reachExp', value: 0.45 }],
  },
  {
    id: 'second_yacht',
    name: 'The Second Yacht',
    icon: '🛥️',
    cost: 2500,
    desc: 'All income ×5.',
    flavor: 'The first yacht needed a friend.',
    effects: [{ type: 'globalMult', value: 5 }],
  },
  {
    id: 'integrated',
    name: 'Vertically Integrated Grift',
    icon: '🏗️',
    cost: 6000,
    desc: 'Product milestone bonuses ×2 → ×2.2.',
    flavor: 'You now own the warehouse, the ads, and the disappointment.',
    effects: [{ type: 'milestoneBase', value: 2.2 }],
  },
  {
    id: 'post_economic',
    name: 'Post-Economic',
    icon: '🌌',
    cost: 15000,
    desc: 'All income ×5. A Viral Moment is auto-caught every 10 minutes.',
    flavor: 'Money is a memory. Numbers are forever.',
    effects: [
      { type: 'globalMult', value: 5 },
      { type: 'autoMoment', value: 600000 },
    ],
  },
]);

export const GURU_BY_ID = Object.freeze(
  Object.fromEntries(GURU_TREE.map((n) => [n.id, n]))
);

// Escalating exit flavor, keyed by exit count (falls back to the largest key ≤ count).
export const EXIT_FLAVOR = Object.freeze({
  1: 'Acqui-hired! Blandrock keeps the logo, deletes everything else. You frame the check.',
  2: 'The press release calls it “a strategic synergy.” Nobody reads it. You reread it nightly.',
  3: 'You are invited to speak at a conference in a hotel near an airport.',
  5: 'A business magazine lists you under “30 Under 30 (Assorted).”',
  8: 'Blandrock sends a fruit basket. The fruit is plastic. The gesture is real.',
  10: 'You now sell courses about selling. The ouroboros orders a course.',
  15: 'Your autobiography gets an autobiography.',
  25: 'Blandrock Capital calls. They want YOU to acquire THEM. You ask if they take exposure.',
  50: 'You are no longer a person. You are a keynote.',
});

export function exitFlavor(exitCount) {
  let best = EXIT_FLAVOR[1];
  for (const k of Object.keys(EXIT_FLAVOR)) {
    if (Number(k) <= exitCount) best = EXIT_FLAVOR[k];
  }
  return best;
}

// Level-perk list (account-permanent, bought with perk points from levels).
// 5 ranks each, cost 1/1/2/2/3 points.
export const PERKS = Object.freeze([
  { id: 'pk_hypecap', name: 'Hype Ceiling', icon: '📈', maxRank: 5, desc: '+10 max Hype per rank.', costs: [1, 1, 2, 2, 3] },
  { id: 'pk_hypedecay', name: 'Slow Burn', icon: '🐢', maxRank: 5, desc: 'Hype decays 10% slower per rank.', costs: [1, 1, 2, 2, 3] },
  { id: 'pk_click', name: 'Forklift Fingers', icon: '🖐️', maxRank: 5, desc: 'Pack Order value +25% per rank.', costs: [1, 1, 2, 2, 3] },
  { id: 'pk_energy', name: 'Creative Juices', icon: '🧃', maxRank: 5, desc: 'Creative Energy refills 8% faster per rank.', costs: [1, 1, 2, 2, 3] },
  { id: 'pk_offline', name: 'Dream Shift', icon: '🌙', maxRank: 5, desc: 'Offline earnings rate +5% per rank.', costs: [1, 1, 2, 2, 3] },
  { id: 'pk_moments', name: 'Trend Antenna', icon: '📡', maxRank: 5, desc: 'Viral Moments linger +3s per rank.', costs: [1, 1, 2, 2, 3] },
]);

export const PERKS_BY_ID = Object.freeze(
  Object.fromEntries(PERKS.map((p) => [p.id, p]))
);

// Feature unlocks by Hustler Level (account-permanent). Post Ad is granted
// by Chase's followers_intro beat, not a level, since v5.
export const LEVEL_UNLOCKS = Object.freeze({
  3: { id: 'stats', label: 'Stats panel', desc: 'Numbers about your numbers.' },
  8: { id: 'autopacker', label: 'VA: Auto-Packer', desc: 'Packs 2 orders/sec for you.' },
  10: { id: 'exit', label: 'The Exit', desc: 'Blandrock Capital is watching.' },
  12: { id: 'intern', label: 'VA: Social Media Intern', desc: 'Auto-posts an ad every 5s.' },
  14: { id: 'rack2', label: 'Campaign Rack slot 2', desc: 'Run two campaigns at once.' },
  15: { id: 'campaignmgr', label: 'VA: Campaign Manager', desc: 'Auto-launches ads at 60% power when idle.' },
  20: { id: 'rack3', label: 'Campaign Rack slot 3', desc: 'Three at once. The content mines never close.' },
  22: { id: 'trendwatcher', label: 'VA: Trend Watcher', desc: 'Auto-catches Viral Moments at 50% value.' },
  26: { id: 'rack4', label: 'Campaign Rack slot 4', desc: 'Full rack. Peak content-industrial complex.' },
});
