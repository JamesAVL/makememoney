// "Pick Your Niche" — offered as 3 random cards on every rebrand (post-Exit).
// A niche gives +75% income to products carrying its tag, doubles its tag's
// weight in trend waves and hook draws, and applies −25% to one anti-tag.
// This is what makes prestige runs play differently, not just faster.

export const NICHE_INCOME_BONUS = 0.75;
export const NICHE_ANTI_PENALTY = 0.25;

export const NICHES = Object.freeze([
  { id: 'pet_empire', name: 'Pet Empire', icon: '🐾', tag: 'pets', antiTag: 'luxury', blurb: 'Every dog is a customer. Every owner is a wallet.' },
  { id: 'wellness_grift', name: 'The Wellness Grift', icon: '🧘', tag: 'wellness', antiTag: 'gadget', blurb: 'Science-adjacent. Legally distinct from medicine.' },
  { id: 'kitchen_cult', name: 'Kitchen Gadget Cult', icon: '🔪', tag: 'kitchen', antiTag: 'fitness', blurb: 'Nobody needs this. Everybody buys it.' },
  { id: 'sleep_complex', name: 'Sleep Industrial Complex', icon: '🛏️', tag: 'sleep', antiTag: 'grind', blurb: 'Monetize the one thing they do 8 hours a day.' },
  { id: 'sigma_lifestyle', name: 'Sigma Lifestyle', icon: '🐺', tag: 'grind', antiTag: 'cozy', blurb: 'Rise. Grind. Repeat. (Repeat.) (Repeat.)' },
  { id: 'hydration_nation', name: 'Hydration Nation', icon: '💧', tag: 'hydration', antiTag: 'sleep', blurb: 'Water: now a personality.' },
  { id: 'quantum_dept', name: 'Department of Quantum', icon: '⚛️', tag: 'quantum', antiTag: 'kitchen', blurb: 'Results may vary across parallel universes.' },
  { id: 'old_money', name: 'Old Money Aesthetic', icon: '🎩', tag: 'luxury', antiTag: 'satisfying', blurb: 'The price IS the feature.' },
  { id: 'gadget_syndicate', name: 'Gadget Syndicate', icon: '🔌', tag: 'gadget', antiTag: 'wellness', blurb: 'It beeps. It charges. It ships.' },
  { id: 'cozy_hustle', name: 'Cozy Hustle', icon: '🕯️', tag: 'cozy', antiTag: 'quantum', blurb: 'Soft lighting, hard margins.' },
  { id: 'gym_rats', name: 'Gains Cartel', icon: '💪', tag: 'fitness', antiTag: 'pets', blurb: 'Sell the pump. Ship the protein-adjacent.' },
  { id: 'that_girl', name: 'That Girl Industrial Estate', icon: '✨', tag: 'aesthetic', antiTag: 'guru', blurb: '5AM. Matcha. Journaling. Invoicing.' },
]);

export const NICHES_BY_ID = Object.freeze(
  Object.fromEntries(NICHES.map((n) => [n.id, n]))
);
