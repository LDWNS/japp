import { describe, expect, it } from "vitest";
import { buildDeck, createRng, shuffle } from "./deck";
import type { Level, Word } from "./types";

const word = (id: string, level: Level): Word => ({
  id,
  level,
  expression: id,
  reading: id,
  meanings: ["m"],
  example: null,
});

const words = [
  ...Array.from({ length: 30 }, (_, i) => word(`n5-${i}`, "N5")),
  ...Array.from({ length: 30 }, (_, i) => word(`n4-${i}`, "N4")),
  ...Array.from({ length: 5 }, (_, i) => word(`n3-${i}`, "N3")),
];

describe("createRng", () => {
  it("is deterministic per seed and within [0, 1)", () => {
    const a = createRng(42);
    const b = createRng(42);
    const values = Array.from({ length: 100 }, () => a());
    expect(values).toEqual(Array.from({ length: 100 }, () => b()));
    expect(values.every((v) => v >= 0 && v < 1)).toBe(true);
  });

  it("differs between seeds", () => {
    expect(createRng(1)()).not.toBe(createRng(2)());
  });
});

describe("shuffle", () => {
  it("returns a permutation without mutating input", () => {
    const input = [1, 2, 3, 4, 5, 6, 7, 8];
    const copy = [...input];
    const out = shuffle(input, createRng(7));
    expect(input).toEqual(copy);
    expect([...out].sort()).toEqual(copy);
    expect(out).not.toEqual(copy);
  });
});

describe("buildDeck", () => {
  it("samples the requested count from selected levels only", () => {
    const { cards, clamped } = buildDeck(words, ["N5"], 10, createRng(1));
    expect(cards).toHaveLength(10);
    expect(clamped).toBe(false);
    expect(cards.every((c) => c.level === "N5")).toBe(true);
  });

  it("never repeats a card", () => {
    const { cards } = buildDeck(words, ["N5", "N4"], 50, createRng(3));
    expect(new Set(cards.map((c) => c.id)).size).toBe(50);
  });

  it("mixes multiple levels", () => {
    const { cards } = buildDeck(words, ["N5", "N4"], 50, createRng(3));
    const levels = new Set(cards.map((c) => c.level));
    expect(levels).toEqual(new Set(["N5", "N4"]));
  });

  it("clamps to the pool size and reports it", () => {
    const { cards, clamped } = buildDeck(words, ["N3"], 20, createRng(1));
    expect(cards).toHaveLength(5);
    expect(clamped).toBe(true);
  });

  it("'all' takes the whole pool shuffled", () => {
    const { cards, clamped } = buildDeck(words, ["N5", "N3"], "all", createRng(9));
    expect(cards).toHaveLength(35);
    expect(clamped).toBe(false);
  });

  it("is random across seeds", () => {
    const a = buildDeck(words, ["N5"], 10, createRng(1)).cards.map((c) => c.id);
    const b = buildDeck(words, ["N5"], 10, createRng(2)).cards.map((c) => c.id);
    expect(a).not.toEqual(b);
  });
});
