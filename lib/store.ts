"use client";

import { useSyncExternalStore } from "react";
import { studyReducer, type StudyAction } from "./session";
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

export function dispatch(action: StudyAction) {
  const prev = current();
  const study = studyReducer(prev.study, action);
  if (study !== prev.study) set({ ...prev, study });
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
