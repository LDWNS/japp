"use client";

import Link from "next/link";
import { ROMAJI_MODES, type RomajiMode } from "@/lib/storage";
import { updateSettings, useStore } from "@/lib/store";
import { Loading } from "./Loading";

const ROMAJI_LABELS: Record<RomajiMode, string> = {
  off: "Off",
  front: "Front of card",
  back: "Back of card",
  both: "Front and back",
};

export function Settings() {
  const store = useStore();

  if (!store) return <Loading />;
  const { settings } = store;
  const excluded = settings.excluded.length;

  return (
    <div className="flex flex-1 flex-col gap-8 py-4">
      <header>
        <h1 className="text-3xl font-bold">Settings</h1>
      </header>

      <section aria-labelledby="display-heading" className="flex flex-col gap-3">
        <h2 id="display-heading" className="font-semibold">
          Display
        </h2>
        <div className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-card px-4 py-3">
          <div>
            <p id="furigana-label" className="font-medium">
              Furigana
            </p>
            <p className="text-sm text-muted-foreground">Reading above kanji on the front of the card</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={settings.furigana}
            aria-labelledby="furigana-label"
            onClick={() => updateSettings({ ...settings, furigana: !settings.furigana })}
            className={`relative h-7 w-12 shrink-0 rounded-full transition ${
              settings.furigana ? "bg-accent" : "bg-muted"
            }`}
          >
            <span
              aria-hidden
              className={`absolute top-1 left-1 size-5 rounded-full bg-card shadow transition-transform ${
                settings.furigana ? "translate-x-5" : ""
              }`}
            />
          </button>
        </div>
        <div className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-card px-4 py-3">
          <div>
            <label htmlFor="romaji" className="font-medium">
              Romaji
            </label>
            <p className="text-sm text-muted-foreground">Latin spelling of the reading</p>
          </div>
          <select
            id="romaji"
            value={settings.romaji}
            onChange={(e) => updateSettings({ ...settings, romaji: e.target.value as RomajiMode })}
            className="rounded-xl border-2 border-border bg-card px-3 py-2 outline-none focus:border-foreground"
          >
            {ROMAJI_MODES.map((mode) => (
              <option key={mode} value={mode}>
                {ROMAJI_LABELS[mode]}
              </option>
            ))}
          </select>
        </div>
      </section>

      <section aria-labelledby="excluded-heading" className="flex flex-col gap-3">
        <h2 id="excluded-heading" className="font-semibold">
          Excluded words
        </h2>
        <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card px-4 py-3">
          <p className="text-sm text-muted-foreground">
            {excluded === 0
              ? "No words excluded. Untick words in the word lists to leave them out of quizzes and review."
              : `${excluded} ${excluded === 1 ? "word is" : "words are"} left out of quizzes and review.`}
          </p>
          <div className="flex gap-2">
            <Link href="/words" className="flex-1 rounded-full border-2 border-foreground py-2.5 text-center font-semibold">
              Edit in word lists
            </Link>
            <button
              type="button"
              disabled={excluded === 0}
              onClick={() => updateSettings({ ...settings, excluded: [] })}
              className="flex-1 rounded-full border-2 border-border py-2.5 font-semibold transition disabled:text-muted-foreground disabled:opacity-60"
            >
              Include all
            </button>
          </div>
        </div>
      </section>

      <Link href="/" className="mt-auto rounded-full border-2 border-foreground py-3.5 text-center font-semibold">
        Back
      </Link>
    </div>
  );
}
