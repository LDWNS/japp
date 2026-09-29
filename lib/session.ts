import { z } from "zod";
import { LevelRefSchema, type LevelRef } from "./levels";
import { applyAnswer, emptyProgress, MissedEntrySchema, ProgressSchema, restoreEntry } from "./progress";
import { ANSWERS, LevelSchema, type Answer } from "./types";

export const CardRefSchema = z.object({ id: z.string(), level: LevelSchema });
export type CardRef = z.infer<typeof CardRefSchema>;

export const ResultSchema = z.object({
  id: z.string(),
  answer: z.enum(ANSWERS),
  /** pile entry before this answer, so undo can restore it */
  prev: MissedEntrySchema.nullable(),
});
export type Result = z.infer<typeof ResultSchema>;

export const SessionSchema = z.object({
  /** "history" replays cards picked on the history page, "level" plays one level of the levels page */
  mode: z.enum(["normal", "review", "history", "level"]),
  /** set in "level" mode; a review level puts missed cards back at the end */
  level: LevelRefSchema.nullable().default(null),
  cards: z.array(CardRefSchema),
  index: z.number().int().min(0),
  flipped: z.boolean(),
  results: z.array(ResultSchema),
  /** true when the user left before the last card */
  endedEarly: z.boolean(),
});
export type Session = z.infer<typeof SessionSchema>;
export type SessionMode = Session["mode"];

export const StudyStateSchema = z.object({
  progress: ProgressSchema,
  session: SessionSchema.nullable(),
});
export type StudyState = z.infer<typeof StudyStateSchema>;

export const initialStudyState = (): StudyState => ({ progress: emptyProgress(), session: null });

export type StudyAction =
  | { type: "start"; mode: SessionMode; cards: CardRef[]; level?: LevelRef }
  | { type: "flip" }
  | { type: "answer"; answer: Answer }
  | { type: "undo" }
  | { type: "end" }
  | { type: "clear" };

export const isDone = (s: Session) => s.endedEarly || s.index >= s.cards.length;
export const currentCard = (s: Session): CardRef | undefined =>
  isDone(s) ? undefined : s.cards[s.index];
export const canUndo = (s: Session) => s.results.length > 0 && !s.endedEarly;

export function studyReducer(state: StudyState, action: StudyAction): StudyState {
  const { session, progress } = state;
  switch (action.type) {
    case "start":
      return {
        progress,
        session: {
          mode: action.mode,
          level: action.level ?? null,
          cards: action.cards,
          index: 0,
          flipped: false,
          results: [],
          endedEarly: false,
        },
      };
    case "clear":
      return { progress, session: null };
  }
  if (!session) return state;
  switch (action.type) {
    case "flip":
      if (isDone(session)) return state;
      return { progress, session: { ...session, flipped: !session.flipped } };
    case "answer": {
      const card = currentCard(session);
      // grading is only allowed once the answer has been revealed
      if (!card || !session.flipped) return state;
      const prev = progress.missed[card.id] ?? null;
      const requeue = action.answer === "wrong" && session.level?.review;
      return {
        progress: applyAnswer(progress, card.id, card.level, action.answer),
        session: {
          ...session,
          cards: requeue ? [...session.cards, card] : session.cards,
          index: session.index + 1,
          flipped: false,
          results: [...session.results, { id: card.id, answer: action.answer, prev }],
        },
      };
    }
    case "undo": {
      if (!canUndo(session)) return state;
      const last = session.results[session.results.length - 1];
      // a card requeued by this answer is still the last one: later requeues were undone first
      const requeued = last.answer === "wrong" && session.level?.review;
      return {
        progress: restoreEntry(progress, last.id, last.prev),
        session: {
          ...session,
          cards: requeued ? session.cards.slice(0, -1) : session.cards,
          index: session.index - 1,
          flipped: true,
          results: session.results.slice(0, -1),
        },
      };
    }
    case "end":
      if (isDone(session)) return state;
      return { progress, session: { ...session, endedEarly: true, flipped: false } };
  }
}

export function summarize(session: Session) {
  const wrong = session.results.filter((r) => r.answer === "wrong").length;
  return {
    answered: session.results.length,
    total: session.cards.length,
    right: session.results.length - wrong,
    wrong,
    excluded: session.results.filter((r) => r.answer === "exclude").length,
    /** each missed word once, even when a review level asked it again */
    wrongIds: [...new Set(session.results.filter((r) => r.answer === "wrong").map((r) => r.id))],
  };
}
