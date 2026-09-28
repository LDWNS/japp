"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Suspense, use } from "react";
import { startReviewSession } from "@/lib/actions";
import { loadWords } from "@/lib/data";
import { missedCount } from "@/lib/progress";
import { isDone, summarize, type Session } from "@/lib/session";
import { useStore } from "@/lib/store";
import { LEVELS } from "@/lib/types";
import { HomeLink } from "./HomeLink";
import { Loading } from "./Loading";

export function Summary() {
  const store = useStore();
  const router = useRouter();

  if (!store) return <Loading />;
  const { session, progress } = store.study;
  const { excluded } = store.settings;
  if (!session || !isDone(session)) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
        <p>{session ? "Session still in progress." : "No finished session yet."}</p>
        <Link
          href={session ? "/study" : "/quiz"}
          className="rounded-xs bg-accent px-6 py-3 font-semibold text-accent-foreground"
        >
          {session ? "Back to cards" : "Choose cards"}
        </Link>
        <HomeLink center />
      </div>
    );
  }

  const stats = summarize(session);
  const pile = missedCount(progress, excluded);
  const pct = stats.answered ? Math.round((100 * stats.right) / stats.answered) : 0;

  return (
    <div className="flex flex-1 flex-col gap-6 py-4">
      <header>
        <HomeLink />
        <h1 className="text-3xl font-bold">{session.endedEarly ? "Session ended" : "Session complete"}</h1>
        <p className="mt-1 text-muted-foreground">
          {stats.answered} of {stats.total} cards answered
          {session.mode === "review" && " · review"}
          {session.mode === "history" && " · from history"}
        </p>
        {stats.excluded > 0 && (
          <p className="text-sm text-muted-foreground">
            {stats.excluded} {stats.excluded === 1 ? "word" : "words"} excluded as known
          </p>
        )}
      </header>

      <dl className="grid grid-cols-3 gap-3 text-center">
        <Stat label="Got it" value={stats.right} className="text-good" />
        <Stat label="Missed" value={stats.wrong} className="text-bad" />
        <Stat label="Score" value={`${pct}%`} />
      </dl>

      {stats.wrongIds.length > 0 && (
        <section aria-labelledby="missed-heading" className="flex min-h-0 flex-col gap-2">
          <h2 id="missed-heading" className="font-semibold">
            Missed this session
          </h2>
          <Suspense fallback={<Loading />}>
            <MissedList session={session} ids={stats.wrongIds} />
          </Suspense>
        </section>
      )}

      <div className="mt-auto flex flex-col gap-3">
        <button
          type="button"
          disabled={pile === 0}
          onClick={() => {
            startReviewSession(progress, excluded);
            router.push("/study");
          }}
          className="rounded-xs bg-accent py-4 text-lg font-semibold text-accent-foreground disabled:opacity-40"
        >
          Practice missed ({pile})
        </button>
        <Link href="/quiz" className="rounded-xs border-2 border-foreground py-3.5 text-center font-semibold">
          New session
        </Link>
      </div>
    </div>
  );
}

function Stat({ label, value, className = "" }: { label: string; value: string | number; className?: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-3">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className={`text-2xl font-bold ${className}`}>{value}</dd>
    </div>
  );
}

function MissedList({ session, ids }: { session: Session; ids: string[] }) {
  const levels = LEVELS.filter((l) => session.cards.some((c) => c.level === l));
  const words = use(loadWords(levels));
  return (
    <ul className="divide-y divide-border overflow-y-auto rounded-2xl border border-border bg-card">
      {ids.map((id) => {
        const w = words.get(id);
        if (!w) return null;
        return (
          <li key={id} className="flex items-baseline gap-3 px-4 py-2.5">
            <span lang="ja" className="text-lg font-medium">
              {w.expression}
            </span>
            {w.reading !== w.expression && (
              <span lang="ja" className="text-sm text-muted-foreground">
                {w.reading}
              </span>
            )}
            <span className="ml-auto truncate text-sm">{w.meanings[0]}</span>
          </li>
        );
      })}
    </ul>
  );
}
