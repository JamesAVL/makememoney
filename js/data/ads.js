// Ad Studio content: hooks (reel 1), trend tags (reel 3), platforms, and the
// outcome table. Reel 2 is the player's owned products. Formats live inside
// hook text as prefixes (per design: three reels max).

export const TREND_TAGS = Object.freeze([
  { id: 'satisfying', label: '#OddlySatisfying' },
  { id: 'kitchen', label: '#CleanTok' },
  { id: 'aesthetic', label: '#ThatGirl' },
  { id: 'pets', label: '#PetParents' },
  { id: 'sleep', label: '#SleepMaxxing' },
  { id: 'grind', label: '#GrindSzn' },
  { id: 'hydration', label: '#WaterTok' },
  { id: 'luxury', label: '#QuietLuxury' },
  { id: 'guru', label: '#CEOMindset' },
  { id: 'fitness', label: '#GymTok' },
  { id: 'cozy', label: '#CottageCore' },
  { id: 'wellness', label: '#WellnessCheck' },
  { id: 'quantum', label: '#QuantumCore' },
  { id: 'gadget', label: '#GadgetGang' },
]);

export const TAGS_BY_ID = Object.freeze(
  Object.fromEntries(TREND_TAGS.map((t) => [t.id, t]))
);

// Hook rarity: each tier above common adds +2% VIRAL to the odds bar.
export const RARITY = Object.freeze({
  common: { rank: 0, label: 'Common' },
  uncommon: { rank: 1, label: 'Uncommon' },
  rare: { rank: 2, label: 'Rare' },
  epic: { rank: 3, label: 'Epic' },
  legendary: { rank: 4, label: 'Legendary' },
});

// {p} is replaced with the product name at render time.
export const HOOKS = Object.freeze([
  { id: 'wrong_life', text: "You've been using {p} wrong your ENTIRE life", rarity: 'common', tags: ['gadget', 'kitchen'], unlock: {} },
  { id: 'stop_scrolling', text: 'Stop scrolling. This is a sign.', rarity: 'common', tags: ['aesthetic', 'wellness'], unlock: {} },
  { id: 'pov_fix', text: 'POV: you fix your entire life for $19.99', rarity: 'common', tags: ['grind', 'wellness'], unlock: {} },
  { id: 'today_years', text: 'I was today years old when I found out about {p}', rarity: 'common', tags: ['gadget', 'satisfying'], unlock: {} },
  { id: 'nobody_talking', text: 'Why is NOBODY talking about {p}??', rarity: 'common', tags: ['quantum', 'cozy'], unlock: {} },
  { id: 'apartment_sense', text: 'Things in my apartment that just make sense', rarity: 'common', tags: ['cozy', 'aesthetic'], unlock: {} },
  { id: 'unboxing_asmr', text: 'Unboxing ASMR: watch till the end 🔊', rarity: 'uncommon', tags: ['satisfying', 'sleep'], unlock: { level: 5 } },
  { id: 'doctors_furious', text: 'Doctors are FURIOUS about this', rarity: 'uncommon', tags: ['wellness', 'fitness'], unlock: { level: 7 } },
  { id: 'nana_day3', text: "My nana didn't believe me until day 3", rarity: 'uncommon', tags: ['kitchen', 'pets'], unlock: { level: 9 } },
  { id: 'sold_out', text: 'This sold out 4 times (we restocked, obviously)', rarity: 'uncommon', tags: ['luxury', 'hydration'], unlock: { level: 11 } },
  { id: 'run_dont_walk', text: 'Run, don’t walk. RUN.', rarity: 'rare', tags: ['fitness', 'grind'], unlock: { level: 14 } },
  { id: 'big_industry', text: 'The Big Blanket industry doesn’t want you to know this', rarity: 'rare', tags: ['sleep', 'quantum'], unlock: { level: 17 } },
  { id: 'villain_origin', text: 'This is your villain origin story for bad posture', rarity: 'rare', tags: ['pets', 'guru'], unlock: { level: 20 } },
  { id: 'day_in_life', text: 'Day in my life as a founder (5AM, real)', rarity: 'epic', tags: ['grind', 'guru'], unlock: { level: 24 } },
  { id: 'tested_30', text: 'I tested it for 30 days so you don’t have to', rarity: 'epic', tags: ['gadget', 'wellness'], unlock: { level: 28 } },
  { id: 'main_character', text: "It's giving main character", rarity: 'legendary', tags: ['aesthetic', 'luxury'], unlock: { exits: 1 } },
  { id: 'quit_job', text: 'I quit my 9–5 and you won’t BELIEVE what happened', rarity: 'legendary', tags: ['guru', 'grind'], unlock: { exits: 3 } },
]);

export const HOOKS_BY_ID = Object.freeze(
  Object.fromEntries(HOOKS.map((h) => [h.id, h]))
);

// The base outcome wheel. Percentages; modifiers shift mass between bands and
// are rendered live on the odds bar. MEGA overflow beyond the ×40 temp cap is
// paid as a lump sum (jackpots can't compound — caps stay honest).
export const OUTCOMES = Object.freeze([
  { id: 'flop', label: 'FLOP', emoji: '💀', base: 25, mult: 0.2 },
  { id: 'mid', label: 'MID', emoji: '😐', base: 40, mult: 1 },
  { id: 'hit', label: 'HIT', emoji: '🔥', base: 25, mult: 3 },
  { id: 'viral', label: 'VIRAL', emoji: '🚀', base: 9, mult: 10 },
  { id: 'mega', label: 'MEGA-VIRAL', emoji: '🌋', base: 1, mult: 25 },
]);

export const PLATFORMS = Object.freeze([
  {
    id: 'clikclok',
    name: 'ClikClok',
    icon: '🎵',
    blurb: 'Chaotic short-video lottery. Fast money, faster decay.',
    kind: 'burst',            // rate multiplier for a short duration
    durationMs: 90000,
    unlock: {},
  },
  {
    id: 'instaglam',
    name: 'Instaglam',
    icon: '📸',
    blurb: 'The aesthetic tax bracket. Pays followers, not cash.',
    kind: 'followers',        // instant follower payout: 120×√F × outcome factor
    durationMs: 0,
    unlock: { cashSeen: 1000 },
  },
  {
    id: 'facespace',
    name: 'FaceSpace',
    icon: '👴',
    blurb: 'The boomer money printer. One slot. It never stops sharing.',
    kind: 'slot',             // one persistent slot; new launch replaces old
    durationMs: 0,
    unlock: { cashSeen: 25000 },
  },
]);

export const PLATFORMS_BY_ID = Object.freeze(
  Object.fromEntries(PLATFORMS.map((p) => [p.id, p]))
);

// FaceSpace persistent-slot multiplier by outcome id.
export const FACESPACE_MULT = Object.freeze({
  flop: 1.1, mid: 1.25, hit: 1.5, viral: 2, mega: 2.5,
});
