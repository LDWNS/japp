/** Katakana → hiragana, so one table covers both scripts. */
export const toHiragana = (s: string) =>
  s.replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60));

const BASE: Record<string, string> = {
  あ: "a", い: "i", う: "u", え: "e", お: "o",
  か: "ka", き: "ki", く: "ku", け: "ke", こ: "ko",
  が: "ga", ぎ: "gi", ぐ: "gu", げ: "ge", ご: "go",
  さ: "sa", し: "shi", す: "su", せ: "se", そ: "so",
  ざ: "za", じ: "ji", ず: "zu", ぜ: "ze", ぞ: "zo",
  た: "ta", ち: "chi", つ: "tsu", て: "te", と: "to",
  だ: "da", ぢ: "ji", づ: "zu", で: "de", ど: "do",
  な: "na", に: "ni", ぬ: "nu", ね: "ne", の: "no",
  は: "ha", ひ: "hi", ふ: "fu", へ: "he", ほ: "ho",
  ば: "ba", び: "bi", ぶ: "bu", べ: "be", ぼ: "bo",
  ぱ: "pa", ぴ: "pi", ぷ: "pu", ぺ: "pe", ぽ: "po",
  ま: "ma", み: "mi", む: "mu", め: "me", も: "mo",
  や: "ya", ゆ: "yu", よ: "yo",
  ら: "ra", り: "ri", る: "ru", れ: "re", ろ: "ro",
  わ: "wa", ゐ: "i", ゑ: "e", を: "o", ん: "n",
  ゔ: "vu",
  ぁ: "a", ぃ: "i", ぅ: "u", ぇ: "e", ぉ: "o",
  ゃ: "ya", ゅ: "yu", ょ: "yo", ゎ: "wa",
  "〜": "~", "～": "~", "、": ", ", "。": ".", "・": " ",
};

/** Small ya/yu/yo after an i-row kana: き+ゃ → kya, し+ゃ → sha. */
const YOON: Record<string, string> = { ゃ: "a", ゅ: "u", ょ: "o" };
/** Small vowels after a kana, mostly in katakana loanwords: フ+ァ → fa, テ+ィ → ti. */
const SMALL_VOWEL: Record<string, string> = { ぁ: "a", ぃ: "i", ぅ: "u", ぇ: "e", ぉ: "o" };

/** Hepburn romaji (no macrons: とうきょう → toukyou). Non-kana passes through. */
export function toRomaji(kana: string): string {
  const s = toHiragana(kana);
  let out = "";
  let geminate = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    const next = s[i + 1];
    if (c === "っ") {
      geminate = true;
      continue;
    }
    if (c === "ー") {
      // long vowel mark repeats the previous vowel
      const last = out.at(-1);
      if (last && "aeiou".includes(last)) out += last;
      continue;
    }
    let syl = BASE[c];
    if (syl === undefined) {
      out += c;
      geminate = false;
      continue;
    }
    if (next && YOON[next] && syl.length > 1 && syl.endsWith("i")) {
      const stem = syl.slice(0, -1);
      // shi/chi/ji drop the y: sha, cha, ja
      syl = (/^(sh|ch|j)$/.test(stem) ? stem : stem + "y") + YOON[next];
      i++;
    } else if (next && SMALL_VOWEL[next] && syl.length > 1) {
      syl = syl.slice(0, -1) + SMALL_VOWEL[next];
      i++;
    }
    if (c === "ん" && next && /^[aiueoy]/.test(BASE[next] ?? "")) syl = "n'";
    if (geminate) {
      syl = (syl.startsWith("ch") ? "t" : syl[0]) + syl;
      geminate = false;
    }
    out += syl;
  }
  return out;
}
