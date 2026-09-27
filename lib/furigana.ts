import { toHiragana } from "./romaji";

/** One piece of an expression; `ruby` is the reading shown above kanji. */
export type Segment = { text: string; ruby?: string };

const KANJI = "\\u3400-\\u4dbf\\u4e00-\\u9fff\\uf900-\\ufaff\\u3005"; // CJK ideographs + 々
const KANJI_RE = new RegExp(`[${KANJI}]`);
const RUNS_RE = new RegExp(`[${KANJI}]+|[^${KANJI}]+`, "g");
export const hasKanji = (s: string) => KANJI_RE.test(s);

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
/** Compare kana runs loosely: katakana = hiragana, either wave dash, any spacing. */
const normalize = (s: string) => toHiragana(s).replace(/～/g, "〜").replace(/\s+/g, "");

/**
 * Split an expression into kanji runs carrying their reading and plain runs,
 * by matching the kana around the kanji against the reading (食べる / たべる →
 * 食[た] べる). Falls back to one ruby over the whole word when they don't line up.
 */
export function furigana(expression: string, reading: string): Segment[] {
  if (!hasKanji(expression)) return [{ text: expression }];
  // readings sometimes carry usage hints like "(〜を) とお" that the expression lacks
  const cleaned = expression.includes("(") ? reading : reading.replace(/\([^)]*\)/g, "");

  const runs = [...expression.matchAll(RUNS_RE)].map(([text]) => ({ text, kanji: hasKanji(text) }));
  const pattern = runs.map((r) => (r.kanji ? "(.+?)" : escape(normalize(r.text)))).join("");
  const match = new RegExp(`^${pattern}$`).exec(normalize(cleaned));
  if (!match) return [{ text: expression, ruby: cleaned.trim() }];

  let group = 1;
  return runs.map((r) => (r.kanji ? { text: r.text, ruby: match[group++] } : { text: r.text }));
}
