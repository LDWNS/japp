import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "About · J-app" };

export default function Page() {
  return (
    <article className="flex flex-1 flex-col gap-5 py-4">
      <h1 className="text-3xl font-bold">About &amp; credits</h1>
      <p>
        Tap a card to reveal the answer, then swipe right if you knew it or left if you
        didn&apos;t. Missed cards go to a review pile and leave it after two correct answers in a
        row.
      </p>
      <section className="flex flex-col gap-2">
        <h2 className="font-semibold">Word lists</h2>
        <p className="text-sm text-muted-foreground">
          JLPT N5–N2 vocabulary from{" "}
          <a className="underline" href="https://github.com/jamsinclair/open-anki-jlpt-decks">
            open-anki-jlpt-decks
          </a>{" "}
          (MIT), based on the lists by Jonathan Waller at{" "}
          <a className="underline" href="http://www.tanos.co.uk/jlpt/">
            tanos.co.uk
          </a>{" "}
          (CC BY). Level assignments are estimates; there is no official JLPT vocabulary list.
        </p>
      </section>
      <section className="flex flex-col gap-2">
        <h2 className="font-semibold">Example sentences</h2>
        <p className="text-sm text-muted-foreground">
          From{" "}
          <a className="underline" href="https://tatoeba.org">
            Tatoeba
          </a>
          , licensed{" "}
          <a className="underline" href="https://creativecommons.org/licenses/by/2.0/fr/">
            CC BY 2.0 FR
          </a>
          .
        </p>
      </section>
      <Link href="/" className="mt-auto rounded-full border-2 border-foreground py-3.5 text-center font-semibold">
        Back
      </Link>
    </article>
  );
}
