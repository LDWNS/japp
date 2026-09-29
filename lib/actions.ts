"use client";

import { loadWords } from "./data";
import { buildDeck, shuffle, type Rng } from "./deck";
import { shuffledCombined, type Pick, type QuizRecord } from "./history";
import { buildStages, stageCards } from "./levels";
import { pileCards, type Progress } from "./progress";
import type { Level } from "./types";
import type { Settings } from "./storage";
import { dispatch } from "./store";

/**
 * Random deck from the selected levels, minus excluded words; resolves once the
 * session is in the store. An empty deck (everything excluded) starts nothing.
 */
export async function startNormalSession(settings: Settings, rng: Rng = Math.random) {
  const words = await loadWords(settings.levels);
  const excluded = new Set(settings.excluded);
  const pool = [...words.values()].filter((w) => !excluded.has(w.id));
  const deck = buildDeck(pool, settings.levels, settings.count, rng);
  if (deck.cards.length === 0) return deck;
  dispatch({
    type: "start",
    mode: "normal",
    cards: deck.cards.map(({ id, level }) => ({ id, level })),
  });
  return deck;
}

/** Whole missed pile minus excluded words, shuffled. */
export function startReviewSession(progress: Progress, excluded: readonly string[], rng: Rng = Math.random) {
  dispatch({ type: "start", mode: "review", cards: shuffle(pileCards(progress, excluded), rng) });
}

/** Cards picked from past quizzes on the history page, shuffled; empty picks start nothing. */
export function startHistorySession(
  picks: { record: QuizRecord; pick: Pick }[],
  excluded: readonly string[],
  rng: Rng = Math.random,
) {
  const cards = shuffledCombined(picks, excluded, rng);
  if (cards.length > 0) dispatch({ type: "start", mode: "history", cards });
  return cards.length;
}

/** One level (or review level) of the levels page; returns the card count, 0 starts nothing. */
export async function startLevelSession(
  jlpt: Level,
  size: number,
  stageIndex: number,
  excluded: readonly string[],
  rng: Rng = Math.random,
) {
  const words = await loadWords([jlpt]);
  const stage = buildStages([...words.values()], size)[stageIndex];
  if (!stage) return 0;
  const cards = stageCards(stage, jlpt, excluded, rng);
  if (cards.length === 0) return 0;
  dispatch({
    type: "start",
    mode: "level",
    cards,
    level: { jlpt, size, stage: stageIndex, review: stage.kind === "review" },
  });
  return cards.length;
}
