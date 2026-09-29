import { describe, expect, it } from "vitest";
import { addRecord, combineCards, groupByDay, HISTORY_LIMIT, recordOf, type QuizRecord } from "./history";
import { initialStudyState, studyReducer, type StudyAction } from "./session";

const run = (...actions: StudyAction[]) => actions.reduce(studyReducer, initialStudyState()).session!;
const answer = (a: "right" | "wrong" | "exclude"): StudyAction[] => [{ type: "flip" }, { type: "answer", answer: a }];
const cards = (...ids: string[]) => ids.map((id) => ({ id, level: "N5" as const }));

const rec = (finishedAt: string, ids: string[], wrongIds: string[] = []): QuizRecord => ({
  finishedAt,
  mode: "normal",
  cards: cards(...ids),
  wrongIds,
  endedEarly: false,
});

describe("recordOf", () => {
  it("keeps the answered cards and the missed ones", () => {
    const session = run(
      { type: "start", mode: "normal", cards: cards("a", "b", "c") },
      ...answer("wrong"),
      ...answer("right"),
      { type: "end" },
    );
    expect(recordOf(session, new Date("2026-09-28T10:00:00Z"))).toEqual({
      finishedAt: "2026-09-28T10:00:00.000Z",
      mode: "normal",
      cards: cards("a", "b"),
      wrongIds: ["a"],
      endedEarly: true,
    });
  });

  it("skips sessions with nothing answered", () => {
    const session = run({ type: "start", mode: "normal", cards: cards("a") }, { type: "end" });
    expect(recordOf(session, new Date())).toBeNull();
  });
});

describe("history", () => {
  it("drops the oldest records past the limit", () => {
    let history: QuizRecord[] = [];
    for (let i = 0; i <= HISTORY_LIMIT; i++) history = addRecord(history, rec(String(i), ["a"]));
    expect(history).toHaveLength(HISTORY_LIMIT);
    expect(history[0].finishedAt).toBe("1");
  });

  it("groups by local day, newest first", () => {
    const at = (d: number, h: number) => new Date(2026, 8, d, h).toISOString();
    const groups = groupByDay([rec(at(27, 9), ["a"]), rec(at(28, 8), ["b"]), rec(at(28, 20), ["c"])]);
    expect(groups.map((g) => [g.day, g.records.map((r) => r.record.cards[0].id)])).toEqual([
      ["2026-09-28", ["c", "b"]],
      ["2026-09-27", ["a"]],
    ]);
  });

  it("combines full and missed-only picks without duplicates or excluded words", () => {
    const one = rec("1", ["a", "b", "c"], ["b"]);
    const two = rec("2", ["b", "d", "e"], ["d", "e"]);
    expect(combineCards([{ record: one, pick: "all" }, { record: two, pick: "missed" }], ["e"])).toEqual(
      cards("a", "b", "c", "d"),
    );
    expect(combineCards([{ record: one, pick: "missed" }])).toEqual(cards("b"));
  });
});
