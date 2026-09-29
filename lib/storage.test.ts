import { describe, expect, it, vi } from "vitest";
import { initialStudyState, studyReducer } from "./session";
import { defaultSettings, defaultStored, load, save, showsRomaji, STORAGE_KEY, type Stored } from "./storage";

describe("storage", () => {
  it("returns defaults when nothing is stored", () => {
    expect(load()).toEqual(defaultStored());
  });

  it("round-trips state", () => {
    let study = studyReducer(initialStudyState(), {
      type: "start",
      mode: "normal",
      cards: [{ id: "a", level: "N5" }],
    });
    study = studyReducer(study, { type: "flip" });
    study = studyReducer(study, { type: "answer", answer: "wrong" });
    const value: Stored = {
      study,
      settings: { levels: ["N5", "N3"], count: "all", furigana: true, romaji: "back", excluded: ["b"], levelSize: 20 },
      history: [
        { finishedAt: "2026-09-28T10:00:00.000Z", mode: "normal", cards: [{ id: "a", level: "N5" }], wrongIds: ["a"], endedEarly: false },
      ],
      levels: { "N5:20": [0, 1] },
    };
    save(value);
    expect(load()).toEqual(value);
  });

  it("keeps progress from data saved before display settings existed", () => {
    const study = studyReducer(initialStudyState(), { type: "start", mode: "normal", cards: [{ id: "a", level: "N5" }] });
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ study, settings: { levels: ["N4"], count: 50 } }));
    expect(load()).toEqual({ study, settings: { ...defaultSettings(), levels: ["N4"], count: 50 }, history: [], levels: {} });
  });

  it("rejects unknown romaji modes", () => {
    const bad = { ...defaultStored(), settings: { ...defaultSettings(), romaji: "sometimes" } };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bad));
    expect(load()).toEqual(defaultStored());
  });

  it("falls back to defaults on corrupt JSON", () => {
    localStorage.setItem(STORAGE_KEY, "{not json");
    expect(load()).toEqual(defaultStored());
  });

  it("falls back to defaults on schema mismatch", () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ study: { progress: 5 }, settings: {} }));
    expect(load()).toEqual(defaultStored());
  });

  it("rejects unknown levels and counts", () => {
    const bad = { ...defaultStored(), settings: { levels: ["N1"], count: 7 } };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bad));
    expect(load()).toEqual(defaultStored());
  });

  it("does not throw when storage is unavailable", () => {
    const spy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("QuotaExceededError");
    });
    expect(() => save(defaultStored())).not.toThrow();
    spy.mockRestore();
  });
});

describe("showsRomaji", () => {
  it.each([
    ["off", false, false],
    ["front", true, false],
    ["back", false, true],
    ["both", true, true],
  ] as const)("%s → front %s, back %s", (mode, front, back) => {
    expect(showsRomaji(mode, "front")).toBe(front);
    expect(showsRomaji(mode, "back")).toBe(back);
  });
});
