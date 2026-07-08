/**
 * Reactive access to Xplorer application settings.
 *
 * The value is read fresh from localStorage on every render (a cheap parse of a
 * small object) rather than cached in state. This is deliberate: a component
 * that first mounts during a cold start — before the persisted settings are
 * applied — would otherwise cache the default and stay stale until the next
 * settings-changed event. The subscription below only forces a re-render so the
 * fresh read reflects external changes (e.g. edits made in the Settings page).
 */
import { useEffect, useState } from 'react';
import { readAppSettings, SETTINGS_CHANGED_EVENTS, type AppSettings } from '@/lib/app-settings';

/** Subscribe to settings-changed / storage events and force a re-render on change. */
const useSettingsSubscription = (): void => {
  const [, forceUpdate] = useState(0);
  useEffect(() => {
    const update = () => forceUpdate((n) => n + 1);
    for (const evt of SETTINGS_CHANGED_EVENTS) window.addEventListener(evt, update);
    window.addEventListener('storage', update);
    return () => {
      for (const evt of SETTINGS_CHANGED_EVENTS) window.removeEventListener(evt, update);
      window.removeEventListener('storage', update);
    };
  }, []);
};

/** Reactively read the full settings object (fresh each render). */
export const useAppSettings = (): AppSettings => {
  useSettingsSubscription();
  return readAppSettings();
};

/** Reactively read a single setting value (fresh each render). */
export const useSetting = <K extends keyof AppSettings>(key: K): AppSettings[K] => {
  useSettingsSubscription();
  return readAppSettings()[key];
};
