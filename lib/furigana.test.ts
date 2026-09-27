import { describe, expect, it } from "vitest";
import { furigana } from "./furigana";

describe("furigana", () => {
  it("leaves kana-only words alone", () => {
    expect(furigana("これ", "これ")).toEqual([{ text: "これ" }]);
  });

  it("puts the whole reading over an all-kanji word", () => {
    expect(furigana("学校", "がっこう")).toEqual([{ text: "学校", ruby: "がっこう" }]);
  });

  it("aligns kanji runs around okurigana and prefixes", () => {
    expect(furigana("食べる", "たべる")).toEqual([{ text: "食", ruby: "た" }, { text: "べる" }]);
    expect(furigana("お金", "おかね")).toEqual([{ text: "お" }, { text: "金", ruby: "かね" }]);
    expect(furigana("取り扱う", "とりあつかう")).toEqual([
      { text: "取", ruby: "と" },
      { text: "り" },
      { text: "扱", ruby: "あつか" },
      { text: "う" },
    ]);
  });

  it("matches katakana in the expression against a hiragana reading", () => {
    expect(furigana("ガス代", "がすだい")).toEqual([{ text: "ガス" }, { text: "代", ruby: "だい" }]);
  });

  it("handles wave dashes and drops usage hints the expression lacks", () => {
    expect(furigana("～円", "～えん")).toEqual([{ text: "～" }, { text: "円", ruby: "えん" }]);
    expect(furigana("十", "(〜を) とお")).toEqual([{ text: "十", ruby: "とお" }]);
  });

  it("falls back to one ruby when the kana don't line up", () => {
    expect(furigana("足; 脚", "あし")).toEqual([{ text: "足; 脚", ruby: "あし" }]);
  });
});
