import { describe, expect, it } from "vitest";
import { applyAnswer, emptyProgress, missedCount, pileCards, restoreEntry, STREAK_TO_CLEAR } from "./progress";

describe("applyAnswer", () => {
  it("adds wrong cards to the pile with streak 0", () => {
    const p = applyAnswer(emptyProgress(), "a", "N5", "wrong");
    expect(p.missed).toEqual({ a: { level: "N5", streak: 0 } });
  });

  it("ignores right answers for cards not in the pile", () => {
    expect(applyAnswer(emptyProgress(), "a", "N5", "right")).toEqual(emptyProgress());
  });

  it(`clears a card after ${STREAK_TO_CLEAR} consecutive rights`, () => {
    let p = applyAnswer(emptyProgress(), "a", "N5", "wrong");
    p = applyAnswer(p, "a", "N5", "right");
    expect(p.missed.a).toEqual({ level: "N5", streak: 1 });
    p = applyAnswer(p, "a", "N5", "right");
    expect(p.missed.a).toBeUndefined();
  });

  it("resets the streak on a wrong answer", () => {
    let p = applyAnswer(emptyProgress(), "a", "N5", "wrong");
    p = applyAnswer(p, "a", "N5", "right");
    p = applyAnswer(p, "a", "N5", "wrong");
    expect(p.missed.a.streak).toBe(0);
    p = applyAnswer(p, "a", "N5", "right");
    expect(p.missed.a.streak).toBe(1);
  });

  it("does not mutate input", () => {
    const p = applyAnswer(emptyProgress(), "a", "N5", "wrong");
    const snapshot = structuredClone(p);
    applyAnswer(p, "a", "N5", "right");
    applyAnswer(p, "b", "N4", "wrong");
    expect(p).toEqual(snapshot);
  });
});

describe("restoreEntry", () => {
  it("restores or removes an entry", () => {
    const p = applyAnswer(emptyProgress(), "a", "N5", "wrong");
    expect(restoreEntry(p, "a", null).missed).toEqual({});
    expect(restoreEntry(emptyProgress(), "a", { level: "N4", streak: 1 }).missed).toEqual({
      a: { level: "N4", streak: 1 },
    });
  });
});

describe("missedCount", () => {
  it("counts pile entries", () => {
    let p = applyAnswer(emptyProgress(), "a", "N5", "wrong");
    p = applyAnswer(p, "b", "N5", "wrong");
    expect(missedCount(p)).toBe(2);
  });

  it("skips excluded words", () => {
    let p = applyAnswer(emptyProgress(), "a", "N5", "wrong");
    p = applyAnswer(p, "b", "N5", "wrong");
    expect(missedCount(p, ["a"])).toBe(1);
  });
});

describe("pileCards", () => {
  it("lists pile entries as card refs", () => {
    let p = applyAnswer(emptyProgress(), "a", "N5", "wrong");
    p = applyAnswer(p, "b", "N3", "wrong");
    expect(pileCards(p)).toEqual([
      { id: "a", level: "N5" },
      { id: "b", level: "N3" },
    ]);
  });

  it("leaves out excluded words without dropping them from the pile", () => {
    let p = applyAnswer(emptyProgress(), "a", "N5", "wrong");
    p = applyAnswer(p, "b", "N3", "wrong");
    expect(pileCards(p, ["a"])).toEqual([{ id: "b", level: "N3" }]);
    expect(pileCards(p)).toHaveLength(2);
  });
});
