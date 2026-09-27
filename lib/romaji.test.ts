import { describe, expect, it } from "vitest";
import { toHiragana, toRomaji } from "./romaji";

describe("toRomaji", () => {
  it.each([
    ["みず", "mizu"],
    ["しんぶん", "shinbun"],
    ["とうきょう", "toukyou"],
    ["しゃしん", "shashin"],
    ["ちょっと", "chotto"],
    ["まっちゃ", "matcha"],
    ["きっぷ", "kippu"],
    ["こんや", "kon'ya"],
    ["きんえん", "kin'en"],
    ["じゅぎょう", "jugyou"],
    ["ふじさん", "fujisan"],
    ["コーヒー", "koohii"],
    ["パーティー", "paatii"],
    ["ファイル", "fairu"],
    ["～えん", "~en"],
    ["(〜を) とお", "(~o) too"],
  ])("%s → %s", (kana, romaji) => {
    expect(toRomaji(kana)).toBe(romaji);
  });
});

describe("toHiragana", () => {
  it("converts katakana and leaves the rest", () => {
    expect(toHiragana("カタカナ ok ー")).toBe("かたかな ok ー");
  });
});
