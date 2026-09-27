// @vitest-environment node
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { LEVELS, WordListSchema, type Word } from "./types";

const load = (level: string): Word[] =>
  WordListSchema.parse(
    JSON.parse(readFileSync(join(__dirname, "..", "public", "data", `${level.toLowerCase()}.json`), "utf8")),
  );

const all = LEVELS.map((level) => ({ level, words: load(level) }));

// rough sizes of the Tanos lists; guards against a broken rebuild
const EXPECTED_MIN: Record<string, number> = { N5: 600, N4: 550, N3: 1800, N2: 1500 };

describe("word lists", () => {
  it.each(all)("$level matches schema, level tag and expected size", ({ level, words }) => {
    expect(words.length).toBeGreaterThanOrEqual(EXPECTED_MIN[level]);
    expect(words.every((w) => w.level === level)).toBe(true);
  });

  it("has globally unique ids", () => {
    const ids = all.flatMap(({ words }) => words.map((w) => w.id));
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("has no expression+reading duplicated across levels", () => {
    const keys = all.flatMap(({ words }) => words.map((w) => `${w.expression}|${w.reading}`));
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("has example sentences for most words", () => {
    const words = all.flatMap(({ words }) => words);
    const withExample = words.filter((w) => w.example).length;
    expect(withExample / words.length).toBeGreaterThan(0.8);
  });

  it("has no blank meanings or whitespace padding", () => {
    for (const { words } of all) {
      for (const w of words) {
        for (const m of w.meanings) expect(m).toBe(m.trim());
        expect(w.expression).toBe(w.expression.trim());
      }
    }
  });
});
