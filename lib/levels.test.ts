import { describe, expect, it } from "vitest";
import { makeWord } from "@/test/fixtures";
import { createRng } from "./deck";
import {
  buildStages,
  frontier,
  levelLabel,
  markCompleted,
  REVIEW_OLDER,
  REVIEW_SIZE,
  stageCards,
  type Stage,
} from "./levels";

const words = (n: number) => Array.from({ length: n }, (_, i) => makeWord({ id: `w${i}` }));
const ids = (from: number, to: number) => Array.from({ length: to - from }, (_, i) => `w${from + i}`);

describe("buildStages", () => {
  it("cuts words into levels in list order, with a review after every 5 levels", () => {
    const stages = buildStages(words(115), 10);
    expect(stages.map((s) => (s.kind === "level" ? `L${s.number}` : `R${s.number}`))).toEqual([
      ...["L1", "L2", "L3", "L4", "L5", "R1"],
      ...["L6", "L7", "L8", "L9", "L10", "R2"],
      "L11",
      "L12",
    ]);
    expect(stages.map((s) => s.index)).toEqual(stages.map((_, i) => i));
    expect(stages[0]).toMatchObject({ kind: "level", ids: ids(0, 10) });
    expect(stages.at(-1)).toMatchObject({ kind: "level", ids: ids(110, 115) });
    expect(stages[11]).toMatchObject({ kind: "review", recent: ids(50, 100), older: ids(0, 50) });
  });

  it("adds no review when nothing follows the last block", () => {
    expect(buildStages(words(50), 10).every((s) => s.kind === "level")).toBe(true);
  });
});

describe("frontier", () => {
  const stages = buildStages(words(70), 10);

  it("unlocks one stage at a time", () => {
    expect(frontier(stages, [], [])).toBe(0);
    expect(frontier(stages, [0, 1], [])).toBe(2);
    // a completed stage past a gap doesn't skip it
    expect(frontier(stages, [0, 2], [])).toBe(1);
    expect(frontier(stages, stages.map((s) => s.index), [])).toBe(stages.length);
  });

  it("treats a level whose words are all excluded as done", () => {
    expect(frontier(stages, [], ids(0, 10))).toBe(1);
  });
});

describe("stageCards", () => {
  const stages = buildStages(words(200), 10);
  const review2 = stages.find((s): s is Extract<Stage, { kind: "review" }> => s.kind === "review" && s.number === 2)!;

  it("shuffles a level's words, minus excluded", () => {
    const cards = stageCards(stages[0], "N5", ["w3"], createRng(1));
    expect(cards.map((c) => c.id).sort()).toEqual(ids(0, 10).filter((id) => id !== "w3").sort());
    expect(cards.every((c) => c.level === "N5")).toBe(true);
  });

  it("draws a review mostly from its block and some from earlier levels", () => {
    const cards = stageCards(review2, "N5", [], createRng(2)).map((c) => c.id);
    expect(cards).toHaveLength(REVIEW_SIZE);
    expect(new Set(cards).size).toBe(REVIEW_SIZE);
    expect(cards.filter((id) => review2.older.includes(id))).toHaveLength(REVIEW_OLDER);
    expect(cards.filter((id) => review2.recent.includes(id))).toHaveLength(REVIEW_SIZE - REVIEW_OLDER);
  });

  it("takes the first review entirely from its block", () => {
    const review1 = stages[5];
    const cards = stageCards(review1, "N5", [], createRng(3)).map((c) => c.id);
    expect(cards).toHaveLength(REVIEW_SIZE);
    expect(cards.every((id) => ids(0, 50).includes(id))).toBe(true);
  });

  it("fills a review with older words when the block is mostly excluded", () => {
    const cards = stageCards(review2, "N5", review2.recent.slice(5), createRng(4)).map((c) => c.id);
    expect(cards).toHaveLength(REVIEW_SIZE);
    expect(cards.filter((id) => review2.recent.includes(id))).toHaveLength(5);
  });
});

describe("progress", () => {
  it("records completed stages per JLPT level and size", () => {
    let p = markCompleted({}, { jlpt: "N5", size: 10, stage: 1, review: false });
    p = markCompleted(p, { jlpt: "N5", size: 10, stage: 0, review: false });
    p = markCompleted(p, { jlpt: "N5", size: 10, stage: 0, review: false });
    p = markCompleted(p, { jlpt: "N4", size: 20, stage: 0, review: false });
    expect(p).toEqual({ "N5:10": [0, 1], "N4:20": [0] });
  });

  it("labels levels and reviews by number", () => {
    expect(levelLabel({ jlpt: "N5", size: 10, stage: 0, review: false })).toBe("N5 level 1");
    expect(levelLabel({ jlpt: "N5", size: 10, stage: 5, review: true })).toBe("N5 review 1");
    expect(levelLabel({ jlpt: "N4", size: 10, stage: 6, review: false })).toBe("N4 level 6");
    expect(levelLabel({ jlpt: "N4", size: 10, stage: 11, review: true })).toBe("N4 review 2");
  });
});
