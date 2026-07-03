// All the comedy that isn't mechanically load-bearing: customer names,
// reviews, ticker headlines, company-name generator, boot lines, offline
// report lines, number-suffix tooltips.

export const CUSTOMER_NAMES = Object.freeze([
  'Tanner from Ohio', 'Debra (Verified Boat Owner)', 'xX_CryptoDadd_Xx',
  'Linda B., Espresso Enthusiast', 'Greg (No Last Name Given)', 'Paisleigh W.',
  'Brantley K.', 'Mackenzleigh R.', 'Uncle Rod', 'Jessica J. (Verified)',
  'Jessica K. (Also Verified)', 'Doug, Age Unknown', 'Fern & Gary (Joint Account)',
  'The Entire Henderson Family', 'Coach Dale', 'Bev From The FaceSpace Group',
  'Kyleen (Night Shift)', 'A Raccoon, Possibly', 'Trish Comma Retired',
  'Dr. Steve (Not That Kind)', 'Marcus, Reply Guy', 'Nana Direct-Deposit',
  'Chip Wexler III', 'Someone In A Hurry',
]);

// ~8% of feed entries append a review. 1★ reviews are jokes, not signals.
export const REVIEWS = Object.freeze([
  '★★★★★ “Five stars. It arrived.”',
  '★★★★★ “The mouth tape works, but now my dreams are in a language I don’t speak.”',
  '★★★★☆ “Package took 45 days but honestly the tracking journey changed me.”',
  '★★★★★ “It’s just rocks?? Anyway five stars, the rocks are lovely.”',
  '★☆☆☆☆ “My dog’s posture is now better than mine. One star.”',
  '★★★★★ “The projector showed me a constellation that isn’t real. I’ve named it.”',
  '★★★☆☆ “Bottle glowed red at my daughter’s recital. We don’t speak of it.”',
  '★★☆☆☆ “Instructions were a QR code leading to more instructions to buy instructions.”',
  '★★★★★ “I structured my water. It’s still water. But it’s MY water now.”',
  '★★★★★ “The candle really does smell like a private jet, which turns out to be gasoline.”',
  '★★★★☆ “Opened the Jar of Gym Air. Instantly did one (1) push-up. Unclear if related.”',
  '★★★★★ “Refund page asked me to ‘try loving it instead.’ I do love it now.”',
  '★☆☆☆☆ “Bracelet broke and my sister in Tulsa felt NOTHING. Demanding quantum answers.”',
  '★★★★★ “It’s a sock.” — Dr. Steve (Not That Kind)',
  '★★★★★ “The watch has never told me the time and I have never been more present.”',
  '★★★★★ “Delivery drone made eye contact with me. Growing as a person.”',
  '★★★★☆ “Arrived haunted. 4 stars, the ghost is polite.”',
  '★★★★★ “My nana didn’t believe me until day 3. Day 3 was today. She believes.”',
]);

// Hustle ticker: 70% jokes, 30% actionable signal (wave hints are injected
// separately by the sim — these are the jokes).
export const TICKER_JOKES = Object.freeze([
  'BREAKING: Study links 9-to-5 jobs to having a boss',
  'Your competitor just bought a Cybertruck (financed)',
  'Local man achieves inbox zero, immediately starts second inbox',
  'Report: 68% of “founders” are one guy with a ring light',
  'Markets up on rumors of vibes improving',
  'New productivity hack: doing the thing',
  'Analyst warns: “The grind may not, in fact, ever stop”',
  'Dropshipping guru spotted shipping actual drops',
  'Survey: 9 in 10 customers did not read the return policy',
  'Big Banana denies everything',
  'Hustle University now accepting exposure as tuition',
  'BREAKING: Algorithm changed. Nobody knows why. Nobody asks.',
  'Motivational speaker runs out of motivation, borrows some from crowd',
  'Your aunt shared your ad to 14 family groups. Sales inexplicably up.',
  'Study: standing desks linked to standing',
  'Blandrock Capital acquires the concept of Tuesday',
  'Man who said “let’s circle back” still circling',
  'Warehouse in Delaware reports feeling “watched”',
  'Water found to be wet; hydration influencers take credit',
  'The Fed raises vibes by 25 basis points',
]);

// Company name generator for rebrands: PREFIX + SUFFIX (+ optional legalism).
export const COMPANY_PREFIX = Object.freeze([
  'Drip', 'Vantage', 'Nimbus', 'Apex', 'Lush', 'Volt', 'Zen', 'Peak', 'Nova',
  'Ember', 'Flux', 'Halo', 'Onyx', 'Prime', 'Aura', 'Swift', 'Bold', 'Crisp',
]);
export const COMPANY_SUFFIX = Object.freeze([
  'Logic', 'Vessel', 'Forge', 'Theory', 'Labs', 'Goods', 'Supply', 'Collective',
  'Commerce', 'Dynamics', 'Ventures', 'Cartel', '& Co.', 'Global', 'Syndicate',
]);
export const COMPANY_LEGAL = Object.freeze(['LLC', 'Inc.', 'Ltd.', 'LLC (Delaware)', 'PBC (Pending)']);

// Fake boot progress lines (prestige rebirth + first boot).
export const BOOT_LINES = Object.freeze([
  'Registering LLC in Delaware...',
  'Buying domain...',
  'Ignoring trademark search...',
  'Generating brand values...',
  'Outsourcing mission statement...',
  'Calibrating hustle...',
  'Downloading more RAM (business)...',
  'Signing up for 14 free trials...',
  'Optimizing conversion funnel (a drawing of a funnel)...',
  'Hiring nephew...',
]);

// Offline report lines, one picked at random.
export const OFFLINE_LINES = Object.freeze([
  'While you were pretending to have a life...',
  'While you slept, the machine did not...',
  'While you were gone, commerce continued unsupervised...',
  'In your absence, the numbers went up anyway. Feel things about that...',
]);

export const OFFLINE_FOOTNOTES = Object.freeze([
  'Net vibes: immaculate.',
  'No customers read the return policy.',
  'The warehouse remains unseen.',
  'Brayden the chatbot apologized 412 times.',
  'A raccoon may have placed an order.',
]);

// Satirical tooltips for number suffixes.
export const SUFFIX_TOOLTIPS = Object.freeze({
  K: 'Thousand. Ramen money.',
  M: 'Million. You could buy a boat and regret it.',
  B: 'Billion. Your accountant has an accountant.',
  T: 'Trillion. Nations return your calls.',
  aa: 'We ran out of real numbers. Congratulations?',
  ab: 'Economists have blocked you.',
  ac: 'This is a cry for help expressed in currency.',
});

// Viral ad title generator for campaign cards / hall of fame:
// hook text is combined with these payoff suffixes.
export const AD_PAYOFFS = Object.freeze([
  '(GONE RIGHT)', '(EMOTIONAL)', '(not clickbait)', '(SHOCKING)', '(part 47)',
  '(they cried)', '(vertical video)', '(4K)', '(with receipts)', '(REAL)',
]);

export const HALL_OF_FAME_VIEWS = Object.freeze([
  '2.4M views', '11.8M views', '38.1M views', '104M views', '“all of them” views',
]);
