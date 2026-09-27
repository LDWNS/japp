"use client";

import Link from "next/link";
import { Suspense, use, useDeferredValue, useRef, useState, type KeyboardEvent } from "react";
import { loadWords } from "@/lib/data";
import { toggleExcluded, useStore } from "@/lib/store";
import { LEVELS, type Level, type Word } from "@/lib/types";
import { Loading } from "./Loading";

const matches = (w: Word, q: string) =>
  w.expression.includes(q) ||
  w.reading.includes(q) ||
  w.meanings.some((m) => m.toLowerCase().includes(q));

export function WordLists() {
  // null during prerender: word lists are fetched in the browser only
  const store = useStore();
  const [level, setLevel] = useState<Level>("N5");
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query.trim().toLowerCase());
  const tabs = useRef<Partial<Record<Level, HTMLButtonElement | null>>>({});

  // arrow keys move between tabs (WAI-ARIA tabs pattern)
  const onTabKey = (e: KeyboardEvent) => {
    const step = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    const next = LEVELS[(LEVELS.indexOf(level) + step + LEVELS.length) % LEVELS.length];
    setLevel(next);
    tabs.current[next]?.focus();
  };

  return (
    <div className="flex flex-1 flex-col gap-4 py-4">
      <header>
        <h1 className="text-3xl font-bold">Word lists</h1>
        <p className="mt-1 text-muted-foreground">Untick a word to leave it out of quizzes</p>
      </header>

      <div role="tablist" aria-label="Level" className="grid grid-cols-4 gap-2" onKeyDown={onTabKey}>
        {LEVELS.map((l) => {
          const on = l === level;
          return (
            <button
              key={l}
              ref={(el) => {
                tabs.current[l] = el;
              }}
              type="button"
              role="tab"
              id={`tab-${l}`}
              aria-selected={on}
              aria-controls="word-panel"
              tabIndex={on ? 0 : -1}
              onClick={() => setLevel(l)}
              className={`rounded-xl border-2 py-2.5 font-semibold transition ${
                on ? "border-accent bg-accent text-accent-foreground" : "border-border bg-card"
              }`}
            >
              {l}
            </button>
          );
        })}
      </div>

      <input
        type="search"
        aria-label="Search words"
        placeholder="Search kanji, kana or English"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="rounded-xl border-2 border-border bg-card px-4 py-2.5 outline-none focus:border-foreground"
      />

      <div role="tabpanel" id="word-panel" aria-labelledby={`tab-${level}`} className="flex min-h-0 flex-1 flex-col">
        {store ? (
          <Suspense fallback={<Loading />}>
            <WordList level={level} query={deferredQuery} excluded={store.settings.excluded} />
          </Suspense>
        ) : (
          <Loading />
        )}
      </div>

      <Link href="/" className="rounded-full border-2 border-foreground py-3.5 text-center font-semibold">
        Back
      </Link>
    </div>
  );
}

function WordList({ level, query, excluded }: { level: Level; query: string; excluded: readonly string[] }) {
  const words = [...use(loadWords([level])).values()];
  const shown = query ? words.filter((w) => matches(w, query)) : words;
  const off = new Set(excluded);
  const offHere = words.filter((w) => off.has(w.id)).length;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <p className="text-sm text-muted-foreground" aria-live="polite">
        {query ? `${shown.length} of ${words.length} words` : `${words.length} words`}
        {offHere > 0 && ` · ${offHere} excluded`}
      </p>
      {shown.length === 0 ? (
        <p className="py-6 text-center text-muted-foreground">No matches.</p>
      ) : (
        <ul className="divide-y divide-border rounded-2xl border border-border bg-card">
          {shown.map((w) => (
            // skip layout/paint for off-screen rows; lists run to ~2000 words
            <li key={w.id} className="px-4 py-2.5 [content-visibility:auto] [contain-intrinsic-size:auto_3.5rem]">
              <label className="flex cursor-pointer items-center gap-3">
                <span className={`flex min-w-0 flex-1 flex-col ${off.has(w.id) ? "opacity-40" : ""}`}>
                  <span className="flex items-baseline gap-3">
                    <span lang="ja" className="text-lg font-medium">
                      {w.expression}
                    </span>
                    {w.reading !== w.expression && (
                      <span lang="ja" className="text-sm text-muted-foreground">
                        {w.reading}
                      </span>
                    )}
                  </span>
                  <span className="text-sm">{w.meanings.join(", ")}</span>
                </span>
                {/* ticked = included in quizzes */}
                <input
                  type="checkbox"
                  checked={!off.has(w.id)}
                  onChange={() => toggleExcluded(w.id)}
                  aria-label={`Include ${w.expression} in quizzes`}
                  className="size-5 shrink-0 accent-accent"
                />
              </label>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
