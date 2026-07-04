# 📦 Ship Happens

**Sell everything. Learn nothing.**

A satirical, story-driven dropshipping idle game. You're broke, you just bought the
**"Zero-to-Exit Freedom Blueprint™"** ($1,997, payment 1 of 3 processed), and your
mentor — hustle-guru **Chase Margin** (`@TheChaseMargin ✔`) — DMs you lessons that
unlock the game one mechanic at a time: pack boxes, stock a store full of absurd
products, manufacture virality in the ClipForge™ slot machine, farm followers, ride
algorithm weather, and — when Blandrock Capital's letterhead arrives — sign the
acquisition papers, pick a new mask, and do it again, bigger. Stick with him across
enough exits and Chase's own story ends the way it always had to.

The whole game is diegetic: you're not playing a game *about* a seller dashboard,
you're using one — **HustleOS™ v5.0.0 "The Mentorship Update"**.

## Play

**Zero build, zero dependencies, zero network.** Play at the deployed site, install it as
an app (it's a full PWA: offline-capable, home-screen installable, haptics, wake lock), or serve
the folder statically:

```bash
python3 -m http.server 8000   # then visit http://localhost:8000
```

Works on GitHub Pages out of the box. Saves live in `localStorage` (autosaved every 15s,
dual-slot with backup; export/import from Settings). A service worker caches the app shell —
after the first visit it loads and plays fully offline; deploys surface an in-app
"update ready" toast (append `?sw=off` to bypass/clear the worker if ever needed).

### The arc (paced for ~2–3 hours to your first exit)

1. **Lesson 1** — the button packs the box. That's the whole game for a while, on purpose.
2. **Lesson 2: Products** (~2 min) — 12 tiers of increasingly indefensible merchandise,
   from the Banana Slicer Pro Max to GuruCon World Summit Tickets. Milestones double income.
3. **Lesson 3: Ad Studio** (~10 min) — the star. Spin HOOK × PRODUCT × TREND, watch the
   live odds bar, launch, and take the stamp: FLOP → MEGA-VIRAL. Platforms, followers,
   Hype, and Conversion Tools (fake countdown timers, real money) arrive lesson by lesson.
4. **Lesson 6: Trends** (~40 min) — the algorithm has weather. Waves and golden Viral
   Moments only start firing after Chase explains them; nothing in this game appears
   before it's introduced.
5. **Lesson 7: The Exit** (~1–2 h) — "You were never building a store. You were building
   a THING THAT CAN BE SOLD." Sell to Blandrock for Investors (+4% each, *unspent*),
   spend them in the Guru Grindset Tree (tension!), pick a Niche, go again bigger. Chase
   keeps texting across runs; read to the end of the syllabus.

Keyboard: `Space` packs orders, `E` spins, `I` opens the inbox, `1–8` switch tabs.

## Development

- Vanilla ES modules, no toolchain. `js/core` is pure (no DOM, no `Date.now`, no
  `Math.random`) — the entire sim runs headless in Node.
- **Balance harness** (run after any tuning change):

  ```bash
  node js/dev/balance-check.mjs
  ```

  Fast-forwards active/idle bot players through hours of play and asserts the pacing
  table (first exit timing, offline/online parity, save round-trips).
- `?dev=1` exposes `window.dev` in the console (`dev.give(1e6)`, `dev.wave()`,
  `dev.moment()`, `dev.energy()`).
- All tuning constants live in `js/core/balance.js` (`BAL`) and `js/data/*.js`.
- Design bible: [`docs/DESIGN.md`](docs/DESIGN.md).

## Architecture (short version)

```
js/core   — state, fixed-timestep sim, actions, story engine, balance, saves, RNG (pure)
js/data   — products, ads, upgrades, niches, achievements, flavor, story beats    (frozen data)
js/ui     — panels (one per dashboard tab), components (chart, DMs, toasts…),
            generated icons.js/art.js (vendored Phosphor + hand-drawn SVG)
js/audio  — WebAudio synth (zero sound files)
js/dev    — headless bots + balance suite, asset bundler (fetch-assets.mjs)
```

The narrative is data: `js/data/story.js` holds every DM beat with a pure trigger
predicate; `js/core/story.js` delivers at most one unread DM at a time and applies
unlocks on acknowledgement — so the headless balance bots live the exact same
staged timeline as players (and the suite asserts no wave or golden moment can
fire before its lesson). Asset licenses: `assets/LICENSES.md`.

State is a single object; `sim.js`/`actions.js` are the only writers. UI reads state at
60fps with per-panel throttling and string-diffed DOM writes. Numbers are float64 with
`K/M/B/T/aa/ab…` formatting. Saves are versioned with append-only migrations.
