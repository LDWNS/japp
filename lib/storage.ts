import { z } from "zod";
import { COUNT_OPTIONS, type DeckCount } from "./deck";
import { HistorySchema, type History } from "./history";
import { LEVEL_SIZES, LevelProgressSchema, type LevelProgress, type LevelSize } from "./levels";
import { initialStudyState, StudyStateSchema, type StudyState } from "./session";
import { LEVELS, LevelSchema, type Level } from "./types";

export const STORAGE_KEY = "japp:v1";

export const ROMAJI_MODES = ["off", "front", "back", "both"] as const;
export type RomajiMode = (typeof ROMAJI_MODES)[number];

// fields added after v1 have defaults so older saved data still parses
export const SettingsSchema = z.object({
  levels: z.array(LevelSchema).min(1),
  count: z.union([z.literal(10), z.literal(20), z.literal(50), z.literal(100), z.literal("all")]),
  furigana: z.boolean().default(false),
  romaji: z.enum(ROMAJI_MODES).default("off"),
  /** word ids left out of every session */
  excluded: z.array(z.string()).default(() => []),
  /** words per level on the levels page */
  levelSize: z.union(LEVEL_SIZES.map((n) => z.literal(n))).default(LEVEL_SIZES[0]),
});
export type Settings = {
  levels: Level[];
  count: DeckCount;
  furigana: boolean;
  romaji: RomajiMode;
  excluded: string[];
  levelSize: LevelSize;
};

export const defaultSettings = (): Settings => ({
  levels: [LEVELS[0]],
  count: COUNT_OPTIONS[1],
  furigana: false,
  romaji: "off",
  excluded: [],
  levelSize: LEVEL_SIZES[0],
});

export const showsRomaji = (mode: RomajiMode, side: "front" | "back") => mode === side || mode === "both";

const StoredSchema = z.object({
  study: StudyStateSchema,
  settings: SettingsSchema,
  /** finished quizzes, oldest first */
  history: HistorySchema.default(() => []),
  /** completed levels on the levels page */
  levels: LevelProgressSchema.default(() => ({})),
});
export type Stored = { study: StudyState; settings: Settings; history: History; levels: LevelProgress };

export const defaultStored = (): Stored => ({
  study: initialStudyState(),
  settings: defaultSettings(),
  history: [],
  levels: {},
});

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
