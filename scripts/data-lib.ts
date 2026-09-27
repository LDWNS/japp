import type { Example, Level, Word } from "../lib/types";

/** Minimal RFC 4180 CSV parser (quoted fields, escaped quotes, CRLF). */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += c;
    }
  }
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

/** Split on commas/semicolons that are not inside parentheses. */
export function splitMeanings(meaning: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let current = "";
  for (const c of meaning) {
    if (c === "(" || c === "（") depth++;
    if (c === ")" || c === "）") depth = Math.max(0, depth - 1);
    if ((c === "," || c === ";") && depth === 0) {
      parts.push(current);
      current = "";
    } else {
      current += c;
    }
  }
  parts.push(current);
  return parts.map((p) => p.trim()).filter((p) => p.length > 0);
}

/** Variants to look up in the sentence index: "堅; 硬; 固い" → each, with leading ～ stripped. */
export function expressionVariants(expression: string): string[] {
  return expression
    .split(/[;；]/)
    .map((v) => v.trim().replace(/^[～~]/, ""))
    .filter((v) => v.length > 0);
}

export type IndexToken = {
  headword: string;
  reading?: string;
  surface?: string;
  good: boolean;
};

const TOKEN_RE = /^([^([{~]+)(?:\(([^)]+)\))?(?:\[\d+\])?(?:\{([^}]+)\})?(~)?$/;

/** Parse a Tatoeba jpn_indices B-line, e.g. "直ぐに{すぐに} 戻る{戻ります}~". */
export function parseIndexLine(line: string): IndexToken[] {
  const tokens: IndexToken[] = [];
  for (const raw of line.trim().split(/\s+/)) {
    const m = TOKEN_RE.exec(raw);
    if (!m) continue;
    tokens.push({ headword: m[1], reading: m[2], surface: m[3], good: m[4] === "~" });
  }
  return tokens;
}

export type Candidate = { ja: string; en: string; good: boolean };

/** Prefer verified (~) examples, then sentences of comfortable length, then shorter. */
export function pickExample(candidates: Candidate[]): Example | null {
  if (candidates.length === 0) return null;
  const score = (c: Candidate) => {
    const len = [...c.ja].length;
    const comfortable = len >= 6 && len <= 25;
    return (c.good ? 0 : 2) + (comfortable ? 0 : 1);
  };
  const sorted = [...candidates].sort(
    (a, b) =>
      score(a) - score(b) ||
      [...a.ja].length - [...b.ja].length ||
      a.ja.localeCompare(b.ja),
  );
  return { ja: sorted[0].ja, en: sorted[0].en };
}

export type RawWord = {
  guid: string;
  level: Level;
  expression: string;
  reading: string;
  meaning: string;
};

export function parseDeckCsv(text: string, level: Level): RawWord[] {
  const [header, ...rows] = parseCsv(text);
  const col = (name: string) => {
    const idx = header.indexOf(name);
    if (idx < 0) throw new Error(`missing column ${name}`);
    return idx;
  };
  const [e, r, m, g] = [col("expression"), col("reading"), col("meaning"), col("guid")];
  return rows
    .filter((row) => row.length >= header.length && row[e].trim() !== "")
    .map((row) => ({
      guid: row[g],
      level,
      expression: row[e].trim(),
      // some kana-only entries leave the reading blank
      reading: row[r].trim() || row[e].trim(),
      meaning: row[m].trim(),
    }));
}

/** Levels ordered easiest first; a word listed in several levels keeps the easiest. */
export function dedupeByEasiest(words: RawWord[], order: readonly Level[]): RawWord[] {
  const rank = (l: Level) => order.indexOf(l);
  const byKey = new Map<string, RawWord>();
  for (const w of words) {
    const key = `${w.expression}\u0000${w.reading}`;
    const existing = byKey.get(key);
    if (!existing || rank(w.level) < rank(existing.level)) byKey.set(key, w);
  }
  return [...byKey.values()];
}

const KANJI_RE = /[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff々]/;
export const hasKanji = (s: string) => KANJI_RE.test(s);

export type SentenceIndex = {
  /** "headword" (no reading given) or "headword(reading)" */
  byHeadword: Map<string, Candidate[]>;
  /** kana forms: explicit readings and kana-only surfaces */
  byKana: Map<string, Candidate[]>;
};

export function emptyIndex(): SentenceIndex {
  return { byHeadword: new Map(), byKana: new Map() };
}

function push(map: Map<string, Candidate[]>, key: string, c: Candidate) {
  const list = map.get(key);
  if (list) list.push(c);
  else map.set(key, [c]);
}

export function addToIndex(index: SentenceIndex, tokens: IndexToken[], ja: string, en: string) {
  for (const t of tokens) {
    const c = { ja, en, good: t.good };
    if (t.reading) {
      push(index.byHeadword, `${t.headword}(${t.reading})`, c);
      push(index.byKana, t.reading, c);
    } else {
      push(index.byHeadword, t.headword, c);
      if (!hasKanji(t.headword)) push(index.byKana, t.headword, c);
    }
    if (t.surface && !hasKanji(t.surface)) push(index.byKana, t.surface, c);
  }
}

/** Look up example candidates: kanji words by headword (+reading), kana words by kana forms. */
export function findCandidates(word: RawWord, index: SentenceIndex): Candidate[] {
  const readings = expressionVariants(word.reading);
  const out: Candidate[] = [];
  const seen = new Set<string>();
  const add = (list: Candidate[] | undefined) => {
    for (const c of list ?? []) {
      if (seen.has(c.ja)) continue;
      seen.add(c.ja);
      out.push(c);
    }
  };
  for (const variant of expressionVariants(word.expression)) {
    if (hasKanji(variant)) {
      add(index.byHeadword.get(variant));
      for (const r of readings) add(index.byHeadword.get(`${variant}(${r})`));
    } else {
      add(index.byHeadword.get(variant));
      add(index.byKana.get(variant));
    }
  }
  return out;
}

export function toWord(raw: RawWord, example: Example | null): Word {
  return {
    id: raw.guid,
    level: raw.level,
    expression: raw.expression,
    reading: raw.reading,
    meanings: splitMeanings(raw.meaning),
    example,
  };
}
