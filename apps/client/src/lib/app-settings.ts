/**
 * Single source of truth for the Xplorer application settings shape, defaults,
 * and the (framework-agnostic) helpers to read/persist them.
 *
 * Settings live in `localStorage` under `STORAGE_KEYS.SETTINGS`. Anything that
 * needs to *react* to changes should use the hooks in
 * `@/hooks/use-app-settings` rather than caching a value, so a component that
 * mounts during a cold start (before the persisted value is applied) never gets
 * stuck on a stale default.
 */
import { STORAGE_KEYS } from './storage-keys';

export interface AppSettings {
  theme: string;
  language: string;
  showHiddenFiles: boolean;
  enableMarkdownPreview: boolean;
  defaultView: string;
  enableAnimations: boolean;
  showFileExtensions: boolean;
  enableNotifications: boolean;
  autoSave: boolean;
  fontSize: string;
  sidebarWidth: string;
  reducedMotion: boolean;
  enhancedFocus: boolean;
  highContrast: boolean;
  autoCalculateFolderSizes: boolean;
  rememberViewPerFolder: boolean;
  detailsRowDensity: 'compact' | 'normal' | 'comfortable';
  aiSearchProvider: string;
  aiSearchModel: string;
  aiSearchApiKey: string;
  aiServiceMode: 'cloud' | 'custom';
  aiCloudModel: string;
  aiCustomProvider: string;
  aiCustomModel: string;
  aiCustomApiKey: string;
}

export const DEFAULT_SETTINGS: AppSettings = {
  theme: 'glass',
  language: '',
  showHiddenFiles: false,
  enableMarkdownPreview: true,
  defaultView: 'grid',
  enableAnimations: true,
  showFileExtensions: true,
  enableNotifications: true,
  autoSave: true,
  fontSize: 'medium',
  sidebarWidth: 'medium',
  reducedMotion: false,
  enhancedFocus: false,
  highContrast: false,
  autoCalculateFolderSizes: false,
  rememberViewPerFolder: false,
  detailsRowDensity: 'normal',
  aiSearchProvider: 'auto',
  aiSearchModel: '',
  aiSearchApiKey: '',
  aiServiceMode: 'cloud',
  aiCloudModel: 'anthropic/claude-sonnet-4',
  aiCustomProvider: 'ollama',
  aiCustomModel: '',
  aiCustomApiKey: '',
};

/**
 * Events fired when settings change. `xplorer:settings-changed` is canonical;
 * `xplorer-settings-changed` is kept for backwards compatibility with older
 * call sites. Listen to both, emit the canonical one.
 */
export const SETTINGS_CHANGED_EVENTS = [
  'xplorer:settings-changed',
  'xplorer-settings-changed',
] as const;

/** Read the full settings object fresh from localStorage, merged with defaults. */
export const readAppSettings = (): AppSettings => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (raw) {
      const parsed: unknown = JSON.parse(raw);
      if (typeof parsed === 'object' && parsed !== null) {
        return { ...DEFAULT_SETTINGS, ...(parsed as Partial<AppSettings>) };
      }
    }
  } catch {
    /* ignore malformed settings */
  }
  return DEFAULT_SETTINGS;
};

/** Persist the full settings object and notify listeners. */
export const writeAppSettings = (settings: AppSettings): void => {
  localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  emitAppSettingsChanged();
};

/** Notify listeners (canonical event) that settings changed. */
export const emitAppSettingsChanged = (): void => {
  window.dispatchEvent(new CustomEvent(SETTINGS_CHANGED_EVENTS[0]));
};
