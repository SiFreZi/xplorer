/**
 * Preview Associations — per-extension overrides that force which built-in
 * previewer renders a file type (e.g. `.npmrc` -> text). Stored in localStorage
 * under `xplorer:preview-associations`.
 */

import { useCallback } from 'react';
import { STORAGE_KEYS } from '@/lib/storage-keys';
import type { PreviewType } from '@/lib/preview-factory';
import { createLocalStorageStore } from '@/lib/create-localstorage-store';

/** Preview types a user may assign an extension to. `unknown`/`folder` excluded. */
export const ASSIGNABLE_PREVIEW_TYPES: PreviewType[] = [
  'text',
  'code',
  'markdown',
  'json',
  'csv',
  'image',
  'pdf',
  'document',
  'spreadsheet',
  'video',
  'audio',
];

/** Map of file extension (without dot, lowercase) -> forced preview type. */
export type PreviewAssociations = Record<string, PreviewType>;

const store = createLocalStorageStore<PreviewAssociations>(
  STORAGE_KEYS.PREVIEW_ASSOCIATIONS,
  {},
  'preview-associations-changed',
);

const normalizeExt = (ext: string): string => ext.trim().replace(/^\./, '').toLowerCase();

/** Get the forced preview type for an extension, or null if none. */
export const getPreviewOverride = (ext: string): PreviewType | null => {
  const key = normalizeExt(ext);
  if (!key) return null;
  return store.get()[key] ?? null;
};

/** Assign (or update) a forced preview type for an extension. */
export const setPreviewOverride = (ext: string, type: PreviewType): void => {
  const key = normalizeExt(ext);
  if (!key) return;
  store.set({ ...store.get(), [key]: type });
};

/** Remove the forced preview type for an extension. */
export const removePreviewOverride = (ext: string): void => {
  const key = normalizeExt(ext);
  const all = { ...store.get() };
  if (key in all) {
    delete all[key];
    store.set(all);
  }
};

/** Remove all preview associations. */
export const clearAllPreviewOverrides = (): void => store.set({});

/** Get all preview associations. */
export const getAllPreviewOverrides = (): PreviewAssociations => store.get();

/** React hook exposing the current associations plus mutators. */
export const usePreviewAssociations = () => {
  const associations = store.useValue();
  const set = useCallback((ext: string, type: PreviewType) => setPreviewOverride(ext, type), []);
  const remove = useCallback((ext: string) => removePreviewOverride(ext), []);
  const clearAll = useCallback(() => clearAllPreviewOverrides(), []);
  return { associations, set, remove, clearAll };
};
