// Achievements ("Flexes"). Each grants a permanent +1% global income —
// hunting them is mechanically real. Checks are declarative stat paths
// (evaluated at 1 Hz) or custom fns for the weird ones.

export const ACH_INCOME_BONUS = 0.01;

export const ACHIEVEMENTS = Object.freeze([
  // Selling
  { id: 'first_sale', name: 'First Sale', desc: 'Technically an entrepreneur now.', icon: '💵', check: { stat: 'acct.stats.itemsSold', gte: 1 } },
  { id: 'shipped_100', name: 'Shipped It', desc: '100 orders. The garage smells like tape.', icon: '📦', check: { stat: 'acct.stats.itemsSold', gte: 100 } },
  { id: 'shipped_10k', name: 'Certified Hustler', desc: '10,000 orders and zero returns processed.', icon: '🚚', check: { stat: 'acct.stats.itemsSold', gte: 10000 } },
  { id: 'shipped_1m', name: 'Logistics Menace', desc: 'One million orders. The mail carrier fears you.', icon: '🛳️', check: { stat: 'acct.stats.itemsSold', gte: 1e6 } },
  // Cash
  { id: 'cash_1k', name: "It's Giving Revenue", desc: '$1,000 lifetime.', icon: '🤑', check: { stat: 'acct.lifetimeAllTime', gte: 1e3 } },
  { id: 'cash_100k', name: 'Six Figures (Annualized) (Projected) (Hopeful)', desc: '$100K lifetime.', icon: '📈', check: { stat: 'acct.lifetimeAllTime', gte: 1e5 } },
  { id: 'cash_1m', name: 'Actual Six Figures, Eventually Seven', desc: '$1M lifetime.', icon: '💰', check: { stat: 'acct.lifetimeAllTime', gte: 1e6 } },
  { id: 'cash_1b', name: 'Unicorn-Adjacent', desc: '$1B lifetime. The B is silent, like your conscience.', icon: '🦄', check: { stat: 'acct.lifetimeAllTime', gte: 1e9 } },
  { id: 'cash_1t', name: 'GDP of a Small Moon', desc: '$1T lifetime.', icon: '🌖', check: { stat: 'acct.lifetimeAllTime', gte: 1e12 } },
  { id: 'cash_1e15', name: 'Post-Economic', desc: 'Money is a memory. Numbers are forever.', icon: '🌌', check: { stat: 'acct.lifetimeAllTime', gte: 1e15 } },
  // Clicking
  { id: 'clicks_100', name: 'Manual Labor', desc: '100 orders packed by hand. Artisanal.', icon: '🖱️', check: { stat: 'acct.stats.totalClicks', gte: 100 } },
  { id: 'clicks_2500', name: 'Carpal Diem', desc: '2,500 clicks. Seize the wrist brace.', icon: '🤲', check: { stat: 'acct.stats.totalClicks', gte: 2500 } },
  { id: 'crit_50', name: 'BULK ORDER!!', desc: '50 critical packs. The forklift respects you.', icon: '💥', check: { stat: 'acct.stats.crits', gte: 50 } },
  // Ads
  { id: 'first_viral', name: 'The Algorithm Smiles Upon You', desc: 'First VIRAL ad.', icon: '🚀', check: { stat: 'acct.stats.viralHits', gte: 1 } },
  { id: 'viral_25', name: 'Serial Viralist', desc: '25 VIRAL ads. You can stop now. You won’t.', icon: '🔁', check: { stat: 'acct.stats.viralHits', gte: 25 } },
  { id: 'mega_1', name: 'MEGA-VIRAL', desc: 'The 1%. The server room is on fire.', icon: '🌋', check: { stat: 'acct.stats.megaVirals', gte: 1 } },
  { id: 'spins_100', name: 'Content Machine', desc: '100 ads launched. Each one “your best work.”', icon: '🎬', check: { stat: 'acct.stats.totalLaunches', gte: 100 } },
  { id: 'flops_20', name: 'Fail Fast, Ship Faster', desc: '20 FLOPs. Every one a learning.', icon: '💀', check: { stat: 'acct.stats.flops', gte: 20 } },
  { id: 'pity_viral', name: 'The Algorithm Owed You One', desc: 'Go VIRAL with a pity meter over 20%.', icon: '🧠', check: { stat: 'acct.stats.pityVirals', gte: 1 } },
  { id: 'chaos_jackpot', name: 'How Did That Work', desc: 'A total mismatch went MEGA-VIRAL, because that is how the internet works.', icon: '🎲', check: { stat: 'acct.stats.chaosJackpots', gte: 1 } },
  { id: 'boost_10', name: 'Pay To Slay', desc: 'Boost 10 launches with Hype.', icon: '⚡', check: { stat: 'acct.stats.boostedLaunches', gte: 10 } },
  // Followers
  { id: 'f_1k', name: 'Micro-Influencer', desc: '1,000 followers. Your nana is three of them.', icon: '👁️', check: { stat: 'acct.stats.maxFollowers', gte: 1e3 } },
  { id: 'f_100k', name: 'Verified-Adjacent', desc: '100K followers.', icon: '☑️', check: { stat: 'acct.stats.maxFollowers', gte: 1e5 } },
  { id: 'f_1m', name: 'Main Character', desc: '1M followers. It’s giving reach.', icon: '👑', check: { stat: 'acct.stats.maxFollowers', gte: 1e6 } },
  // Active layer
  { id: 'wave_1', name: 'Trend Surfer', desc: 'Ride your first Trend Wave.', icon: '🌊', check: { stat: 'acct.stats.wavesRidden', gte: 1 } },
  { id: 'wave_20', name: 'Professional Wave Guy', desc: 'Ride 20 Trend Waves.', icon: '🏄', check: { stat: 'acct.stats.wavesRidden', gte: 20 } },
  { id: 'moment_10', name: 'Golden Hour', desc: 'Catch 10 Viral Moments.', icon: '✨', check: { stat: 'acct.stats.momentsClicked', gte: 10 } },
  { id: 'whale', name: 'A Whale Appears', desc: 'Someone bought twelve minutes of your income at once. No questions.', icon: '🐋', check: { stat: 'acct.stats.whaleOrders', gte: 1 } },
  { id: 'sigma', name: 'SIGMA GRINDSET', desc: 'Hit 95 Hype. Touch grass (optional).', icon: '🐺', check: { stat: 'acct.stats.maxHype', gte: 95 } },
  // Products
  { id: 'own_100_one', name: 'Garage Empire', desc: 'Own 100 units of one product.', icon: '🏠', check: { stat: 'acct.stats.maxOneProduct', gte: 100 } },
  { id: 'banana_500', name: 'The Banana Baron', desc: '500 Banana Slicers. A dynasty of confidence.', icon: '🍌', checkFn: (s) => (s.run.products.banana || 0) >= 500 },
  { id: 'tier7', name: 'Quantum Leap', desc: 'Unlock the Quantum-Entangled Friendship Bracelets.', icon: '⚛️', check: { stat: 'acct.stats.maxTierUnlocked', gte: 7 } },
  { id: 'tier12', name: 'The Room Where It Happens', desc: 'Unlock GuruCon tickets. The room is carpeted.', icon: '🎤', check: { stat: 'acct.stats.maxTierUnlocked', gte: 12 } },
  { id: 'all_10', name: 'Diversified Portfolio', desc: 'Own 10 of everything unlocked (min 6 products).', icon: '🗂️', checkFn: (s) => { let n = 0; for (const k in s.run.products) if (s.run.products[k] >= 10) n++; return n >= 6; } },
  // Levels & prestige
  { id: 'lv10', name: 'Double Digits', desc: 'Hustler Level 10. The grind acknowledges you.', icon: '🔟', check: { stat: 'acct.level', gte: 10 } },
  { id: 'lv25', name: 'Thought Leader', desc: 'Hustler Level 25. You have opinions about standing desks.', icon: '🧑‍🏫', check: { stat: 'acct.level', gte: 25 } },
  { id: 'exit_1', name: 'Exit Stage Rich', desc: 'Sell your first company.', icon: '🚪', check: { stat: 'acct.exits', gte: 1 } },
  { id: 'exit_5', name: 'Serial Entrepreneur', desc: 'Five exits. Your LinkedIn bio is a novella.', icon: '📚', check: { stat: 'acct.exits', gte: 5 } },
  { id: 'exit_10', name: 'The Ouroboros Orders a Course', desc: 'Ten exits.', icon: '🐍', check: { stat: 'acct.exits', gte: 10 } },
  { id: 'guru_full', name: 'Enlightenment (Sponsored)', desc: 'Own every Guru Grindset node.', icon: '🧘', checkFn: (s) => Object.keys(s.acct.guru).length >= 9 },
  // Meta / secret-ish
  { id: 'offline_8h', name: 'While You Were Sleeping', desc: 'Collect 8 hours of offline earnings.', icon: '😴', check: { stat: 'acct.stats.offlineCollects8h', gte: 1 } },
  { id: 'checked_updates', name: 'Checked for Updates', desc: 'Clicked the HustleOS logo 10 times. It did nothing. Again.', icon: '🔄', check: { stat: 'acct.stats.logoClicks', gte: 10 }, secret: true },
  { id: 'creative_accounting', name: 'Creative Accounting', desc: 'The ledger noticed something. The ledger fixed it.', icon: '🧾', check: { stat: 'acct.stats.creativeAccounting', gte: 1 }, secret: true },
]);

export const ACHIEVEMENTS_BY_ID = Object.freeze(
  Object.fromEntries(ACHIEVEMENTS.map((a) => [a.id, a]))
);
