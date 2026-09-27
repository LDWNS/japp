import { z } from "zod";
import { LevelSchema, type Answer, type Level } from "./types";

/** Consecutive right answers needed to leave the missed pile. */
export const STREAK_TO_CLEAR = 2;

export const MissedEntrySchema = z.object({
  level: LevelSchema,
  streak: z.number().int().min(0),
});
export type MissedEntry = z.infer<typeof MissedEntrySchema>;

export const ProgressSchema = z.object({
  missed: z.record(z.string(), MissedEntrySchema),
});
export type Progress = z.infer<typeof ProgressSchema>;

export const emptyProgress = (): Progress => ({ missed: {} });

/**
 * Wrong → card (re)enters the pile with streak 0.
 * Right on a pile card (any session) → streak+1; leaves the pile at STREAK_TO_CLEAR.
 * Right on a card not in the pile → no change.
 */
export function applyAnswer(progress: Progress, id: string, level: Level, answer: Answer): Progress {
  const missed = { ...progress.missed };
  if (answer === "wrong") {
    missed[id] = { level, streak: 0 };
  } else if (missed[id]) {
    const streak = missed[id].streak + 1;
    if (streak >= STREAK_TO_CLEAR) delete missed[id];
    else missed[id] = { ...missed[id], streak };
  }
  return { ...progress, missed };
}

/** Put one entry back exactly as it was (used by undo). */
export function restoreEntry(progress: Progress, id: string, entry: MissedEntry | null): Progress {
  const missed = { ...progress.missed };
  if (entry) missed[id] = entry;
  else delete missed[id];
  return { ...progress, missed };
}

/**
 * Every card in the pile, as refs for a review session (caller shuffles).
 * Excluded words stay in the pile but are skipped, so including them again brings them back.
 */
export const pileCards = (progress: Progress, excluded: readonly string[] = []) =>
  Object.entries(progress.missed)
    .filter(([id]) => !excluded.includes(id))
    .map(([id, { level }]) => ({ id, level }));

export const missedCount = (progress: Progress, excluded: readonly string[] = []) =>
  pileCards(progress, excluded).length;
