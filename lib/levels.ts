import { z } from "zod";
import { shuffle, type Rng } from "./deck";
import type { CardRef } from "./session";
import { LevelSchema, type Level, type Word } from "./types";

export const LEVEL_SIZES = [10, 15, 20, 30, 50] as const;
export type LevelSize = (typeof LEVEL_SIZES)[number];

/** A review level follows every this many levels and unlocks the next ones. */
export const LEVELS_PER_BLOCK = 5;
export const REVIEW_SIZE = 20;
/** Review cards drawn from before the block it closes; the rest come from the block itself. */
export const REVIEW_OLDER = 4;

export type Stage =
  | { kind: "level"; index: number; number: number; ids: string[] }
  /** recent: the block's own words; older: every word before the block */
  | { kind: "review"; index: number; number: number; recent: string[]; older: string[] };

/**
 * Words of one JLPT level, in word-list order, cut into levels of `size`.
 * A review level closes every full block that has more levels after it.
 */
export function buildStages(words: readonly Word[], size: number): Stage[] {
  const chunks: string[][] = [];
  for (let i = 0; i < words.length; i += size) chunks.push(words.slice(i, i + size).map((w) => w.id));
  const stages: Stage[] = [];
  chunks.forEach((ids, i) => {
    stages.push({ kind: "level", index: stages.length, number: i + 1, ids });
    const blockEnd = i + 1;
    if (blockEnd % LEVELS_PER_BLOCK === 0 && blockEnd < chunks.length) {
      const blockStart = blockEnd - LEVELS_PER_BLOCK;
      stages.push({
        kind: "review",
        index: stages.length,
        number: blockEnd / LEVELS_PER_BLOCK,
        recent: chunks.slice(blockStart, blockEnd).flat(),
        older: chunks.slice(0, blockStart).flat(),
      });
    }
  });
  return stages;
}

const playable = (ids: readonly string[], excluded: readonly string[]) => ids.filter((id) => !excluded.includes(id));

/** A stage whose words are all excluded has nothing to play and counts as done. */
export const isEmptyStage = (stage: Stage, excluded: readonly string[]) =>
  stage.kind === "level"
    ? playable(stage.ids, excluded).length === 0
    : playable([...stage.recent, ...stage.older], excluded).length === 0;

/** Index of the first stage not done yet; it and every stage before it are unlocked. */
export function frontier(stages: readonly Stage[], completed: readonly number[], excluded: readonly string[]) {
  const i = stages.findIndex((s) => !completed.includes(s.index) && !isEmptyStage(s, excluded));
  return i === -1 ? stages.length : i;
}

/** A level's words shuffled, or REVIEW_SIZE random words for a review (mostly from its own block). */
export function stageCards(stage: Stage, jlpt: Level, excluded: readonly string[], rng: Rng): CardRef[] {
  const refs = (ids: string[]) => ids.map((id) => ({ id, level: jlpt }));
  if (stage.kind === "level") return refs(shuffle(playable(stage.ids, excluded), rng));
  const recent = shuffle(playable(stage.recent, excluded), rng);
  const older = shuffle(playable(stage.older, excluded), rng);
  // older words fill in when the block has too few playable words
  const olderCount = Math.min(older.length, Math.max(REVIEW_OLDER, REVIEW_SIZE - recent.length));
  const picked = [...older.slice(0, olderCount), ...recent.slice(0, REVIEW_SIZE - olderCount)];
  return refs(shuffle(picked, rng));
}

/** Which level a session plays, so finishing it can mark the level done. */
export const LevelRefSchema = z.object({
  jlpt: LevelSchema,
  size: z.number().int().min(1),
  stage: z.number().int().min(0),
  review: z.boolean(),
});
export type LevelRef = z.infer<typeof LevelRefSchema>;

/** Completed stage indexes per JLPT level and level size; changing the size keeps each size's progress. */
export const LevelProgressSchema = z.record(z.string(), z.array(z.number().int().min(0)));
export type LevelProgress = Record<string, number[]>;

/** e.g. "N5 level 3" or "N5 review 1" */
export const levelLabel = (ref: LevelRef) =>
  `${ref.jlpt} ${ref.review ? "review" : "level"} ${stageNumber(ref)}`;

/** Level or review number of a stage index: each review follows LEVELS_PER_BLOCK levels. */
function stageNumber({ stage, review }: LevelRef) {
  const block = Math.floor(stage / (LEVELS_PER_BLOCK + 1));
  return review ? block + 1 : block * LEVELS_PER_BLOCK + (stage % (LEVELS_PER_BLOCK + 1)) + 1;
}

export const progressKey = (jlpt: Level, size: number) => `${jlpt}:${size}`;

export const completedStages = (progress: LevelProgress, jlpt: Level, size: number) =>
  progress[progressKey(jlpt, size)] ?? [];

export function markCompleted(progress: LevelProgress, ref: LevelRef): LevelProgress {
  const key = progressKey(ref.jlpt, ref.size);
  const done = progress[key] ?? [];
  if (done.includes(ref.stage)) return progress;
  return { ...progress, [key]: [...done, ref.stage].sort((a, b) => a - b) };
}
