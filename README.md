# 📦 Ship Happens

**Sell everything. Learn nothing.**

A satirical dropshipping idle game. Build a store full of absurd products, spin up
low-effort viral video ads in the ClipForge™ slot machine, ride algorithm trend waves,
grow a following, and — when Blandrock Capital comes knocking — sign the acquisition
papers, pick a new niche, and do it all again, bigger.

The whole game is diegetic: you're not playing a game *about* a seller dashboard,
you're using one — **HustleOS™ v4.2.0 "Sigma Update"**.

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

### The loop

1. **📦 PACK ORDER** — click for cash. Clicking dominates early and fades gracefully.
2. **Products** — 12 tiers of increasingly indefensible merchandise, from the Banana
   Slicer Pro Max to GuruCon World Summit Tickets. Milestones at 10/25/50/100… double income.
3. **🎬 Ad Studio** — the star. Spin HOOK × PRODUCT × TREND, watch the odds bar tilt as
   you match live trend waves, then launch on ClikClok / Instaglam / FaceSpace and pray
   to the outcome wheel: 💀 FLOP → 🌋 MEGA-VIRAL.
4. **Followers** gate the good products. Trend waves surge every few minutes (the news
   ticker leaks them early). Golden viral moments float by — click them.
5. **🧘 The Exit** — sell the company to Blandrock Capital for Investors (+4% income each,
   *unspent*), spend them in the Guru Grindset Tree (tension!), pick a Niche card, rebrand,
   go again. Each run plays differently and faster.

Keyboard: `Space` packs orders, `E` spins, `1–8` switch tabs.

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
js/core   — state, fixed-timestep sim, actions, balance math, saves, RNG  (pure)
js/data   — products, ads, upgrades, niches, achievements, flavor         (frozen data)
js/ui     — panels (one per dashboard tab), components (chart, particles, toasts…)
js/audio  — WebAudio synth (zero sound files)
js/dev    — headless fast-forward bots + balance regression suite
```

State is a single object; `sim.js`/`actions.js` are the only writers. UI reads state at
60fps with per-panel throttling and string-diffed DOM writes. Numbers are float64 with
`K/M/B/T/aa/ab…` formatting. Saves are versioned with append-only migrations.
