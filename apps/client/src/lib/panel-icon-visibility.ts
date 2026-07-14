/**
 * Panel Icon Visibility — lets the user hide/show icons in the right vertical
 * panel bar via its right-click context menu. The set of HIDDEN panel ids is
 * stored in localStorage under `xplorer:hidden-panel-icons` (visible by default).
 */

import { STORAGE_KEYS } from '@/lib/storage-keys';
import { createLocalStorageStore } from '@/lib/create-localstorage-store';

const store = createLocalStorageStore<string[]>(
  STORAGE_KEYS.HIDDEN_PANEL_ICONS,
  [],
  'panel-icons-changed',
);

/** True when the given panel icon should be shown. */
export const isPanelIconVisible = (id: string): boolean => !store.get().includes(id);

/** Toggle visibility of a panel icon. */
export const togglePanelIcon = (id: string): void => {
  const hidden = store.get();
  store.set(hidden.includes(id) ? hidden.filter((h) => h !== id) : [...hidden, id]);
};

/** Make every panel icon visible again. */
export const showAllPanelIcons = (): void => store.set([]);

/** React hook returning the set of hidden panel icon ids (reactive). */
export const useHiddenPanelIcons = (): Set<string> => new Set(store.useValue());
