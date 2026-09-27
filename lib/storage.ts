import { z } from "zod";
import { COUNT_OPTIONS, type DeckCount } from "./deck";
import { initialStudyState, StudyStateSchema, type StudyState } from "./session";
import { LEVELS, LevelSchema, type Level } from "./types";

export const STORAGE_KEY = "japp:v1";

export const SettingsSchema = z.object({
  levels: z.array(LevelSchema).min(1),
  count: z.union([z.literal(10), z.literal(20), z.literal(50), z.literal(100), z.literal("all")]),
});
export type Settings = { levels: Level[]; count: DeckCount };

export const defaultSettings = (): Settings => ({ levels: [LEVELS[0]], count: COUNT_OPTIONS[1] });

const StoredSchema = z.object({
  study: StudyStateSchema,
  settings: SettingsSchema,
});
export type Stored = { study: StudyState; settings: Settings };

export const defaultStored = (): Stored => ({ study: initialStudyState(), settings: defaultSettings() });

function storage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null; // access can throw when storage is blocked
  }
}

/** Missing, corrupt or outdated data falls back to defaults instead of crashing the app. */
export function load(): Stored {
  const raw = storage()?.getItem(STORAGE_KEY);
  if (!raw) return defaultStored();
  try {
    const parsed = StoredSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : defaultStored();
  } catch {
    return defaultStored();
  }
}

export function save(value: Stored): void {
  try {
    storage()?.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch {
    // quota exceeded or blocked: keep running with in-memory state
  }
}
