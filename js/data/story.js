// The narrative layer: Chase Margin's mentorship DMs. Beats are data — pure
// trigger predicates over state (same pattern as ACHIEVEMENTS.checkFn),
// evaluated core-side by js/core/story.js so headless bots live the same
// timeline as humans. Grants (tab unlocks, scheduler arming) apply on ACK,
// never on delivery. Every gating trigger must be reachable by a player who
// never clicks or posts (the OR-cash fallbacks) — the idle bot enforces this.
//
// Voice bible (keep for future beats): Chase opens mid-thought, one-line
// paragraphs, no greetings after Lesson 1. Fake-precision stats. He never
// lies about the mechanics — he lies about what they MEAN. Lesson numbering
// decays late. Address decays: "future millionaire" → "champ" → "kid" →
// nothing. Emoji budget: Act 1 only. Blandrock only sends letterhead.

import { exitPreview } from '../core/balance.js';

export const CHARACTERS = Object.freeze({
  chase: { id: 'chase', name: 'Chase Margin', handle: '@TheChaseMargin ✔', avatar: 'guru' },
  blandrock: { id: 'blandrock', name: 'Blandrock Capital', handle: 'Strategic Synergies Division', avatar: 'blandrock' },
});

export const MIN_GAP_MS = 20000; // sim-ms between deliveries

const ach = (s) => Object.keys(s.acct.achievements).length;

export const STORY_BEATS = Object.freeze([

  // --- Act 0: the purchase ---------------------------------------------------

  {
    id: 'opening', from: 'chase', icon: '🕶️', title: 'Welcome to the Blueprint',
    trigger: () => true, autoOpen: true, gate: true,
    bubbles: [
      { kind: 'receipt', text: 'PURCHASE CONFIRMED — ZERO-TO-EXIT FREEDOM BLUEPRINT™ · $1,997.00 · payment 1 of 3 processed. Refunds: see Lesson 9. There is no Lesson 9.' },
      "You made it. 97.3% of people watch the free video and go back to their jobs. You're the 2.7%. I can tell from your billing information. 🔥",
      'Everything you need is already on this dashboard. Lesson 1: the button packs the box. Press the button until pressing it means something.',
    ],
    replies: [{ label: 'Who is this?', response: 'Your mentor. Check the receipt.' }],
    ackLabel: 'START LESSON 1',
  },

  // --- Act 1: the course -----------------------------------------------------

  {
    id: 'lesson_click', from: 'chase', icon: '📦', title: 'Fulfillment',
    trigger: (s) => s.ftue.clicks >= 8, after: 'opening',
    bubbles: [
      "Feel that? Fulfillment. Literally — those are orders, and you're fulfilling them.",
      'Every empire starts with one person alone in a garage, taping boxes and calling it a company. Keep taping, future millionaire.',
    ],
    ackLabel: 'keep taping',
  },
  {
    id: 'products_intro', from: 'chase', icon: '🍌', title: 'Lesson 2: Inventory Is a Feeling',
    trigger: (s) => s.run.lifetimeCash >= 100, after: 'lesson_click',
    gate: true, unlocks: 'products', celebrate: 'small',
    teaser: 'Lesson 2 unlocks at $100 seen', progress: (s) => [s.run.lifetimeCash, 100],
    bubbles: [
      "Lesson 2: you will never see, touch, or store a product. A warehouse in a country you won't visit ships it to a man named Tanner. You keep the spread.",
      'I found you a winner. It slices bananas. Hands slice bananas fine — doesn\'t matter. CONFIDENCE slices bananas. $4 a unit, retails $19.99. 🚀',
    ],
    replies: [{ label: 'Is this legal?', response: "It's pre-legal. Different thing." }],
    ackLabel: 'STOCK THE STORE',
  },
  {
    id: 'lesson_milestone', from: 'chase', icon: '📈', title: 'Scale',
    trigger: (s) => (s.run.products.banana || 0) >= 10, after: 'products_intro',
    bubbles: [
      'Ten of one item makes it a product line. Margins double at 10 owned. Then 30. Then 75. Why? Scale. Do not google why.',
    ],
    ackLabel: 'noted',
  },
  {
    id: 'milestone_1k', from: 'chase', icon: '📸', title: 'FOUR FIGURES',
    trigger: (s) => s.acct.lifetimeAllTime >= 1000, after: 'products_intro',
    bubbles: [
      'FOUR FIGURES. Screenshot the dashboard. Crop the date.',
      'That screenshot will outearn the thousand. Screenshots are how this industry reproduces.',
    ],
    ackLabel: '📸',
  },
  {
    id: 'adstudio_intro', from: 'chase', icon: '🎬', title: 'Lesson 3: Manufactured Virality',
    trigger: (s) => s.run.lifetimeCash >= 100000, after: 'products_intro',
    gate: true, unlocks: 'adstudio', celebrate: 'big',
    teaser: 'Lesson 3 unlocks at $100K seen', progress: (s) => [s.run.lifetimeCash, 100000],
    bubbles: [
      'Lesson 3: organic reach is a bedtime story clicks tell their children.',
      'Real operators manufacture virality. A HOOK. A PRODUCT. A TREND. Spin until something sticks to the culture.',
      "I'm unlocking my personal ClipForge™ rig. Three reels, one button. The algorithm does the judging — it's faster than shame.",
    ],
    ackLabel: 'OPEN AD STUDIO',
  },
  {
    id: 'lesson_energy', from: 'chase', icon: '⚡', title: 'Creative Energy',
    trigger: (s) => s.run.spins >= 1, after: 'adstudio_intro',
    bubbles: [
      'That spin spent Creative Energy. You get a few; they refill on a timer. Scarcity keeps you hungry. I learned that from apps. Everything is apps.',
    ],
    ackLabel: 'ok',
  },
  {
    id: 'lesson_first_launch', from: 'chase', icon: '🚀', title: "It's Live",
    trigger: (s) => s.acct.stats.totalLaunches >= 1, after: 'adstudio_intro',
    bubbles: [
      "It's live. Somewhere, a stranger just watched thirty seconds of your banana slicer instead of talking to their kids.",
      'Watch the revenue line. That spike is dopamine — theirs, converting into yours. Same molecule. Better exchange rate.',
    ],
    ackLabel: 'watch the line',
  },
  {
    id: 'first_viral', from: 'chase', icon: '🔥', title: 'THERE It Is',
    trigger: (s) => s.acct.stats.viralHits >= 1, after: 'adstudio_intro',
    bubbles: [
      "THERE it is. Frame the graph. Don't frame the product — the product has a warranty situation.",
      'Viral half-life is ninety seconds. Spend them launching the next one. Momentum is the only asset that dies overnight.',
    ],
    ackLabel: 'again',
  },

  // --- Act 2: the techniques ---------------------------------------------------

  {
    id: 'upgrades_intro', from: 'chase', icon: '🏪', title: 'Lesson 4: Conversion Tools',
    trigger: (s) => s.acct.stats.totalLaunches >= 2 || s.run.lifetimeCash >= 5e6, after: 'adstudio_intro',
    gate: true, unlocks: 'upgrades', celebrate: 'small',
    teaser: 'Lesson 4: get 2 ads out the door', progress: (s) => [s.acct.stats.totalLaunches, 2],
    bubbles: [
      "Lesson 4: your store looks honest. Honest doesn't convert.",
      "Countdown timers that reset. 'Only 3 left' — there are forty thousand. Testimonials by Jessica, verified by Jessica. The industry calls these Conversion Tools.",
      "The customer knows the timer is fake. They check out anyway. It's a dance, and the wallet leads.",
    ],
    replies: [{ label: 'This feels wrong', response: 'It converts 11% better *because* it feels wrong. Lesson 4 is feelings-to-revenue arbitrage.' }],
    ackLabel: 'INSTALL CONVERSION TOOLS',
  },
  {
    id: 'followers_intro', from: 'chase', icon: '📣', title: 'Lesson 5: Be the Need',
    trigger: (s) => s.acct.stats.totalLaunches >= 4 || s.run.lifetimeCash >= 1.5e7, after: 'upgrades_intro',
    gate: true, unlocks: 'postad', celebrate: 'small',
    teaser: 'Lesson 5: get 4 ads out the door', progress: (s) => [s.acct.stats.totalLaunches, 4],
    bubbles: [
      "Lesson 5: people don't buy from stores. They buy from a person who posts like rent is due. That person is you now.",
      "I've enabled POST AD on your dashboard. Every post turns a stranger into a follower. Followers are pre-customers. Everyone you've ever met is a pre-customer.",
    ],
    ackLabel: 'start posting',
  },
  {
    id: 'instaglam_intro', from: 'chase', icon: '📸', title: 'New Platform: Instaglam',
    trigger: (s) => s.run.followers >= 50 || s.run.lifetimeCash >= 5e7, after: 'followers_intro',
    gate: true, unlocks: 'instaglam', celebrate: 'small',
    teaser: 'A new platform opens at 50 followers', progress: (s) => [s.run.followers, 50],
    bubbles: [
      "New platform: Instaglam. It doesn't pay cash. It pays followers.",
      "Followers are money that hasn't confessed yet. Post pretty. Harvest later.",
    ],
    ackLabel: 'harvest later',
  },
  {
    id: 'milestone_1kf', from: 'chase', icon: '👁️', title: 'Community',
    trigger: (s) => s.acct.stats.maxFollowers >= 1000, after: 'instaglam_intro',
    bubbles: [
      "One thousand people opted into seeing your face every day. Some are bots. The bots' engagement is real, which tells you something about engagement.",
      "Gurus call this 'community'. On the balance sheet it's warm inventory.",
    ],
    ackLabel: 'warm inventory',
  },
  {
    id: 'hype_intro', from: 'chase', icon: '🔥', title: 'The Yellow Bar',
    trigger: (s) => s.run.followers >= 100 || s.run.lifetimeCash >= 1e8, after: 'instaglam_intro',
    gate: true, unlocks: 'hype', celebrate: 'small',
    teaser: 'Something ignites at 100 followers', progress: (s) => [s.run.followers, 100],
    bubbles: [
      'The yellow bar is Hype: you, performing enthusiasm at sustained volume. The algorithm pays extra for it, and it decays the second you rest. So.',
    ],
    ackLabel: 'no rest',
  },
  {
    id: 'lesson_review', from: 'chase', icon: '⭐', title: 'There Are No Bad Reviews',
    trigger: (s) => s.acct.stats.itemsSold >= 500, after: 'upgrades_intro',
    bubbles: [
      "A customer posted that her smart bottle glowed red at her daughter's recital. Quote: 'we don't speak of it.' Four hundred people read that post.",
      'Six of them bought bottles. There are no bad reviews. There is only reach.',
    ],
    ackLabel: 'only reach',
  },
  {
    id: 'trends_intro', from: 'chase', icon: '🌊', title: 'Lesson 6: The Weather',
    trigger: (s) => s.run.lifetimeCash >= 8e8, after: 'hype_intro',
    gate: true, unlocks: 'trends', arm: 'waves', celebrate: 'big',
    teaser: 'Lesson 6 unlocks at $800M seen', progress: (s) => [s.run.lifetimeCash, 8e8],
    bubbles: [
      'Lesson 6: the algorithm has weather. Tags surge, then die.',
      "You can't control the wave. You can be standing on it, holding a banana slicer, when it hits.",
      "I'm unlocking the Trends desk. When something surges, drop everything and match it. Loyalty is for products. You sell the weather.",
    ],
    ackLabel: 'OPEN TRENDS',
  },
  {
    id: 'moments_intro', from: 'chase', icon: '✨', title: 'When the Internet Looks at You',
    trigger: (s) => s.run.lifetimeCash >= 5e9, after: 'trends_intro',
    gate: true, arm: 'moments', celebrate: 'small',
    teaser: 'Chase is watching the feeds ($5B seen)', progress: (s) => [s.run.lifetimeCash, 5e9],
    bubbles: [
      'Heads up. At your size, the internet occasionally looks directly at you. A golden window. Seconds long.',
      "When it happens — and it will — you click it and you take everything it's holding. Don't think. Thinking is for the 97.3%.",
    ],
    ackLabel: 'eyes open',
  },
  {
    id: 'lesson_moment', from: 'chase', icon: '💰', title: 'Take Everything',
    trigger: (s) => s.acct.stats.momentsClicked >= 1, after: 'moments_intro',
    bubbles: [
      'You caught a Viral Moment. Rule: when the internet looks at you, take everything it\'s holding. It looks away in seconds and forgets you in fewer.',
    ],
    ackLabel: 'take everything',
  },
  {
    id: 'facespace_intro', from: 'chase', icon: '👴', title: 'New Platform: FaceSpace',
    trigger: (s) => s.run.lifetimeCash >= 2e10, after: 'moments_intro',
    gate: true, unlocks: 'facespace', celebrate: 'small',
    teaser: 'The boomer money printer warms up at $20B seen', progress: (s) => [s.run.lifetimeCash, 2e10],
    bubbles: [
      'FaceSpace unlocked. One ad slot. It runs forever, because nobody there scrolls past — they share, they comment "beautiful", they buy three.',
      'Nana Direct-Deposit lives on FaceSpace. She trusts you. Trust is the highest-yield asset in this entire game. Handle it like inventory.',
    ],
    ackLabel: '…noted',
  },
  {
    id: 'flexes_intro', from: 'chase', icon: '🏆', title: 'Fiscal Policy',
    trigger: (s) => ach(s) >= 3 || s.run.lifetimeCash >= 5e10, after: 'facespace_intro',
    gate: true, unlocks: 'flexes', celebrate: 'small',
    teaser: 'Chase noticed your trophies', progress: (s) => [ach(s), 3],
    bubbles: [
      "You've been earning trophies. Each one pays +1% income, forever. Flexing is fiscal policy.",
      'Display them where the metrics can see.',
    ],
    ackLabel: 'FLEX',
  },
  {
    id: 'levels_intro', from: 'chase', icon: '⬆️', title: 'Hustler Levels',
    trigger: (s) => s.acct.level >= 5 || s.run.lifetimeCash >= 1e11, after: 'flexes_intro',
    gate: true, unlocks: 'levels', celebrate: 'small',
    teaser: 'Chase is measuring something', progress: (s) => [s.acct.level, 5],
    bubbles: [
      "Been tracking you since the receipt. Everything you do — every box, every launch — feeds a number I call your Hustler Level. You're already Level 5.",
      'Levels pay perk points. Perks make the grind grind harder. The grind is self-sealing. That\'s not a warning, it\'s a feature list.',
    ],
    ackLabel: 'show me the bar',
  },
  {
    id: 'thesis_wellness', from: 'chase', icon: '🍄', title: 'Wellness',
    trigger: (s) => !!s.run.unlocked.shroomcoffee, after: 'followers_intro',
    bubbles: [
      "Mushroom coffee. You've graduated from junk to wellness. Wellness is junk that apologizes.",
      "They're not buying coffee. They're buying the person they'd be if they drank this coffee. Sell the person. The coffee is packaging.",
    ],
    ackLabel: 'sell the person',
  },

  // --- Act 3: the exit ---------------------------------------------------------

  {
    id: 'standup_intro', from: 'chase', icon: '🤖', title: 'You Have a Team Now',
    trigger: (s) => s.acct.level >= 8, after: 'levels_intro',
    gate: true, unlocks: 'standup', celebrate: 'small',
    teaser: 'A team forms at Hustler Lv 8', progress: (s) => [s.acct.level, 8],
    bubbles: [
      'You leveled into your first hire: Brayden, the Auto-Packer. Two orders a second, never sleeps, legally not a person — keeps payroll clean.',
      "More of his kind arrive as you level. None of them will be paid either. Delegation!",
      "Also: the app now pays you a Consistency bonus for showing up daily. Your first ad each day is a guaranteed HIT. Streaks pause, never reset. Show up.",
    ],
    ackLabel: 'welcome, Brayden',
  },
  {
    id: 'lesson_standup2', from: 'chase', icon: '🌅', title: 'Lesson 6.5',
    trigger: (s) => (s.acct.standup?.streak || 0) >= 2, after: 'standup_intro',
    bubbles: [
      'Day two in a row. The app noticed, and paid you a Consistency bonus.',
      "Ask yourself why an app would pay you to come back. Actually — don't. That's Lesson 6.5: don't.",
    ],
    ackLabel: "don't",
  },
  {
    id: 'blandrock_notice', from: 'blandrock', icon: '🏢', title: 'Watchlist Disclosure',
    trigger: (s) => s.acct.level >= 9, after: 'standup_intro',
    bubbles: [
      { kind: 'letter', text: 'BLANDROCK CAPITAL — STRATEGIC SYNERGIES DIVISION. Your storefront has been added to a watchlist. This is not an offer. This is a disclosure of appetite. No reply is expected, or possible.' },
    ],
    ackLabel: '…',
  },
  {
    id: 'chase_on_blandrock', from: 'chase', icon: '🕶️', title: 'Kid.',
    trigger: () => true, after: 'blandrock_notice',
    bubbles: [
      "Blandrock messaged you?? Kid. That's the final boss of the Blueprint.",
      'They bought my first company. And my second. The checks clear and the names die.',
      "Lesson 7 when you're ready. You're not ready. That's how I know you're close.",
    ],
    ackLabel: 'lesson 7 when?',
  },
  {
    id: 'exit_intro', from: 'chase', icon: '🧘', title: 'Lesson 7: The Thing That Can Be Sold',
    trigger: (s) => s.acct.level >= 10, after: 'chase_on_blandrock',
    gate: true, unlocks: 'exit', celebrate: 'big',
    teaser: 'Lesson 7 at Hustler Lv 10', progress: (s) => [s.acct.level, 10],
    bubbles: [
      'Lesson 7. Sit down.',
      "You were never building a store. You were building a THING THAT CAN BE SOLD. The products were props; the followers are the asset. Blandrock doesn't buy revenue — it buys the audience and deletes the rest.",
      "Sign. Sell. Start again, bigger, with investors watching. That's the whole Blueprint. That's every blueprint ever sold. Including this one.",
    ],
    ackLabel: 'OPEN THE INBOX',
  },
  {
    id: 'blandrock_offer', from: 'blandrock', icon: '🏢', title: 'Offer Pending Signature',
    trigger: (s) => exitPreview(s).gained >= 1, after: 'exit_intro',
    bubbles: [
      { kind: 'letter', text: 'An acquisition offer awaits your signature in Guru Mode. Valuation: your lifetime figure. Sentiment: not applicable. Lawsuits: waived, fondly.' },
    ],
    ackLabel: 'review offer',
  },
  {
    id: 'first_exit', from: 'chase', icon: '✍️', title: 'Equity Leaving the Body',
    trigger: (s) => s.acct.exits >= 1, after: 'exit_intro',
    bubbles: [
      "You sold it. The followers, the reviews, the name, Brayden. A spreadsheet in Delaware now owns your face's engagement rate.",
      "Feel that lightness? That's equity leaving the body. It gets easier every time. That's the problem — and also Module 8.",
    ],
    ackLabel: 'again.',
  },
  {
    id: 'lesson_niche', from: 'chase', icon: '🎭', title: 'The Mask',
    trigger: (s) => s.acct.exits >= 1, after: 'first_exit',
    bubbles: [
      "New run, new mask. Pick a niche. It's not who you are — it's who the algorithm invoices.",
    ],
    ackLabel: 'pick the mask',
  },
  {
    id: 'lesson_guru_tree', from: 'chase', icon: '🧠', title: 'Little Heads',
    trigger: (s) => s.acct.investors >= 1, after: 'first_exit',
    bubbles: [
      'See the little heads? Investors. Each one pays you 4% just for existing near you. Spend them on the Grindset Tree and the allowance stops — but the power is forever.',
      "Passive income, or permanent leverage. The Blueprint's answer is yes.",
    ],
    ackLabel: 'yes',
  },

  // --- Act 4: the mirror ---------------------------------------------------------

  {
    id: 'thesis_ai', from: 'chase', icon: '🤖', title: 'Nobody Asked',
    trigger: (s) => !!s.run.unlocked.hydrategpt, after: 'thesis_wellness',
    bubbles: [
      'Your water bottle has opinions now. Nobody asked for this.',
      "'Nobody asked' is a forty-billion-dollar category, and you're in it.",
    ],
    ackLabel: 'nobody asked',
  },
  {
    id: 'exit_3', from: 'chase', icon: '🎤', title: 'The Conferences',
    trigger: (s) => s.acct.exits >= 3, after: 'first_exit',
    bubbles: [
      'Third exit. Have the conferences called yet? Hotel ballroom, near an airport, laminated lanyard?',
      "They stopped calling me. It's fine. Watch your numbers. Somebody should.",
    ],
    ackLabel: '…you good?',
  },
  {
    id: 'blandrock_fruit', from: 'blandrock', icon: '🧺', title: 'Congratulatory Dispatch',
    trigger: (s) => s.acct.exits >= 4, after: 'exit_3',
    bubbles: [
      { kind: 'letter', text: 'Per policy, a congratulatory fruit basket has been dispatched to your registered garage. The fruit is plastic. The gesture is enforceable.' },
    ],
    ackLabel: 'thanks?',
  },
  {
    id: 'thesis_masterclass', from: 'chase', icon: '🎓', title: 'The Mirror',
    trigger: (s) => !!s.run.unlocked.masterclass,
    bubbles: [
      "You're selling a course now. 'Passive Income Masterclass.' Stop selling products — sell the dream of selling products.",
      "Module 1 writes itself. It's this conversation. It was always going to be this conversation.",
      'I want 10%.',
    ],
    replies: [{ label: 'No.', response: "Correct. That was Lesson 8. There's nothing after Lesson 8." }],
    ackLabel: 'close the deal',
  },
  {
    id: 'chase_mask_off', from: 'chase', icon: '🕶️', title: 'Real Talk, One Time',
    trigger: (s) => s.acct.exits >= 5 || s.acct.lifetimeAllTime >= 1e9, after: 'first_exit',
    bubbles: [
      'Real talk, one time.',
      'The Blueprint is a PDF of screenshots. The screenshots are of dashboards like yours. You paid me to watch you build the thing I sold you the idea of building. You were the course.',
      'Final payment processed this morning, by the way. Congratulations on everything.',
    ],
    ackLabel: '…',
  },
  {
    id: 'blandrock_acquires', from: 'blandrock', icon: '🏢', title: 'Acquisition Announcement',
    trigger: (s) => s.acct.exits >= 8, after: 'chase_mask_off',
    bubbles: [
      { kind: 'letter', text: 'Blandrock Capital is pleased to announce the acquisition of Chase Margin (the person). His likeness will continue posting in perpetuity. Do not reply to his messages. He no longer reads them.' },
    ],
    ackLabel: 'wait—',
  },
  {
    id: 'chase_epilogue', from: 'chase', icon: '🎤', title: 'Row 40',
    trigger: (s) => !!s.run.unlocked.gurucon, after: 'blandrock_acquires',
    bubbles: [
      "GuruCon. They're selling tickets to be in a room where you talk about selling tickets. The room is near an airport.",
      "Row 40 has a seat that's always empty. Wave at it. That one was mine.",
    ],
    ackLabel: 'wave',
  },
  {
    id: 'exit_10', from: 'chase', icon: '🐍', title: 'End of Syllabus',
    trigger: (s) => s.acct.exits >= 10, after: 'blandrock_acquires',
    bubbles: [
      'A student of your course just launched a course about taking your course. The ouroboros is vertically integrated.',
      'My work here was never necessary.',
    ],
    ackLabel: 'end of syllabus',
  },
  {
    id: 'sponsor_gag', from: 'chase', icon: '📺', title: 'The Circle',
    trigger: (s) => (s.acct.stats.sponsorDoubles || 0) >= 1, after: 'adstudio_intro',
    bubbles: [
      'You watched an ad to double your offline money. The sponsor was us. The sponsor is always us.',
      'Advertising is a circle, and we are all standing inside it.',
    ],
    ackLabel: 'the circle',
  },
]);

export const BEATS_BY_ID = Object.freeze(
  Object.fromEntries(STORY_BEATS.map((b) => [b.id, b]))
);
