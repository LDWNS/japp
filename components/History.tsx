"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Suspense, use, useState } from "react";
import { startHistorySession } from "@/lib/actions";
import { loadWords } from "@/lib/data";
import { combineCards, dayKey, groupByDay, type Pick, type QuizRecord } from "@/lib/history";
import { useStore } from "@/lib/store";
import { LEVELS } from "@/lib/types";
import { HomeLink } from "./HomeLink";
import { Loading } from "./Loading";

const MODE_LABEL: Record<QuizRecord["mode"], string> = {
  normal: "Quiz",
  review: "Missed review",
  history: "History review",
  level: "Level",
};

function dayLabel(day: string, now = new Date()) {
  if (day === dayKey(now.toISOString())) return "Today";
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (day === dayKey(yesterday.toISOString())) return "Yesterday";
  const [y, m, d] = day.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: y === now.getFullYear() ? undefined : "numeric",
  });
}

const timeLabel = (iso: string) =>
  new Date(iso).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });

export function History() {
  const store = useStore();
  const router = useRouter();
  /** history index → which cards of that quiz to replay */
  const [picked, setPicked] = useState<Map<number, Pick>>(new Map());

  if (!store) return <Loading />;
  const { history, settings } = store;

  if (history.length === 0) {
    return (
      <div className="flex flex-1 flex-col gap-8 py-4">
        <header>
          <HomeLink />
          <h1 className="text-3xl font-bold">History</h1>
        </header>
        <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
          <p>No finished quizzes yet.</p>
          <Link href="/quiz" className="rounded-xs bg-accent px-6 py-3 font-semibold text-accent-foreground">
            Start quiz
          </Link>
        </div>
      </div>
    );
  }

  const picks = history.flatMap((record, index) => {
    const pick = picked.get(index);
    return pick ? [{ record, pick }] : [];
  });
  const cardCount = combineCards(picks, settings.excluded).length;

  const update = (change: (next: Map<number, Pick>) => void) =>
    setPicked((prev) => {
      const next = new Map(prev);
      change(next);
      return next;
    });
  const toggle = (index: number) => update((next) => (next.has(index) ? next.delete(index) : next.set(index, "all")));
  const toggleDay = (indexes: number[], on: boolean) =>
    update((next) => {
      for (const i of indexes) {
        if (!on) next.delete(i);
        else if (!next.has(i)) next.set(i, "all");
      }
    });

  const start = () => {
    if (startHistorySession(picks, settings.excluded) > 0) router.push("/study");
  };

  return (
    <div className="flex flex-1 flex-col gap-6 py-4">
      <header>
        <HomeLink />
        <h1 className="text-3xl font-bold">History</h1>
        <p className="mt-1 text-muted-foreground">Pick quizzes to practice again</p>
      </header>

      {groupByDay(history).map(({ day, records }) => {
        const indexes = records.map((r) => r.index);
        const allOn = indexes.every((i) => picked.has(i));
        const label = dayLabel(day);
        return (
          <section key={day} aria-label={label} className="flex flex-col gap-2">
            <div className="flex items-baseline justify-between">
              <h2 className="font-semibold">{label}</h2>
              <button
                type="button"
                onClick={() => toggleDay(indexes, !allOn)}
                className="rounded-xs px-2 py-1 text-sm text-muted-foreground hover:bg-muted"
              >
                {allOn ? "Deselect day" : "Select day"}
              </button>
            </div>
            <ul className="flex flex-col gap-2">
              {records.map(({ index, record }) => (
                <QuizRow
                  key={index}
                  record={record}
                  pick={picked.get(index) ?? null}
                  onToggle={() => toggle(index)}
                  onPick={(pick) => update((next) => next.set(index, pick))}
                />
              ))}
            </ul>
          </section>
        );
      })}

      <div className="sticky bottom-0 mt-auto flex flex-col gap-2 bg-background pt-2 pb-4">
        {picks.length > 0 && cardCount === 0 && (
          <p className="text-sm text-muted-foreground">Every picked word is excluded.</p>
        )}
        <button
          type="button"
          disabled={cardCount === 0}
          onClick={start}
          className="rounded-xs bg-accent py-4 text-lg font-semibold text-accent-foreground disabled:opacity-40"
        >
          Practice selected ({cardCount})
        </button>
      </div>
    </div>
  );
}

function QuizRow({
  record,
  pick,
  onToggle,
  onPick,
}: {
  record: QuizRecord;
  pick: Pick | null;
  onToggle: () => void;
  onPick: (pick: Pick) => void;
}) {
  const [showWords, setShowWords] = useState(false);
  const total = record.cards.length;
  const missed = record.wrongIds.length;
  const pct = Math.round((100 * (total - missed)) / total);
  const title = `${MODE_LABEL[record.mode]} at ${timeLabel(record.finishedAt)}`;

  return (
    <li
      className={`rounded-2xl border-2 bg-card p-3 transition ${pick ? "border-accent" : "border-border"}`}
    >
      <label className="flex cursor-pointer items-center gap-3">
        <input type="checkbox" checked={pick !== null} onChange={onToggle} className="size-5 accent-accent" />
        <span className="flex-1">
          <span className="block font-medium">{title}</span>
          <span className="block text-sm text-muted-foreground">
            {total} {total === 1 ? "card" : "cards"} · <span className="text-bad">{missed} missed</span> · {pct}%
            {record.endedEarly && " · ended early"}
          </span>
        </span>
      </label>

      {pick && (
        <div role="radiogroup" aria-label={`Cards from ${title}`} className="mt-3 grid grid-cols-2 gap-2">
          {(["all", "missed"] as const).map((p) => (
            <button
              key={p}
              type="button"
              role="radio"
              aria-checked={pick === p}
              disabled={p === "missed" && missed === 0}
              onClick={() => onPick(p)}
              className={`rounded-xl border-2 py-2 text-sm font-semibold transition disabled:opacity-40 ${
                pick === p ? "border-foreground bg-foreground text-background" : "border-border"
              }`}
            >
              {p === "all" ? `Full quiz (${total})` : `Missed only (${missed})`}
            </button>
          ))}
        </div>
      )}

      <button
        type="button"
        aria-expanded={showWords}
        onClick={() => setShowWords((s) => !s)}
        className="mt-2 rounded-xs px-2 py-1 text-sm text-muted-foreground hover:bg-muted"
      >
        {showWords ? "Hide words" : "Show words"}
      </button>
      {showWords && (
        <Suspense fallback={<Loading />}>
          <RecordWords record={record} />
        </Suspense>
      )}
    </li>
  );
}

function RecordWords({ record }: { record: QuizRecord }) {
  const levels = LEVELS.filter((l) => record.cards.some((c) => c.level === l));
  const words = use(loadWords(levels));
  const wrong = new Set(record.wrongIds);
  return (
    <ul className="mt-2 divide-y divide-border rounded-xl border border-border">
      {record.cards.map(({ id }) => {
        const w = words.get(id);
        if (!w) return null;
        const missed = wrong.has(id);
        return (
          <li key={id} className="flex items-baseline gap-3 px-3 py-2">
            <span aria-label={missed ? "missed" : "got it"} className={missed ? "text-bad" : "text-good"}>
              {missed ? "✗" : "✓"}
            </span>
            <span lang="ja" className="font-medium">
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
