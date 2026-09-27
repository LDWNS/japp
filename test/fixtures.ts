import { vi } from "vitest";
import { clearDataCache } from "@/lib/data";
import { resetStore } from "@/lib/store";
import type { Level, Word } from "@/lib/types";

export const makeWord = (over: Partial<Word> = {}): Word => ({
  id: "w1",
  level: "N5",
  expression: "水",
  reading: "みず",
  meanings: ["water", "fluid"],
  example: { ja: "水を飲みます。", en: "I drink water." },
  ...over,
});

export const fixtureWords: Record<Level, Word[]> = {
  N5: [
    makeWord({ id: "a", expression: "水", reading: "みず", meanings: ["water"] }),
    makeWord({ id: "b", expression: "山", reading: "やま", meanings: ["mountain"] }),
    makeWord({ id: "c", expression: "これ", reading: "これ", meanings: ["this"], example: null }),
  ],
  N4: [makeWord({ id: "d", level: "N4", expression: "運転", reading: "うんてん", meanings: ["driving"] })],
  N3: [],
  N2: [],
};

/** Serve fixture word lists from fetch("/data/nX.json"). */
export function mockWordFetch() {
  const fetchMock = vi.fn(async (url: string) => {
    const level = /\/data\/(n\d)\.json$/.exec(url)?.[1]?.toUpperCase() as Level | undefined;
    if (!level) return new Response("not found", { status: 404 });
    return new Response(JSON.stringify(fixtureWords[level]), { status: 200 });
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

export function resetApp() {
  localStorage.clear();
  resetStore();
  clearDataCache();
}

/** Render and let suspended data (use() on word lists) resolve inside act. */
export async function renderAsync(ui: React.ReactElement) {
  const { act, render } = await import("@testing-library/react");
  let result!: ReturnType<typeof render>;
  await act(async () => {
    result = render(ui);
  });
  return result;
}
