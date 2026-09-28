import { BASE_PATH } from "./basePath";
import { LEVELS, WordListSchema, type Level, type Word } from "./types";

const levelCache = new Map<Level, Promise<Word[]>>();
const setCache = new Map<string, Promise<Map<string, Word>>>();

export const dataUrl = (level: Level) => `${BASE_PATH}/data/${level.toLowerCase()}.json`;

function loadLevel(level: Level): Promise<Word[]> {
  let p = levelCache.get(level);
  if (!p) {
    p = fetch(dataUrl(level))
      .then((res) => {
        if (!res.ok) throw new Error(`Could not load ${level} word list (${res.status})`);
        return res.json();
      })
      .then((json) => WordListSchema.parse(json));
    // allow a retry after a failure (e.g. offline before first caching)
    p.catch(() => levelCache.delete(level));
    levelCache.set(level, p);
  }
  return p;
}

/**
 * Stable promise per level set, suitable for React's use().
 * Resolves to id → Word for the given levels.
 */
export function loadWords(levels: readonly Level[]): Promise<Map<string, Word>> {
  const sorted = LEVELS.filter((l) => levels.includes(l));
  const key = sorted.join(",");
  let p = setCache.get(key);
  if (!p) {
    p = Promise.all(sorted.map(loadLevel)).then(
      (lists) => new Map(lists.flat().map((w) => [w.id, w])),
    );
    p.catch(() => setCache.delete(key));
    setCache.set(key, p);
  }
  return p;
}

/** Tests only. */
export function clearDataCache() {
  levelCache.clear();
  setCache.clear();
}
