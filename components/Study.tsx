"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Suspense, use, useCallback, useEffect } from "react";
import { loadWords } from "@/lib/data";
import { canUndo, currentCard, isDone, type Session } from "@/lib/session";
import type { Settings } from "@/lib/storage";
import { dispatch, useStore } from "@/lib/store";
import { LEVELS, type Answer } from "@/lib/types";
import { FlashCard } from "./FlashCard";
import { HomeLink } from "./HomeLink";
import { Loading } from "./Loading";

const levelsOf = (session: Session) => LEVELS.filter((l) => session.cards.some((c) => c.level === l));

export function Study() {
  const store = useStore();
  const router = useRouter();
  const session = store?.study.session ?? null;
  const done = session ? isDone(session) : false;

  useEffect(() => {
    if (done) router.replace("/summary");
  }, [done, router]);

  if (!store) return <Loading />;
  if (!session || session.cards.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
        <p>No active session.</p>
        <Link href="/quiz" className="rounded-full bg-accent px-6 py-3 font-semibold text-accent-foreground">
          Choose cards
        </Link>
        <HomeLink center />
      </div>
    );
  }
  if (done) return <Loading />;

  return (
    <Suspense fallback={<Loading />}>
      <StudyDeck session={session} settings={store.settings} />
    </Suspense>
  );
}

function StudyDeck({ session, settings }: { session: Session; settings: Settings }) {
  const words = use(loadWords(levelsOf(session)));
  const card = currentCard(session);
  const word = card ? words.get(card.id) : undefined;
  const undoable = canUndo(session);

  const onFlip = useCallback(() => dispatch({ type: "flip" }), []);
  const onAnswer = useCallback((answer: Answer) => dispatch({ type: "answer", answer }), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "Backspace" || e.key === "z" || e.key === "u") {
        e.preventDefault();
        dispatch({ type: "undo" });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="flex flex-1 flex-col gap-4">
      <header className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => dispatch({ type: "end" })}
          className="rounded-full px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted"
        >
          End
        </button>
        <div className="text-center">
          <p className="text-sm font-semibold" aria-live="polite">
            {session.index + 1} / {session.cards.length}
          </p>
          {session.mode === "review" && <p className="text-xs text-bad">Reviewing missed</p>}
        </div>
        <button
          type="button"
          onClick={() => dispatch({ type: "undo" })}
          disabled={!undoable}
          className="rounded-full px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted disabled:opacity-30"
        >
          ↶ Undo
        </button>
      </header>

      <div
        className="h-1 overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-label="Session progress"
        aria-valuemin={0}
        aria-valuemax={session.cards.length}
        aria-valuenow={session.index}
      >
        <div
          className="h-full bg-accent transition-[width]"
          style={{ width: `${(100 * session.index) / session.cards.length}%` }}
        />
      </div>

      <div className="flex flex-1 items-center justify-center overflow-x-clip">
        {word ? (
          <FlashCard
            key={session.index}
            word={word}
            flipped={session.flipped}
            onFlip={onFlip}
            onAnswer={onAnswer}
            furigana={settings.furigana}
            romaji={settings.romaji}
          />
        ) : (
          <MissingCard flipped={session.flipped} />
        )}
      </div>

      <p className="hidden text-center text-xs text-muted-foreground sm:block">
        Space: reveal · ←: missed · →: got it · ↓: exclude · Backspace: undo
      </p>
    </div>
  );
}

/** A stored card id no longer exists in the word lists (e.g. after a data rebuild). */
function MissingCard({ flipped }: { flipped: boolean }) {
  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <p className="text-muted-foreground">This card is no longer in the word list.</p>
      <button
        type="button"
        onClick={() => {
          if (!flipped) dispatch({ type: "flip" });
          dispatch({ type: "answer", answer: "right" });
        }}
        className="rounded-full border-2 border-border px-6 py-2 font-semibold"
      >
        Skip
      </button>
    </div>
  );
}
