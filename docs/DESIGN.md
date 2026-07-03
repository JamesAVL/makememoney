# Ship Happens — Design Bible (condensed)

> The reconciled output of a 4-specialist design pass (economy, juice/UX, satire
> content, architecture) + an adversarial design-director review. This is the
> shipped v1 design; numbers cite `js/core/balance.js` (`BAL`) which is canonical.

## Pillars

1. **Satirical hustle-culture parody** — the comedy is part of the dopamine loop.
2. **Hybrid idle + active** — idle income always runs (offline too); active bursts
   (ad campaigns, waves, moments) are meaningfully better, never mandatory.
3. **Diegetic dashboard** — the game IS HustleOS™, the seller's analytics app.
4. **Zero-build, zero-asset** — vanilla JS/CSS/canvas/WebAudio; runs from `index.html`.

## Resources

| Resource | Scope | Role |
|---|---|---|
| Cash | run | the treadmill |
| Followers | run | Reach multiplier `(1+F/1000)^0.4` + product tier gates |
| Hype (0–100+) | run | active-combo meter, `×(1 + H/100)`, decays 1.2/s |
| Creative Energy | run | ad launches; 3 pips, +1/45s (upgradeable) |
| XP / Hustler Level | account | feature gates + 1 perk point & +1% income per level |
| Achievements | account | +1% global income each (~42) |
| Investors | prestige | `floor(√(lifetimeAllTime/1e5))`; +4% income each **unspent** |

## Income

`$/s = Σ(count × baseIncome × 2^milestones × productMults) × static × reach × hype × temp × comeback`

- Ladder: 12 products, cost ×15/tier, income ×5.5/tier, growth 1.09–1.15/unit.
- Milestones ×2 at 10/25/50/100/150/200/250/300/400/500 owned.
- Temp (campaigns × moment buffs) hard-caps at ×40 → "ALGORITHM SATURATED";
  jackpot overflow pays lump-sum cash instead (caps stay honest).
- Click = `$1 + 0.5 × tier-1 $/s`, ×2-ish upgrades, 5% crit ×10 — dominates the
  first minutes, fades naturally (Cookie Clicker cursor pattern).

## The star: Ad Studio (ClipForge™)

- Three reels: **HOOK × PRODUCT × TREND**. Spin = 1 energy; launch = 60s of income.
- **Live odds bar** over FLOP ×0.2 / MID ×1 / HIT ×3 / VIRAL ×10 / MEGA (25/40/25/9/1):
  wave match +12, warm tag +6, product-tag match +4, hook rarity +2/tier,
  Hype boost +5 (costs 30 Hype), pity +1.5/miss. Total mismatch keeps a 5%
  chaos jackpot ("that is how the internet works").
- Platforms: **ClikClok** (rate burst, 90s, decays 1.4→0.6), **Instaglam**
  (+60√F×outcome followers — the tier-gate key), **FaceSpace** (one persistent
  slot, ×1.1–2.5, the idle backbone).
- Reel Locks (upgrades at Lv4/12/19) replace a separate hand-craft mode.
- Rack slots 1→4 unlock at Lv 1/14/20/26.
- First-ever launch is rigged HIT+ (first-taste rule). FLOPs still pay Hype + pity.

## Active layer

- **Trend Waves** every 3–6 min (60–120s): one tag surges — matching products ×3,
  matching ads +12% odds; ticker foreshadows 30s early; a **warm tag** (+6%) always
  exists so the odds bar is never static.
- **Viral Moments** every 3–7 min visible play (pity ≤3 min at session start):
  Frenzy ×5/25s (60%) · Follower Storm (25%) · Whale = 5 min income (10%) ·
  Mega ×12/12s (5%).

## Progression

- **XP curve** `100 × 1.3^(L−1)`; unlocks: Post Ad (2), Stats (6), Auto-Packer VA (8),
  **The Exit (10)**, Intern VA (12), rack 2 (14), Campaign Mgr VA (18), rack 3 (20),
  Trend Watcher VA (25), rack 4 (26). Levels 1–5 celebrate silently.
- **VAs are the idle bridge**: late-game idle ≈ 60% of active rate.
- **Prestige — The Exit**: Blandrock Capital offer inbox; sign the contract
  (drag a scribble), tally, comedy boot screen. Keeps account scope; resets run.
  Spend-vs-hold investor tension via the Guru Grindset Tree (9 nodes, 10→15,000 👤).
- **Pick Your Niche** on rebrand: 3 random cards; +75% income on the niche tag,
  its trends/hooks roll 2×, one anti-tag −25% → every run has a build identity.
- **Offline**: 50% rate, 8h cap (Guru node → 75%, 24h; perks +5%/rank), computed
  from the same cps function as the live sim; "watch our sponsor's ad to DOUBLE it" gag.

## Pacing targets (asserted in `js/dev/balance-check.mjs`)

Bot-time (the greedy bot is superhuman; humans ≈ 2× slower):

| Target | Assert |
|---|---|
| Ad Studio unlocks | ≤ 2 min |
| Exit gate (Lv10) | ≤ 20 min |
| First exit (active) | 10–30 min (human ≈ 25–50) |
| First exit (idle bot) | 45–180 min |
| Tier-7 follower wall | ≥ 15 min |
| Offline vs online-idle | ±1% |

## Deliberate cuts (v1)

Reputation currency, COGS/margin sim, FORMAT as a 4th reel, separate hand-craft
mode, Chirper/LinkedUpon platforms, GuruCo Disciples, second combo meter,
multi-branch events, per-digit odometers. The IPO layer (Founder Shares, tiers
13–18) is designed but deferred to a follow-up.
