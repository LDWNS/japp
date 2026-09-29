# J-app

Tinder-style JLPT vocabulary flashcards (N5–N2). Static Next.js export, works offline, state in localStorage.

- Welcome menu: start quiz, browse word lists (per level, searchable), settings (coming soon).
- Pick levels + card count → random deck. Tap to reveal, swipe right (got it) / left (missed).
- Levels: each JLPT list cut into levels of 10 words (size in settings), unlocked one by one.
  Every 5 levels a review of 20 words (mostly from those 5) must be cleared to go on; missed
  review cards come back at the end until answered right.
- Missed cards go to a review pile; they leave after 2 correct answers in a row (any session).
- Multi-step undo, end-of-session summary. Desktop: Space reveal, ←/→ grade, Backspace undo.

## Commands

```sh
pnpm dev          # dev server (service worker disabled)
pnpm build        # static export to out/
pnpm serve        # serve out/ on :3100
pnpm test         # vitest: logic, data integrity, components
pnpm test:e2e     # playwright (needs a build): mobile Chrome/Safari + desktop
pnpm check        # lint + typecheck + test + build + e2e
pnpm data:build   # regenerate public/data/*.json (downloads into .data-cache/)
```

## Data

`scripts/build-data.ts` merges JLPT lists from
[open-anki-jlpt-decks](https://github.com/jamsinclair/open-anki-jlpt-decks) (MIT, based on
[tanos.co.uk](http://www.tanos.co.uk/jlpt/), CC BY) with example sentences from
[Tatoeba](https://tatoeba.org) (CC BY 2.0 FR) via its `jpn_indices` headword index.
Output is committed. Example coverage: N5 96%, N4 96%, N3 93%, N2 78%.

## Deploy

Pushes to `main` deploy to GitHub Pages via `.github/workflows/deploy.yml` (lint, typecheck,
unit tests, then build). The workflow sets `PAGES_BASE_PATH` (e.g. `/japp`) so the export works
under the repo sub-path; unset locally. One-time setup: repo Settings → Pages → Source:
**GitHub Actions**.
