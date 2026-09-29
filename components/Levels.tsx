"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Suspense, use, useState } from "react";
import { startLevelSession } from "@/lib/actions";
import { loadWords } from "@/lib/data";
import { buildStages, completedStages, frontier, isEmptyStage, REVIEW_SIZE, type Stage } from "@/lib/levels";
import type { Stored } from "@/lib/storage";
import { useStore } from "@/lib/store";
import { LEVELS, type Level } from "@/lib/types";
import { HomeLink } from "./HomeLink";
import { Loading } from "./Loading";

export function Levels() {
  const store = useStore();
  const [picked, setPicked] = useState<Level | null>(null);

  if (!store) return <Loading />;
  const jlpt = picked ?? store.settings.levels[0];

  return (
    <div className="flex flex-1 flex-col gap-6 py-4">
      <header>
        <HomeLink />
        <h1 className="text-3xl font-bold">Levels</h1>
        <p className="mt-1 text-muted-foreground">
          {store.settings.levelSize} words per level ·{" "}
          <Link href="/settings" className="underline">
            change
          </Link>
        </p>
      </header>

      <div role="radiogroup" aria-label="JLPT level" className="grid grid-cols-4 gap-2">
        {LEVELS.map((level) => (
          <button
            key={level}
            type="button"
            role="radio"
            aria-checked={jlpt === level}
            onClick={() => setPicked(level)}
            className={`rounded-xl border-2 py-2.5 font-semibold transition ${
              jlpt === level ? "border-foreground bg-foreground text-background" : "border-border bg-card"
            }`}
          >
            {level}
          </button>
        ))}
      </div>

      <Suspense key={jlpt} fallback={<Loading />}>
        <StageList jlpt={jlpt} store={store} />
      </Suspense>
    </div>
  );
}

function StageList({ jlpt, store }: { jlpt: Level; store: Stored }) {
  const router = useRouter();
  const words = use(loadWords([jlpt]));
  const { levelSize, excluded } = store.settings;
  const stages = buildStages([...words.values()], levelSize);
  const completed = completedStages(store.levels, jlpt, levelSize);
  const open = frontier(stages, completed, excluded);
  const levelCount = stages.filter((s) => s.kind === "level").length;
  const doneCount = stages.filter((s) => s.kind === "level" && s.index < open).length;

  const start = async (stage: Stage) => {
    if ((await startLevelSession(jlpt, levelSize, stage.index, excluded)) > 0) router.push("/study");
  };

  return (
    <section aria-label={`${jlpt} levels`} className="flex flex-col gap-3">
      <p className="text-sm text-muted-foreground">
        {doneCount} of {levelCount} levels done
      </p>
      <ol className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {stages.map((stage) => {
          const locked = stage.index > open;
          const done = completed.includes(stage.index) || (!locked && isEmptyStage(stage, excluded));
          const review = stage.kind === "review";
          const name = review ? `Review ${stage.number}` : `Level ${stage.number}`;
          const detail = review
            ? `${REVIEW_SIZE} words · misses come back`
            : `${stage.ids.length} ${stage.ids.length === 1 ? "word" : "words"}`;
          return (
            <li key={stage.index} className={review ? "col-span-full" : ""}>
              <button
                type="button"
                disabled={locked}
                aria-label={`${name}${done ? ", done" : locked ? ", locked" : ""}`}
                onClick={() => start(stage)}
                className={`flex w-full items-center justify-between gap-2 rounded-2xl border-2 px-4 py-3 text-left transition disabled:opacity-40 ${
                  stage.index === open
                    ? "border-accent bg-accent text-accent-foreground"
                    : review
                      ? "border-foreground bg-card"
                      : "border-border bg-card"
                }`}
              >
                <span>
                  <span className="block font-semibold">{name}</span>
                  <span className="block text-sm opacity-75">{detail}</span>
                </span>
                <span aria-hidden className="text-lg">
                  {done ? "✓" : locked ? "🔒" : ""}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
