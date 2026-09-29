"use client";

import { useSyncExternalStore } from "react";
import { addRecord, recordOf } from "./history";
import { isDone, studyReducer, type StudyAction, type StudyState } from "./session";
import { load, save, STORAGE_KEY, type Settings, type Stored } from "./storage";

/**
 * App state lives in localStorage; this module keeps an in-memory copy and
 * exposes it through useSyncExternalStore. The server snapshot is null, so
 * components render a placeholder until the client has read storage.
 */
let state: Stored | null = null;
const listeners = new Set<() => void>();

function current(): Stored {
  if (state === null) state = load();
  return state;
}

function set(next: Stored) {
  state = next;
  save(next);
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  // keep several open tabs in sync
  const onStorage = (e: StorageEvent) => {
    if (e.key !== STORAGE_KEY) return;
    state = load();
    listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

/** Word to add to (+) or drop from (-) settings.excluded after a study action. */
function exclusionChange(before: StudyState, after: StudyState) {
  const was = before.session?.results ?? [];
  const now = after.session?.results ?? [];
  // an exclude answer was just given, or just undone
  if (now.length === was.length + 1 && now.at(-1)?.answer === "exclude") return { add: now.at(-1)!.id };
  if (now.length === was.length - 1 && was.at(-1)?.answer === "exclude") return { remove: was.at(-1)!.id };
  return null;
}

export function dispatch(action: StudyAction) {
  const prev = current();
  const study = studyReducer(prev.study, action);
  if (study === prev.study) return;
  let { settings } = prev;
  const change = action.type === "answer" || action.type === "undo" ? exclusionChange(prev.study, study) : null;
  if (change?.add && !settings.excluded.includes(change.add)) {
    settings = { ...settings, excluded: [...settings.excluded, change.add] };
  } else if (change?.remove) {
    settings = { ...settings, excluded: settings.excluded.filter((e) => e !== change.remove) };
  }
  let { history } = prev;
  // a session that just finished (or was ended) goes into the history
  const finished = study.session && isDone(study.session) && !(prev.study.session && isDone(prev.study.session));
  const record = finished && study.session ? recordOf(study.session, new Date()) : null;
  if (record) history = addRecord(history, record);
  set({ study, settings, history });
}

export function updateSettings(settings: Settings) {
  set({ ...current(), settings });
}

/** Leave a word out of sessions, or put it back. */
export function toggleExcluded(id: string) {
  const { settings } = current();
  const excluded = settings.excluded.includes(id)
    ? settings.excluded.filter((e) => e !== id)
    : [...settings.excluded, id];
  updateSettings({ ...settings, excluded });
}

export function useStore(): Stored | null {
  return useSyncExternalStore(subscribe, current, () => null);
}

/** Tests only: drop the in-memory copy so the next read goes to localStorage. */
export function resetStore() {
  state = null;
}
