import { describe, expect, it, vi } from "vitest";
import { initialStudyState, studyReducer } from "./session";
import { defaultStored, load, save, STORAGE_KEY, type Stored } from "./storage";

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
    const value: Stored = { study, settings: { levels: ["N5", "N3"], count: "all" } };
    save(value);
    expect(load()).toEqual(value);
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
