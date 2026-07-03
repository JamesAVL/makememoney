// Seeded PRNG (mulberry32). The cursor lives in state.meta.rngState so every
// run is deterministic and replayable — core code must never call Math.random.

export function rand(state) {
  let t = (state.meta.rngState += 0x6d2b79f5) >>> 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export function randInt(state, min, max) {
  return min + Math.floor(rand(state) * (max - min + 1));
}

export function randRange(state, min, max) {
  return min + rand(state) * (max - min);
}

export function pick(state, arr) {
  return arr[Math.floor(rand(state) * arr.length)];
}

// Weighted pick from [{...item, weight}] or a weight accessor.
export function pickWeighted(state, arr, weightOf = (x) => x.weight ?? 1) {
  let total = 0;
  for (const it of arr) total += weightOf(it);
  let roll = rand(state) * total;
  for (const it of arr) {
    roll -= weightOf(it);
    if (roll <= 0) return it;
  }
  return arr[arr.length - 1];
}
