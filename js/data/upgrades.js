// Run-scoped cash upgrades. Three per product tier (150× / 4,000× / 80,000× the
// product's base cost, each ×2 that product's income) plus globals and
// systems upgrades. All reset on Exit. Effects are declarative — resolved in
// core/balance.js.

import { PRODUCTS } from './products.js';

// Guru-speak name banks for the per-tier ladder, indexed by rung (0/1/2).
const TIER_UPGRADE_NAMES = [
  ['Winning Product Research', 'Stolen Product Photos (HD)', 'Testimonials From My Cousin'],
  ['UGC Content Farm', 'Suspiciously Good Reviews', '“Viral on ClikClok” Sticker'],
  ['Influencer Seeding Kit', 'Bundle Upsell Funnel', 'Rebrand as “Artisanal”'],
];

function tierUpgrades() {
  const out = [];
  const costMults = [150, 4000, 80000];
  const ownedReq = [10, 50, 150];
  for (const p of PRODUCTS) {
    for (let rung = 0; rung < 3; rung++) {
      out.push({
        id: `t_${p.id}_${rung}`,
        name: `${TIER_UPGRADE_NAMES[rung % 3][(p.tier + rung) % 3]}: ${p.name}`,
        desc: `×2 ${p.name} income.`,
        cost: p.baseCost * costMults[rung],
        category: 'products',
        requires: { product: [p.id, ownedReq[rung]] },
        effects: [{ type: 'productMult', target: p.id, value: 2 }],
      });
    }
  }
  return out;
}

const GLOBALS = [
  {
    id: 'g_bubblewrap',
    name: 'Bulk Bubble Wrap',
    desc: 'Pack Order clicks ×2. Also functions as your only stress management.',
    cost: 2500, category: 'grindset',
    effects: [{ type: 'clickMult', value: 2 }],
  },
  {
    id: 'g_urgent',
    name: '“URGENT: Only 3 Left!” Banner',
    desc: 'All income ×1.5. There are 40,000 left.',
    cost: 25000, category: 'store',
    effects: [{ type: 'globalMult', value: 1.5 }],
  },
  {
    id: 'g_countdown',
    name: 'Countdown Timer That Resets on Refresh',
    desc: 'All income ×2. Only 00:04:59 left! Forever!',
    cost: 3e6, category: 'store',
    effects: [{ type: 'globalMult', value: 2 }],
  },
  {
    id: 'g_trustbadge',
    name: 'Trust Badge You Made in a Paint App',
    desc: 'All income ×1.5. 100% Secure (font implies it).',
    cost: 200000, category: 'store',
    effects: [{ type: 'globalMult', value: 1.5 }],
  },
  {
    id: 'g_photos',
    name: 'Premium Domain Upgrade (.shop → .store)',
    desc: 'All income ×2. Legitimacy intensifies.',
    cost: 80e6, category: 'store',
    effects: [{ type: 'globalMult', value: 2 }],
  },
  {
    id: 'g_jessica',
    name: 'Testimonial Carousel (All Named Jessica)',
    desc: 'All income ×2. Jessica J. verified. Jessica K. also verified.',
    cost: 400e6, category: 'store',
    effects: [{ type: 'globalMult', value: 2 }],
  },
  {
    id: 'g_dropservice',
    name: 'Drop-Servicing the Dropshipping',
    desc: 'All income ×3. It’s layers all the way down.',
    cost: 2e9, category: 'store',
    effects: [{ type: 'globalMult', value: 3 }],
  },
  {
    id: 'g_seentv',
    name: '“As Seen On TV (a TV)”',
    desc: 'All income ×3. The TV is in your garage.',
    cost: 500e9, category: 'store',
    effects: [{ type: 'globalMult', value: 3 }],
  },
  {
    id: 'g_darkmode',
    name: 'Dark Mode Storefront',
    desc: 'All income ×1.5, +100% vibes. Investors love dark mode.',
    cost: 40e12, category: 'store',
    effects: [{ type: 'globalMult', value: 1.5 }],
  },
];

const SYSTEMS = [
  {
    id: 's_ringlight',
    name: 'Ring Light of Destiny',
    desc: '+2% VIRAL odds on every launch. You can see your future in it.',
    cost: 25000, category: 'ads',
    effects: [{ type: 'viralChanceAdd', value: 2 }],
  },
  {
    id: 's_espresso',
    name: 'Espresso IV Drip',
    desc: 'Creative Energy refills 40% faster. You can hear colors now.',
    cost: 100000, category: 'ads',
    effects: [{ type: 'energyRegenMult', value: 1 / 1.4 }],
  },
  {
    id: 's_pips1',
    name: 'Second Camera (Phone, Older)',
    desc: '+1 max Creative Energy. It films vertical only.',
    cost: 250000, category: 'ads',
    effects: [{ type: 'energyMaxAdd', value: 1 }],
  },
  {
    id: 's_pips2',
    name: 'Content Calendar (Laminated)',
    desc: '+1 max Creative Energy. Tuesday is “unboxing energy” day.',
    cost: 40e6, category: 'ads',
    effects: [{ type: 'energyMaxAdd', value: 1 }],
  },
  {
    id: 's_pips3',
    name: 'Hire a “Videographer” (Nephew)',
    desc: '+1 max Creative Energy. He’s “in film school.”',
    cost: 5e9, category: 'ads',
    effects: [{ type: 'energyMaxAdd', value: 1 }],
  },
  {
    id: 's_lock1',
    name: 'Reel Lock: Caption Generator 3000',
    desc: 'Lock 1 reel before spinning. Never write “wait for it” by hand again.',
    cost: 100000, category: 'ads', requires: { level: 4 },
    effects: [{ type: 'reelLockAdd', value: 1 }],
  },
  {
    id: 's_lock2',
    name: 'Reel Lock: Golden Hook Rolodex',
    desc: 'Lock 2 reels before spinning. Every hook, pre-furious doctors included.',
    cost: 25e6, category: 'ads', requires: { level: 12 },
    effects: [{ type: 'reelLockAdd', value: 1 }],
  },
  {
    id: 's_lock3',
    name: 'Reel Lock: The Algorithm Whisperer',
    desc: 'Lock all 3 reels. At this point you’re just making the ad on purpose.',
    cost: 10e9, category: 'ads', requires: { level: 19 },
    effects: [{ type: 'reelLockAdd', value: 1 }],
  },
  {
    id: 's_risegrind',
    name: 'Rise & Grind Alarm Clock',
    desc: 'Pack Order clicks ×2. It plays airhorn sounds at 4:59 AM.',
    cost: 75000, category: 'grindset',
    effects: [{ type: 'clickMult', value: 2 }],
  },
  {
    id: 's_coldshower',
    name: 'Cold Shower Protocol',
    desc: 'Pack Order clicks ×3. You screamed, but productively.',
    cost: 30e6, category: 'grindset',
    effects: [{ type: 'clickMult', value: 3 }],
  },
  {
    id: 's_followerfarm',
    name: 'Buy 10,000 Followers (Real Humans, Probably)',
    desc: 'All follower gains ×1.5. Suspiciously, all from the same town.',
    cost: 2e6, category: 'ads',
    effects: [{ type: 'followerGainMult', value: 1.5 }],
  },
  {
    id: 's_microinfluencers',
    name: 'Micro-Influencer Farm',
    desc: 'All follower gains ×2. 400 creators, 11 followers each. Math is math.',
    cost: 900e6, category: 'ads',
    effects: [{ type: 'followerGainMult', value: 2 }],
  },
  {
    id: 's_visionboard',
    name: 'Vision Board 2.0',
    desc: 'All income ×2. Now with lamination.',
    cost: 120e9, category: 'grindset',
    effects: [{ type: 'globalMult', value: 2 }],
  },
];

export const UPGRADES = Object.freeze([...tierUpgrades(), ...GLOBALS, ...SYSTEMS]);

export const UPGRADES_BY_ID = Object.freeze(
  Object.fromEntries(UPGRADES.map((u) => [u.id, u]))
);
