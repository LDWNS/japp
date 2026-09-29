"use client";

import { loadWords } from "./data";
import { buildDeck, shuffle, type Rng } from "./deck";
import { shuffledCombined, type Pick, type QuizRecord } from "./history";
import { pileCards, type Progress } from "./progress";
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
