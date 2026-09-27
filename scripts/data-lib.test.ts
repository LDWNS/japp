import { describe, expect, it } from "vitest";
import {
  addToIndex,
  dedupeByEasiest,
  emptyIndex,
  expressionVariants,
  findCandidates,
  parseCsv,
  parseDeckCsv,
  parseIndexLine,
  pickExample,
  splitMeanings,
  toWord,
  type RawWord,
} from "./data-lib";

const raw = (over: Partial<RawWord>): RawWord => ({
  guid: "g",
  level: "N5",
  expression: "水",
  reading: "みず",
  meaning: "water",
  ...over,
});

describe("parseCsv", () => {
  it("handles quoted fields, escaped quotes and CRLF", () => {
    expect(parseCsv('a,b\r\n"x, y","say ""hi"""\n')).toEqual([
      ["a", "b"],
      ["x, y", 'say "hi"'],
    ]);
  });

  it("keeps a final row without trailing newline", () => {
    expect(parseCsv("a,b\n1,2")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });
});

describe("splitMeanings", () => {
  it("splits on top-level commas only", () => {
    expect(splitMeanings("to mind, to care (about, for), concerned")).toEqual([
      "to mind",
      "to care (about, for)",
      "concerned",
    ]);
  });

  it("also splits on semicolons", () => {
    expect(splitMeanings("this person; this direction, this side")).toEqual([
      "this person",
      "this direction",
      "this side",
    ]);
  });

  it("drops empty parts", () => {
    expect(splitMeanings("water, ,")).toEqual(["water"]);
  });
});

describe("expressionVariants", () => {
  it("splits alternatives and strips leading ～", () => {
    expect(expressionVariants("堅; 硬; 固い")).toEqual(["堅", "硬", "固い"]);
    expect(expressionVariants("～ころ; ～ごろ")).toEqual(["ころ", "ごろ"]);
  });
});

describe("parseIndexLine", () => {
  it("parses headword, reading, sense, surface and good marker", () => {
    expect(parseIndexLine("為る(する)[01]{した}~ 直ぐに{すぐに} は")).toEqual([
      { headword: "為る", reading: "する", surface: "した", good: true },
      { headword: "直ぐに", reading: undefined, surface: "すぐに", good: false },
      { headword: "は", reading: undefined, surface: undefined, good: false },
    ]);
  });
});

describe("pickExample", () => {
  it("returns null without candidates", () => {
    expect(pickExample([])).toBeNull();
  });

  it("prefers verified examples over shorter unverified ones", () => {
    expect(
      pickExample([
        { ja: "水をください。", en: "Water please.", good: false },
        { ja: "水は冷たいです。", en: "The water is cold.", good: true },
      ]),
    ).toEqual({ ja: "水は冷たいです。", en: "The water is cold." });
  });

  it("prefers comfortable length over very short", () => {
    expect(
      pickExample([
        { ja: "水。", en: "Water.", good: false },
        { ja: "水を飲みました。", en: "I drank water.", good: false },
      ])?.ja,
    ).toBe("水を飲みました。");
  });
});

describe("parseDeckCsv", () => {
  const csv =
    'expression,reading,meaning,tags,guid\n水,みず,water,JLPT,a1\nかまう,,"to mind, to care",JLPT,b2\n';

  it("maps columns and falls back to expression for blank readings", () => {
    expect(parseDeckCsv(csv, "N4")).toEqual([
      { guid: "a1", level: "N4", expression: "水", reading: "みず", meaning: "water" },
      { guid: "b2", level: "N4", expression: "かまう", reading: "かまう", meaning: "to mind, to care" },
    ]);
  });

  it("throws on missing columns", () => {
    expect(() => parseDeckCsv("expression,reading\n", "N5")).toThrow(/missing column/);
  });
});

describe("dedupeByEasiest", () => {
  it("keeps the easiest level for duplicates", () => {
    const out = dedupeByEasiest(
      [raw({ guid: "hard", level: "N3" }), raw({ guid: "easy", level: "N5" })],
      ["N5", "N4", "N3", "N2"],
    );
    expect(out).toHaveLength(1);
    expect(out[0].guid).toBe("easy");
  });

  it("keeps same expression with different readings", () => {
    const out = dedupeByEasiest(
      [raw({ reading: "みず" }), raw({ reading: "すい" })],
      ["N5", "N4", "N3", "N2"],
    );
    expect(out).toHaveLength(2);
  });
});

describe("findCandidates", () => {
  const index = emptyIndex();
  addToIndex(index, parseIndexLine("水 を 飲む{飲んだ}"), "水を飲んだ。", "I drank water.");
  addToIndex(index, parseIndexLine("為る(する){した}"), "した。", "Did it.");
  addToIndex(index, parseIndexLine("生(なま){生}"), "生だ。", "It's raw.");
  addToIndex(index, parseIndexLine("生(せい){生}"), "生の意味。", "Meaning of life.");

  it("matches kanji headwords", () => {
    expect(findCandidates(raw({}), index).map((c) => c.ja)).toEqual(["水を飲んだ。"]);
  });

  it("disambiguates kanji headwords by reading", () => {
    expect(
      findCandidates(raw({ expression: "生", reading: "なま" }), index).map((c) => c.ja),
    ).toEqual(["生だ。"]);
  });

  it("matches kana words via readings", () => {
    expect(
      findCandidates(raw({ expression: "する", reading: "する" }), index).map((c) => c.ja),
    ).toEqual(["した。"]);
  });

  it("returns nothing for unknown words", () => {
    expect(findCandidates(raw({ expression: "猫", reading: "ねこ" }), index)).toEqual([]);
  });
});

describe("toWord", () => {
  it("uses guid as id and splits meanings", () => {
    expect(toWord(raw({ meaning: "water, fluid" }), null)).toEqual({
      id: "g",
      level: "N5",
      expression: "水",
      reading: "みず",
      meanings: ["water", "fluid"],
      example: null,
    });
  });
});
