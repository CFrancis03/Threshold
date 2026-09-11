/**
 * A tiny seeded random number generator (mulberry32).
 *
 * We need reproducibility in two places: tests, and "randomise" buttons that
 * should be able to hand the player the same interesting starting point twice.
 */
export function makeRng(seed: number): () => number {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Uniform sample in [min, max). */
export function uniform(rng: () => number, min: number, max: number): number {
  return min + rng() * (max - min);
}

/** Standard normal via Box-Muller, used for weight initialisation. */
export function gaussian(rng: () => number): number {
  let u = 0;
  let v = 0;
  while (u === 0) u = rng();
  while (v === 0) v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/**
 * Fisher-Yates shuffle, returning a new array.
 *
 * Datasets are generated class by class, which would hand mini-batch training
 * batches containing only one label. Shuffling once at generation time fixes
 * that without the training loop needing to know about it.
 */
export function shuffle<T>(items: readonly T[], rng: () => number): T[] {
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
