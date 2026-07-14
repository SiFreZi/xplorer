/**
 * Custom Context-Menu Commands — user-defined commands that launch external
 * programs (e.g. open a folder in VS Code or Fork) from the right-click menu.
 *
 * Stored in localStorage under `xplorer:custom-commands`. Mutations dispatch a
 * `custom-commands-changed` CustomEvent on window so listeners re-render.
 */

import { useCallback } from 'react';
import { STORAGE_KEYS } from '@/lib/storage-keys';
import type { FileEntry } from '@/lib/tauri-api';
import { createLocalStorageStore } from '@/lib/create-localstorage-store';

/** Which entries a custom command applies to. */
export type CustomCommandTarget = 'file' | 'folder' | 'both';

export interface CustomCommand {
  id: string;
  /** Menu label, e.g. "Open with VS Code". */
  label: string;
  /**
   * Command line to run. Supports placeholders `{path}`, `{dir}`, `{name}`
   * which are substituted as-is — wrap them in quotes for paths with spaces
   * (e.g. `code "{path}"`). If no placeholder is present, the quoted path is
   * appended (e.g. `code` -> `code "<path>"`).
   */
  command: string;
  /** Whether the entry shows for files, folders, or both. */
  appliesTo: CustomCommandTarget;
  /** Icon name (see custom-command-icons); defaults to external-link. */
  icon?: string;
  enabled: boolean;
}

const store = createLocalStorageStore<CustomCommand[]>(
  STORAGE_KEYS.CUSTOM_COMMANDS,
  [],
  'custom-commands-changed',
);

const generateId = (): string => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

// ── Public getters/mutators (usable outside React) ──────────────────────────

export const getCustomCommands = (): CustomCommand[] => store.get();

/** Enabled commands that apply to the given entry kind. */
export const getEnabledCustomCommandsFor = (kind: 'file' | 'folder'): CustomCommand[] =>
  store.get().filter((c) => c.enabled && (c.appliesTo === kind || c.appliesTo === 'both'));

export const createCustomCommand = (command: Omit<CustomCommand, 'id'>): CustomCommand => {
  const created: CustomCommand = { ...command, id: generateId() };
  store.set([...store.get(), created]);
  return created;
};

export const updateCustomCommand = (
  id: string,
  updates: Partial<Omit<CustomCommand, 'id'>>,
): void => {
  const all = store.get();
  const idx = all.findIndex((c) => c.id === id);
  if (idx === -1) return;
  const next = [...all];
  next[idx] = { ...next[idx], ...updates };
  store.set(next);
};

export const deleteCustomCommand = (id: string): void => {
  store.set(store.get().filter((c) => c.id !== id));
};

/**
 * Resolve a command template + entry into the shell command string and the
 * working directory to run it in.
 */
export const buildCommandInvocation = (
  command: CustomCommand,
  file: FileEntry,
): { command: string; workingDir: string } => {
  const sep = file.path.includes('\\') ? '\\' : '/';
  const lastSep = file.path.lastIndexOf(sep);
  const dir = file.is_dir ? file.path : file.path.substring(0, lastSep) || file.path;
  const name = file.path.substring(lastSep + 1);

  const hasPlaceholder =
    command.command.includes('{path}') ||
    command.command.includes('{dir}') ||
    command.command.includes('{name}');

  let resolved = command.command;
  if (hasPlaceholder) {
    // Substitute the raw value; the user quotes placeholders in the template
    // (e.g. `code "{path}"`) so we must not add another layer of quotes.
    resolved = resolved
      .split('{path}')
      .join(file.path)
      .split('{dir}')
      .join(dir)
      .split('{name}')
      .join(name);
  } else {
    resolved = `${command.command} "${file.path}"`;
  }

  return { command: resolved, workingDir: dir };
};

/** React hook exposing the current commands plus mutators. */
export const useCustomCommands = () => {
  const commands = store.useValue();
  const create = useCallback(
    (command: Omit<CustomCommand, 'id'>) => createCustomCommand(command),
    [],
  );
  const update = useCallback(
    (id: string, updates: Partial<Omit<CustomCommand, 'id'>>) => updateCustomCommand(id, updates),
    [],
  );
  const remove = useCallback((id: string) => deleteCustomCommand(id), []);
  return { commands, create, update, remove };
};
