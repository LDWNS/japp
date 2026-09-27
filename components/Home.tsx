"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { startNormalSession, startReviewSession } from "@/lib/actions";
import { COUNT_OPTIONS, type DeckCount } from "@/lib/deck";
import { missedCount } from "@/lib/progress";
import { isDone } from "@/lib/session";
import { updateSettings, useStore } from "@/lib/store";
import { LEVELS, type Level } from "@/lib/types";
import { Loading } from "./Loading";

export function Home() {
  const store = useStore();
  const router = useRouter();
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!store) return <Loading />;
  const { settings, study } = store;
  const missed = missedCount(study.progress);
  const resumable = study.session && !isDone(study.session) ? study.session : null;

  const toggleLevel = (level: Level) => {
    const has = settings.levels.includes(level);
    // at least one level stays selected
    if (has && settings.levels.length === 1) return;
    const levels = has ? settings.levels.filter((l) => l !== level) : [...settings.levels, level];
    updateSettings({ ...settings, levels: LEVELS.filter((l) => levels.includes(l)) });
  };

  const setCount = (count: DeckCount) => updateSettings({ ...settings, count });

  const start = async () => {
    setStarting(true);
    setError(null);
    try {
      await startNormalSession(settings);
      router.push("/study");
    } catch {
      setError("Couldn't load the word list. Check your connection and try again.");
      setStarting(false);
    }
  };

  const review = () => {
    startReviewSession(study.progress);
    router.push("/study");
  };

  return (
    <div className="flex flex-1 flex-col gap-8 py-4">
      <header>
        <h1 className="text-3xl font-bold">
          J-app <span lang="ja" className="text-accent">単語</span>
        </h1>
        <p className="mt-1 text-muted-foreground">JLPT vocabulary flashcards</p>
      </header>

      <section aria-labelledby="levels-heading" className="flex flex-col gap-3">
        <h2 id="levels-heading" className="font-semibold">
          Levels
        </h2>
        <div className="grid grid-cols-4 gap-2">
          {LEVELS.map((level) => {
            const on = settings.levels.includes(level);
            return (
              <button
                key={level}
                type="button"
                aria-pressed={on}
                onClick={() => toggleLevel(level)}
                className={`rounded-xl border-2 py-3 text-lg font-semibold transition ${
                  on ? "border-accent bg-accent text-accent-foreground" : "border-border bg-card"
                }`}
              >
                {level}
              </button>
            );
          })}
        </div>
      </section>

      <section aria-labelledby="count-heading" className="flex flex-col gap-3">
        <h2 id="count-heading" className="font-semibold">
          Cards
        </h2>
        <div role="radiogroup" aria-labelledby="count-heading" className="grid grid-cols-5 gap-2">
          {COUNT_OPTIONS.map((count) => {
            const on = settings.count === count;
            return (
              <button
                key={count}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => setCount(count)}
                className={`rounded-xl border-2 py-2.5 font-semibold transition ${
                  on ? "border-foreground bg-foreground text-background" : "border-border bg-card"
                }`}
              >
                {count === "all" ? "All" : count}
              </button>
            );
          })}
        </div>
      </section>

      <div className="mt-auto flex flex-col gap-3">
        {error && (
          <p role="alert" className="text-sm text-bad">
            {error}
          </p>
        )}
        {resumable && (
          <Link
            href="/study"
            className="rounded-full border-2 border-foreground py-3.5 text-center font-semibold"
          >
            Resume session ({resumable.index}/{resumable.cards.length})
          </Link>
        )}
        <button
          type="button"
          onClick={start}
          disabled={starting}
          className="rounded-full bg-accent py-4 text-lg font-semibold text-accent-foreground transition disabled:opacity-60"
        >
          {starting ? "Loading…" : "Start"}
        </button>
        <button
          type="button"
          onClick={review}
          disabled={missed === 0}
          className="rounded-full border-2 border-bad py-3.5 font-semibold text-bad transition disabled:border-border disabled:text-muted-foreground"
        >
          Review missed ({missed})
        </button>
        <Link href="/about" className="py-2 text-center text-sm text-muted-foreground underline">
          About &amp; credits
        </Link>
      </div>
    </div>
  );
}
