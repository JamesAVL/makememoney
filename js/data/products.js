// The 12-slot product ladder. Economy spine: base cost ×15/tier, base income
// ×5.5/tier → first-unit payback roughly ×2.7 each tier, so new tiers are a
// climb, not an instant ×8. Gates alternate cash-seen / follower walls — the
// locked card displays its requirement, so the gate IS the tutorial.
// `tags` feed the Ad Studio reels, trend waves, and niches.

export const MILESTONES = [10, 30, 75, 150, 225, 300, 400, 500];

const COST_RATIO = 15;
const INCOME_RATIO = 5.5;
const BASE_COST = 4;
const BASE_INCOME = 0.3;

const cost = (tier) => BASE_COST * Math.pow(COST_RATIO, tier - 1);
const income = (tier) => BASE_INCOME * Math.pow(INCOME_RATIO, tier - 1);

const DEFS = [
  {
    id: 'banana', name: 'Banana Slicer Pro Max', icon: '🍌', growth: 1.13,
    desc: 'Slices bananas 37% more confidently than your hands ever could.',
    tags: ['kitchen', 'satisfying'], unlock: {}, milestoneName: 'Now With Pro-er Max',
  },
  {
    id: 'galaxy', name: 'LED Galaxy Projector', icon: '🌌', growth: 1.14,
    desc: 'Turns any studio apartment into basically the observation deck of a starship.',
    tags: ['cozy', 'aesthetic'], unlock: { cashSeen: 400 }, milestoneName: 'Now With 30% More Galaxy',
  },
  {
    id: 'doghoodie', name: 'Posture-Correcting Dog Hoodie', icon: '🐕', growth: 1.15,
    desc: "Your dog's posture was fine. Now it's ELITE.",
    tags: ['pets', 'wellness'], unlock: { followers: 100 }, milestoneName: 'Certified Good Boy Cut',
  },
  {
    id: 'judgybottle', name: 'Smart Water Bottle That Judges You', icon: '🍼', growth: 1.15,
    desc: "Glows red with quiet disappointment when you don't hydrate.",
    tags: ['hydration', 'gadget'], unlock: { cashSeen: 30000 }, milestoneName: 'Now Passive-Aggressive',
  },
  {
    id: 'shroomcoffee', name: 'Mushroom Coffee (Mostly Mushrooms)', icon: '🍄', growth: 1.15,
    desc: 'Contains coffee the way the ocean contains gold.',
    tags: ['grind', 'wellness'], unlock: { followers: 1000 }, milestoneName: 'Single-Origin Mycelium',
  },
  {
    id: 'napbelt', name: 'SixPack NapBelt™', icon: '😴', growth: 1.14,
    desc: 'Abs while unconscious. The dream, literally.',
    tags: ['fitness', 'sleep'], unlock: { cashSeen: 4e6 }, milestoneName: 'Now With EightPack Mode',
  },
  {
    id: 'bracelets', name: 'Quantum-Entangled Friendship Bracelets', icon: '🔗', growth: 1.13,
    desc: 'When one breaks, the other feels it. (Neither feels it.)',
    tags: ['quantum', 'aesthetic'], unlock: { followers: 3e6 }, milestoneName: 'Spooky Action Bundle',
  },
  {
    id: 'hydrategpt', name: 'HydrateGPT Smart Bottle', icon: '🤖', growth: 1.13,
    desc: 'Your water, but with AI. It has opinions now.',
    tags: ['gadget', 'hydration'], unlock: { cashSeen: 9e8 }, milestoneName: 'Now Writes Your Emails',
  },
  {
    id: 'gymair', name: 'Jar of Gym Air', icon: '🫙', growth: 1.12,
    desc: 'Bottled at peak deadlift. Notes of chalk, ambition, and rubber flooring.',
    tags: ['fitness', 'grind'], unlock: { followers: 3e7 }, milestoneName: 'Vintage 2019 Reserve',
  },
  {
    id: 'jetcandle', name: 'Private-Jet-Scented Candle', icon: '🕯️', growth: 1.12,
    desc: 'Notes of leather, jet fuel, and unexamined confidence.',
    tags: ['luxury', 'cozy'], unlock: { cashSeen: 2e11 }, milestoneName: 'Gulfstream Gourmand Edition',
  },
  {
    id: 'masterclass', name: '"Passive Income Masterclass"', icon: '🎓', growth: 1.11,
    desc: 'Stop selling products. Sell the dream of selling products.',
    tags: ['guru', 'grind'], unlock: { followers: 3e8 }, milestoneName: 'Module 7: Scaling Your Scale',
  },
  {
    id: 'gurucon', name: 'GuruCon World Summit Tickets', icon: '🎤', growth: 1.11,
    desc: 'Be in the room where it happens. The room is near an airport.',
    tags: ['guru', 'luxury'], unlock: { followers: 3e9, level: 25 }, milestoneName: 'VIP Lanyard Tier',
  },
];

export const PRODUCTS = Object.freeze(
  DEFS.map((d, i) => Object.freeze({
    ...d,
    tier: i + 1,
    baseCost: cost(i + 1),
    baseIncome: income(i + 1),
  }))
);

export const PRODUCTS_BY_ID = Object.freeze(
  Object.fromEntries(PRODUCTS.map((p) => [p.id, p]))
);
