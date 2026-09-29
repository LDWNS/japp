import { z } from "zod";
import { shuffle, type Rng } from "./deck";
import { CardRefSchema, summarize, type CardRef, type Session } from "./session";

/** Oldest quizzes are dropped past this, to keep localStorage small. */
export const HISTORY_LIMIT = 500;

export const QuizRecordSchema = z.object({
  /** ISO timestamp of when the quiz finished */
  finishedAt: z.string(),
  mode: z.enum(["normal", "review", "history", "level"]),
  /** answered cards only, in quiz order */
  cards: z.array(CardRefSchema),
  wrongIds: z.array(z.string()),
  endedEarly: z.boolean(),
});
export type QuizRecord = z.infer<typeof QuizRecordSchema>;

export const HistorySchema = z.array(QuizRecordSchema);
export type History = QuizRecord[];

/** Snapshot of a finished session, or null when nothing was answered. */
export function recordOf(session: Session, finishedAt: Date): QuizRecord | null {
  if (session.results.length === 0) return null;
  const answered = new Set(session.results.map((r) => r.id));
  return {
    finishedAt: finishedAt.toISOString(),
    mode: session.mode,
    // review levels repeat missed cards; the record lists each card once
    cards: [...new Map(session.cards.filter((c) => answered.has(c.id)).map((c) => [c.id, c])).values()],
    wrongIds: summarize(session).wrongIds,
    endedEarly: session.endedEarly,
  };
}

export const addRecord = (history: History, record: QuizRecord): History =>
  [...history, record].slice(-HISTORY_LIMIT);

/** Local calendar day, e.g. "2026-09-28", used to group quizzes. */
export function dayKey(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Newest day first, newest quiz first within a day; index is the record's place in history. */
export function groupByDay(history: History): { day: string; records: { index: number; record: QuizRecord }[] }[] {
  const groups = new Map<string, { index: number; record: QuizRecord }[]>();
  for (let index = history.length - 1; index >= 0; index--) {
    const record = history[index];
    const day = dayKey(record.finishedAt);
    groups.set(day, [...(groups.get(day) ?? []), { index, record }]);
  }
  return [...groups].map(([day, records]) => ({ day, records }));
}

export type Pick = "all" | "missed";

/**
 * Cards from several quizzes combined into one deck: each quiz gives all its
 * cards or only the ones missed. Duplicates and excluded words are dropped.
 */
export function combineCards(
  picks: { record: QuizRecord; pick: Pick }[],
  excluded: readonly string[] = [],
): CardRef[] {
  const cards = new Map<string, CardRef>();
  for (const { record, pick } of picks) {
    const wrong = new Set(record.wrongIds);
    for (const card of record.cards) {
      if (pick === "missed" && !wrong.has(card.id)) continue;
      if (excluded.includes(card.id) || cards.has(card.id)) continue;
      cards.set(card.id, card);
    }
  }
  return [...cards.values()];
}

export const shuffledCombined = (
  picks: { record: QuizRecord; pick: Pick }[],
  excluded: readonly string[],
  rng: Rng = Math.random,
) => shuffle(combineCards(picks, excluded), rng);
