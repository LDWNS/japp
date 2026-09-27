/**
 * Builds public/data/{n5..n2}.json from:
 *  - JLPT vocab decks (jamsinclair/open-anki-jlpt-decks, MIT, based on tanos.co.uk lists)
 *  - Tatoeba example sentences + jpn_indices (CC-BY 2.0 FR)
 *
 * Run: pnpm data:build   (downloads into .data-cache/, needs curl, tar, bunzip2)
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { LEVELS, WordListSchema, type Level, type Word } from "../lib/types";
import {
  addToIndex,
  dedupeByEasiest,
  emptyIndex,
  findCandidates,
  parseDeckCsv,
  parseIndexLine,
  pickExample,
  toWord,
} from "./data-lib";

const ROOT = join(__dirname, "..");
const CACHE = join(ROOT, ".data-cache");
const OUT = join(ROOT, "public", "data");

const DECK_URL = (n: string) =>
  `https://raw.githubusercontent.com/jamsinclair/open-anki-jlpt-decks/main/src/${n}.csv`;
const TATOEBA = {
  indices: "https://downloads.tatoeba.org/exports/jpn_indices.tar.bz2",
  jpn: "https://downloads.tatoeba.org/exports/per_language/jpn/jpn_sentences.tsv.bz2",
  eng: "https://downloads.tatoeba.org/exports/per_language/eng/eng_sentences.tsv.bz2",
};

function download(url: string, file: string) {
  const dest = join(CACHE, file);
  if (!existsSync(dest)) {
    console.log(`downloading ${url}`);
    execFileSync("curl", ["-sSfL", "-o", dest, url]);
  }
  return dest;
}

function readSentences(bz2: string): Map<string, string> {
  const tsv = bz2.replace(/\.bz2$/, "");
  if (!existsSync(tsv)) execFileSync("bunzip2", ["-k", bz2]);
  const map = new Map<string, string>();
  for (const line of readFileSync(tsv, "utf8").split("\n")) {
    const [id, , text] = line.split("\t");
    if (id && text) map.set(id, text);
  }
  return map;
}

function main() {
  mkdirSync(CACHE, { recursive: true });
  mkdirSync(OUT, { recursive: true });

  const raw = LEVELS.flatMap((level: Level) => {
    const file = download(DECK_URL(level.toLowerCase()), `${level.toLowerCase()}.csv`);
    return parseDeckCsv(readFileSync(file, "utf8"), level);
  });
  const words = dedupeByEasiest(raw, LEVELS);

  const indicesTar = download(TATOEBA.indices, "jpn_indices.tar.bz2");
  const indicesCsv = join(CACHE, "jpn_indices.csv");
  if (!existsSync(indicesCsv)) execFileSync("tar", ["xjf", indicesTar, "-C", CACHE]);
  const jpn = readSentences(download(TATOEBA.jpn, "jpn_sentences.tsv.bz2"));
  const eng = readSentences(download(TATOEBA.eng, "eng_sentences.tsv.bz2"));

  const index = emptyIndex();
  for (const line of readFileSync(indicesCsv, "utf8").split("\n")) {
    const [jaId, enId, bLine] = line.split("\t");
    const ja = jpn.get(jaId);
    const en = eng.get(enId);
    if (!ja || !en || !bLine) continue;
    addToIndex(index, parseIndexLine(bLine), ja, en);
  }

  const byLevel = new Map<Level, Word[]>(LEVELS.map((l) => [l, []]));
  for (const w of words) {
    byLevel.get(w.level)!.push(toWord(w, pickExample(findCandidates(w, index))));
  }

  for (const [level, list] of byLevel) {
    list.sort((a, b) => a.reading.localeCompare(b.reading, "ja"));
    const parsed = WordListSchema.parse(list);
    writeFileSync(join(OUT, `${level.toLowerCase()}.json`), JSON.stringify(parsed));
    const withExample = parsed.filter((w) => w.example).length;
    console.log(
      `${level}: ${parsed.length} words, ${withExample} with example (${Math.round(
        (100 * withExample) / parsed.length,
      )}%)`,
    );
  }
}

main();
