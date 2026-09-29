import { describe, expect, it } from "vitest";
import {
  canUndo,
  currentCard,
  initialStudyState,
  isDone,
  studyReducer,
  summarize,
  type CardRef,
  type StudyAction,
  type StudyState,
} from "./session";

const cards: CardRef[] = [
  { id: "a", level: "N5" },
  { id: "b", level: "N5" },
  { id: "c", level: "N4" },
];

const run = (actions: StudyAction[], from: StudyState = initialStudyState()) =>
  actions.reduce(studyReducer, from);

const start: StudyAction = { type: "start", mode: "normal", cards };
const flip: StudyAction = { type: "flip" };
const right: StudyAction = { type: "answer", answer: "right" };
const wrong: StudyAction = { type: "answer", answer: "wrong" };
const undo: StudyAction = { type: "undo" };

describe("studyReducer", () => {
  it("starts on the first card, face down", () => {
    const s = run([start]).session!;
    expect(currentCard(s)).toEqual(cards[0]);
    expect(s.flipped).toBe(false);
  });

  it("flip toggles the card", () => {
    expect(run([start, flip]).session!.flipped).toBe(true);
    expect(run([start, flip, flip]).session!.flipped).toBe(false);
  });

  it("ignores answers before the card is flipped", () => {
    const before = run([start]);
    expect(studyReducer(before, right)).toBe(before);
  });

  it("answering advances and records into progress", () => {
    const state = run([start, flip, wrong]);
    expect(currentCard(state.session!)).toEqual(cards[1]);
    expect(state.session!.flipped).toBe(false);
    expect(state.progress.missed.a).toEqual({ level: "N5", streak: 0 });
  });

  it("finishes after the last card", () => {
    const state = run([start, flip, right, flip, wrong, flip, right]);
    expect(isDone(state.session!)).toBe(true);
    expect(currentCard(state.session!)).toBeUndefined();
    // further input is ignored
    expect(studyReducer(state, flip)).toBe(state);
    expect(studyReducer(state, right)).toBe(state);
  });

  it("undo steps back multiple times to the session start, restoring progress", () => {
    const seeded = run([start, flip, wrong]);
    const begin = run([{ type: "start", mode: "review", cards }], seeded);
    // "a" is in the pile with streak 0; answer right twice would clear it after the next session
    const after = run([flip, right, flip, wrong, flip, wrong], begin);
    expect(after.progress.missed.a.streak).toBe(1);
    expect(Object.keys(after.progress.missed).sort()).toEqual(["a", "b", "c"]);

    const back1 = run([undo], after);
    expect(back1.session!.index).toBe(2);
    expect(back1.session!.flipped).toBe(true);
    expect(back1.progress.missed.c).toBeUndefined();

    const back3 = run([undo, undo], back1);
    expect(back3.session!.index).toBe(0);
    expect(back3.progress).toEqual(begin.progress);
    expect(canUndo(back3.session!)).toBe(false);
    expect(run([undo], back3)).toBe(back3);
  });

  it("undo restores an entry a right answer cleared", () => {
    let state = run([start, flip, wrong]);
    state = run([start, flip, right], state); // streak 1
    state = run([start, flip, right], state); // cleared
    expect(state.progress.missed.a).toBeUndefined();
    state = run([undo], state);
    expect(state.progress.missed.a).toEqual({ level: "N5", streak: 1 });
  });

  it("can re-grade after undo", () => {
    const state = run([start, flip, wrong, undo, right]);
    expect(state.progress.missed.a).toBeUndefined();
    expect(state.session!.results).toEqual([{ id: "a", answer: "right", prev: null }]);
  });

  it("end finishes early and blocks undo", () => {
    const state = run([start, flip, wrong, { type: "end" }]);
    expect(isDone(state.session!)).toBe(true);
    expect(state.session!.endedEarly).toBe(true);
    expect(canUndo(state.session!)).toBe(false);
  });

  it("start replaces a previous session but keeps progress", () => {
    const first = run([start, flip, wrong]);
    const second = run([start], first);
    expect(second.session!.results).toEqual([]);
    expect(second.progress).toEqual(first.progress);
  });

  it("clear removes the session", () => {
    expect(run([start, { type: "clear" }]).session).toBeNull();
  });

  it("actions without a session are no-ops", () => {
    const empty = initialStudyState();
    for (const a of [flip, right, undo, { type: "end" } as const]) {
      expect(studyReducer(empty, a)).toBe(empty);
    }
  });
});

describe("summarize", () => {
  it("counts results and lists wrong ids in order", () => {
    const s = run([start, flip, wrong, flip, right, { type: "end" }]).session!;
    expect(summarize(s)).toEqual({ answered: 2, total: 3, right: 1, wrong: 1, excluded: 0, wrongIds: ["a"] });
  });

  it("counts excluded cards as right", () => {
    const exclude: StudyAction = { type: "answer", answer: "exclude" };
    const s = run([start, flip, wrong, flip, exclude, flip, right]).session!;
    expect(summarize(s)).toMatchObject({ right: 2, wrong: 1, excluded: 1 });
  });
});

describe("review levels", () => {
  const review: StudyAction = {
    type: "start",
    mode: "level",
    cards: cards.slice(0, 2),
    level: { jlpt: "N5", size: 10, stage: 5, review: true },
  };

  it("put a missed card back at the end until it's answered right", () => {
    const s = run([review, flip, wrong, flip, right]).session!;
    expect(s.cards.map((c) => c.id)).toEqual(["a", "b", "a"]);
    expect(isDone(s)).toBe(false);
    const done = run([flip, right], { progress: initialStudyState().progress, session: s }).session!;
    expect(isDone(done)).toBe(true);
    expect(summarize(done)).toMatchObject({ right: 2, wrong: 1, wrongIds: ["a"] });
  });

  it("undo takes the requeued card back out", () => {
    const s = run([review, flip, wrong, undo]).session!;
    expect(s.cards.map((c) => c.id)).toEqual(["a", "b"]);
    expect(s.index).toBe(0);
  });

  it("normal levels don't requeue", () => {
    const s = run([{ ...review, level: { ...review.level!, review: false } }, flip, wrong]).session!;
    expect(s.cards).toHaveLength(2);
  });
});
