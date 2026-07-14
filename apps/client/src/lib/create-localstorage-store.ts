/**
 * createLocalStorageStore — tiny helper for a localStorage-backed value that
 * notifies React (via useSyncExternalStore) and other tabs/listeners on change.
 *
 * Shared by the small settings stores (preview associations, custom commands,
 * panel icon visibility) so each one avoids re-implementing the same
 * subscribe / persist / event boilerplate.
 */

import { useSyncExternalStore } from 'react';

export interface LocalStorageStore<T> {
  /** Read the current value fresh from localStorage. */
  get: () => T;
  /** Persist a new value and notify all listeners + other tabs. */
  set: (value: T) => void;
  /** React hook returning the current value (re-renders on change). */
  useValue: () => T;
}

export const createLocalStorageStore = <T>(
  key: string,
  fallback: T,
  changeEvent: string,
): LocalStorageStore<T> => {
  const load = (): T => {
    try {
      const raw = localStorage.getItem(key);
      if (raw) return JSON.parse(raw) as T;
    } catch {
      /* ignore malformed data */
    }
    return fallback;
  };

  let snapshot: T = load();
  const listeners = new Set<() => void>();

  const set = (value: T): void => {
    localStorage.setItem(key, JSON.stringify(value));
    snapshot = value;
    listeners.forEach((l) => l());
    window.dispatchEvent(new CustomEvent(changeEvent));
  };

  const subscribe = (cb: () => void): (() => void) => {
    listeners.add(cb);
    const onExternal = () => {
      snapshot = load();
      cb();
    };
    window.addEventListener(changeEvent, onExternal);
    return () => {
      listeners.delete(cb);
      window.removeEventListener(changeEvent, onExternal);
    };
  };

  const useValue = (): T => useSyncExternalStore(subscribe, getSnapshot);

  function getSnapshot(): T {
    return snapshot;
  }

  return { get: load, set, useValue };
};
