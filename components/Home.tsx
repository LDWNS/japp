"use client";

import Link from "next/link";
import { isDone } from "@/lib/session";
import { useStore } from "@/lib/store";
import { Loading } from "./Loading";

export function Home() {
  const store = useStore();

  if (!store) return <Loading />;
  const { session } = store.study;
  const resumable = session && !isDone(session) ? session : null;

  return (
    <div className="flex flex-1 flex-col gap-8 py-4">
      <header>
        <h1 className="text-3xl font-bold">
          J-app <span lang="ja" className="text-accent">単語</span>
        </h1>
        <p className="mt-1 text-muted-foreground">JLPT vocabulary flashcards</p>
      </header>

      <nav aria-label="Main" className="flex flex-col gap-3">
        {resumable && (
          <Link
            href="/study"
            className="rounded-xs border-2 border-foreground py-3.5 text-center font-semibold"
          >
            Resume session ({resumable.index}/{resumable.cards.length})
          </Link>
        )}
        <Link
          href="/quiz"
          className="rounded-xs bg-accent py-4 text-center text-lg font-semibold text-accent-foreground"
        >
          Start quiz
        </Link>
        <Link
          href="/levels"
          className="rounded-xs border-2 border-foreground py-3.5 text-center font-semibold"
        >
          Levels
        </Link>
        <Link
          href="/history"
          className="rounded-xs border-2 border-foreground py-3.5 text-center font-semibold"
        >
          History
        </Link>
        <Link
          href="/words"
          className="rounded-xs border-2 border-foreground py-3.5 text-center font-semibold"
        >
          Word lists
        </Link>
        <Link
          href="/settings"
          className="rounded-xs border-2 border-foreground py-3.5 text-center font-semibold"
        >
          Settings
        </Link>
      </nav>

      <Link href="/about" className="mt-auto py-2 text-center text-sm text-muted-foreground underline">
        About &amp; credits
      </Link>
    </div>
  );
}
