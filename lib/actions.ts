"use client";

import { loadWords } from "./data";
import { buildDeck, shuffle, type Rng } from "./deck";
import { pileCards, type Progress } from "./progress";
import type { Settings } from "./storage";
import { dispatch } from "./store";

/** Random deck from the selected levels; resolves once the session is in the store. */
export async function startNormalSession(settings: Settings, rng: Rng = Math.random) {
  const words = await loadWords(settings.levels);
  const deck = buildDeck([...words.values()], settings.levels, settings.count, rng);
  dispatch({
    type: "start",
    mode: "normal",
    cards: deck.cards.map(({ id, level }) => ({ id, level })),
  });
  return deck;
}

/** Whole missed pile, shuffled. */
export function startReviewSession(progress: Progress, rng: Rng = Math.random) {
  dispatch({ type: "start", mode: "review", cards: shuffle(pileCards(progress), rng) });
}
