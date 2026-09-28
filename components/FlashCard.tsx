"use client";

import { animate, motion, useMotionValue, useReducedMotion, useTransform } from "motion/react";
import { useCallback, useEffect, useRef } from "react";
import { furigana as toFurigana } from "@/lib/furigana";
import { toRomaji } from "@/lib/romaji";
import { showsRomaji, type RomajiMode } from "@/lib/storage";
import type { Answer, Word } from "@/lib/types";

/** Distance (px) or flick speed (px/s) that counts as a swipe. */
export const SWIPE_OFFSET = 100;
export const SWIPE_VELOCITY = 500;

/**
 * Answer a drag gesture resolves to, or null to snap back.
 * Right = got it, left = missed, down = got it and exclude. The dominant axis wins.
 */
export function swipeAnswer(
  offset: { x: number; y: number },
  velocity: { x: number; y: number },
): Answer | null {
  const vertical = Math.abs(offset.y) > Math.abs(offset.x);
  if (vertical) {
    return offset.y > SWIPE_OFFSET || velocity.y > SWIPE_VELOCITY ? "exclude" : null;
  }
  if (offset.x > SWIPE_OFFSET || velocity.x > SWIPE_VELOCITY) return "right";
  if (offset.x < -SWIPE_OFFSET || velocity.x < -SWIPE_VELOCITY) return "wrong";
  return null;
}

type Props = {
  word: Word;
  flipped: boolean;
  onFlip: () => void;
  onAnswer: (answer: Answer) => void;
  /** reading above kanji on the front */
  furigana?: boolean;
  romaji?: RomajiMode;
};

export function FlashCard({ word, flipped, onFlip, onAnswer, furigana = false, romaji = "off" }: Props) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotate = useTransform(x, [-250, 250], [-12, 12]);
  const rightOpacity = useTransform(x, [0, SWIPE_OFFSET], [0, 1]);
  const wrongOpacity = useTransform(x, [-SWIPE_OFFSET, 0], [1, 0]);
  const excludeOpacity = useTransform(y, [0, SWIPE_OFFSET], [0, 1]);
  const reduceMotion = useReducedMotion();
  const leaving = useRef(false);

  const answer = useCallback(
    (a: Answer) => {
      if (!flipped || leaving.current) return;
      leaving.current = true;
      if (reduceMotion) {
        onAnswer(a);
        return;
      }
      const exit = { duration: 0.25, ease: "easeIn" } as const;
      const done = () => onAnswer(a);
      if (a === "exclude") {
        animate(y, window.innerHeight + 200, exit).then(done);
      } else {
        animate(x, (a === "right" ? 1 : -1) * (window.innerWidth + 200), exit).then(done);
      }
    },
    [flipped, onAnswer, reduceMotion, x, y],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === " " || e.key === "Enter") {
        // Enter/Space on a focused button already triggers its click
        if (e.target instanceof HTMLButtonElement) return;
        e.preventDefault();
        if (!flipped) onFlip();
      } else if (e.key === "ArrowRight") {
        answer("right");
      } else if (e.key === "ArrowLeft") {
        answer("wrong");
      } else if (e.key === "ArrowDown") {
        e.preventDefault(); // don't scroll the page
        answer("exclude");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [answer, flipped, onFlip]);

  const showReading = word.reading !== word.expression;
  const [primary, ...rest] = word.meanings;
  const romajiText = romaji === "off" ? "" : toRomaji(word.reading);

  return (
    <div className="flex w-full flex-col items-center gap-6">
      <motion.div
        data-testid="flashcard"
        // a revealed card takes vertical drags too, so the page must not scroll under it
        className={`relative aspect-[3/4] w-full max-w-sm select-none perspective-distant ${
          flipped ? "touch-none" : "touch-pan-y"
        }`}
        style={{ x, y, rotate }}
        drag={flipped}
        dragDirectionLock
        dragSnapToOrigin
        dragElastic={0.9}
        onDragEnd={(_, info) => {
          const a = swipeAnswer(info.offset, info.velocity);
          if (a) answer(a);
        }}
      >
        <div
          className={`relative h-full w-full transition-transform duration-300 transform-3d motion-reduce:transition-none ${
            flipped ? "rotate-y-180" : ""
          }`}
        >
          {/* front */}
          <button
            type="button"
            onClick={() => !flipped && onFlip()}
            aria-label={flipped ? undefined : "Show answer"}
            aria-hidden={flipped}
            tabIndex={flipped ? -1 : 0}
            className="absolute inset-0 flex flex-col items-center justify-center gap-4 rounded-3xl border border-border bg-card p-6 shadow-lg backface-hidden"
          >
            <span className="absolute top-4 left-4 rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
              {word.level}
            </span>
            <span lang="ja" className="text-center text-6xl leading-tight font-medium break-keep">
              {furigana ? <Furigana word={word} /> : word.expression}
            </span>
            {showsRomaji(romaji, "front") && (
              <span data-testid="romaji-front" className="text-center text-lg text-muted-foreground">
                {romajiText}
              </span>
            )}
            <span className="absolute bottom-5 text-sm text-muted-foreground">Tap to reveal</span>
          </button>

          {/* back: a scroll container resets touch-action, so it needs touch-none
              itself or the browser claims drags as scrolls and cancels the swipe */}
          <div
            aria-hidden={!flipped}
            aria-live="polite"
            className="absolute inset-0 flex rotate-y-180 touch-none flex-col gap-4 overflow-y-auto rounded-3xl border border-border bg-card p-6 shadow-lg backface-hidden"
          >
            {flipped && (
              <>
                <div className="text-center">
                  <p lang="ja" className="text-4xl font-medium">
                    {word.expression}
                  </p>
                  {showReading && (
                    <p lang="ja" data-testid="reading" className="mt-1 text-2xl text-muted-foreground">
                      {word.reading}
                    </p>
                  )}
                  {showsRomaji(romaji, "back") && (
                    <p data-testid="romaji" className="mt-1 text-muted-foreground">
                      {romajiText}
                    </p>
                  )}
                </div>
                <p className="text-center text-lg">
                  <strong>{primary}</strong>
                  {rest.length > 0 && <span className="text-muted-foreground">, {rest.join(", ")}</span>}
                </p>
                {word.example && (
                  <div className="mt-auto rounded-2xl bg-muted p-4">
                    <p lang="ja" className="text-lg">
                      {word.example.ja}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">{word.example.en}</p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        <motion.span
          aria-hidden
          style={{ opacity: rightOpacity }}
          className="pointer-events-none absolute top-6 right-6 rotate-12 rounded-lg border-4 border-good px-3 py-1 text-2xl font-bold text-good"
        >
          GOT IT
        </motion.span>
        <motion.span
          aria-hidden
          style={{ opacity: wrongOpacity }}
          className="pointer-events-none absolute top-6 left-6 -rotate-12 rounded-lg border-4 border-bad px-3 py-1 text-2xl font-bold text-bad"
        >
          MISSED
        </motion.span>
        <motion.span
          aria-hidden
          style={{ opacity: excludeOpacity }}
          className="pointer-events-none absolute top-6 left-1/2 -translate-x-1/2 rounded-lg border-4 border-foreground px-3 py-1 text-2xl font-bold whitespace-nowrap text-foreground"
        >
          KNOWN
        </motion.span>
      </motion.div>

      <div className="flex w-full max-w-sm justify-between gap-4">
        <button
          type="button"
          disabled={!flipped}
          onClick={() => answer("wrong")}
          className="flex-1 rounded-full border-2 border-bad py-3 font-semibold text-bad transition disabled:opacity-30"
        >
          ✗ Missed
        </button>
        <button
          type="button"
          disabled={!flipped}
          onClick={() => answer("right")}
          className="flex-1 rounded-full border-2 border-good py-3 font-semibold text-good transition disabled:opacity-30"
        >
          ✓ Got it
        </button>
      </div>
      <button
        type="button"
        disabled={!flipped}
        onClick={() => answer("exclude")}
        className="-mt-2 rounded-full px-4 py-1.5 text-sm text-muted-foreground transition hover:bg-muted disabled:opacity-30"
      >
        ↓ Know it, don&apos;t show again
      </button>
    </div>
  );
}

function Furigana({ word }: { word: Word }) {
  return toFurigana(word.expression, word.reading).map((seg, i) =>
    seg.ruby ? (
      <ruby key={i}>
        {seg.text}
        <rp>(</rp>
        <rt className="text-[0.4em] font-normal text-muted-foreground">{seg.ruby}</rt>
        <rp>)</rp>
      </ruby>
    ) : (
      seg.text
    ),
  );
}
