import type { Level, Word } from "./types";

export type Rng = () => number;

/** Deterministic PRNG (mulberry32) so tests can seed; the app seeds from Math.random. */
export function createRng(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Fisher–Yates; returns a new array. */
export function shuffle<T>(items: readonly T[], rng: Rng): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export const COUNT_OPTIONS = [10, 20, 50, 100, "all"] as const;
export type DeckCount = (typeof COUNT_OPTIONS)[number];

export type Deck = {
  cards: Word[];
  /** true when fewer cards were available than requested */
  clamped: boolean;
};

export function buildDeck(
  words: readonly Word[],
  levels: readonly Level[],
  count: DeckCount,
  rng: Rng,
): Deck {
  const pool = words.filter((w) => levels.includes(w.level));
  const shuffled = shuffle(pool, rng);
  if (count === "all") return { cards: shuffled, clamped: false };
  return { cards: shuffled.slice(0, count), clamped: pool.length < count };
}
