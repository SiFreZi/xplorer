import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { TauriAPI, type FileEntry } from '@/lib/tauri-api';
import { SEARCH_DEBOUNCE_MS } from '@/lib/constants';

interface UseNameFilterOptions {
  /** Whether the keydown listener is active (active pane on a real file listing). */
  enabled: boolean;
  /** Current directory path — resets the filter on navigation. */
  currentPath: string;
  /** The already-sorted files of the current directory. */
  sourceFiles: FileEntry[];
}

/** Only real filesystem paths support recursive search via the backend. */
const isRealFsPath = (p: string): boolean =>
  !p.startsWith('gdrive://') &&
  !p.startsWith('ssh://') &&
  !p.startsWith('collection://') &&
  !p.startsWith('xplorer://') &&
  !p.startsWith('comparison://');

/** Whether the keystroke target is an editable element we must not hijack. */
const isEditableTarget = (el: EventTarget | null): boolean => {
  if (!(el instanceof HTMLElement)) return false;
  const tag = el.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (el.isContentEditable) return true;
  if (el.getAttribute('role') === 'textbox') return true;
  return false;
};

/** Build a lightweight FileEntry from a bare path (recursive results lack metadata). */
const pathToEntry = (filePath: string): FileEntry => {
  const sep = filePath.includes('/') ? '/' : '\\';
  const name = filePath.split(sep).pop() || filePath;
  const dotIdx = name.lastIndexOf('.');
  const ext = dotIdx > 0 ? name.slice(dotIdx + 1).toLowerCase() : '';
  return {
    name,
    path: filePath,
    is_dir: ext === '' && !name.includes('.'),
    size: 0,
    modified: 0,
    file_type: ext,
    is_readonly: false,
  };
};

/**
 * Type-to-filter for the file list. Listens for keystrokes while the pane is active
 * and filters the current directory by substring match on the file/folder name.
 * A recursive mode searches subdirectories via the backend `find_files` command.
 */
export const useNameFilter = ({ enabled, currentPath, sourceFiles }: UseNameFilterOptions) => {
  const [filterQuery, setFilterQuery] = useState('');
  const [recursive, setRecursive] = useState(false);
  const [recursiveResults, setRecursiveResults] = useState<FileEntry[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const recursiveSupported = isRealFsPath(currentPath);

  // Keep the latest query in a ref so the keydown handler can read it synchronously.
  const queryRef = useRef(filterQuery);
  queryRef.current = filterQuery;

  const clearFilter = useCallback(() => {
    setFilterQuery('');
    setRecursive(false);
  }, []);

  const toggleRecursive = useCallback(() => {
    setRecursive((r) => !r);
  }, []);

  // Reset filter state whenever the pane navigates to a different directory.
  useEffect(() => {
    setFilterQuery('');
    setRecursive(false);
  }, [currentPath]);

  // Clear the query when the listener is disabled (pane deactivated / non-file tab).
  useEffect(() => {
    if (!enabled) setFilterQuery('');
  }, [enabled]);

  // Global keydown listener (capture phase so Escape/Backspace preempt other handlers).
  useEffect(() => {
    if (!enabled) return;

    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.altKey || e.metaKey) return;
      if (isEditableTarget(e.target)) return;

      if (e.key === 'Escape') {
        if (queryRef.current) {
          e.preventDefault();
          e.stopPropagation();
          setFilterQuery('');
          setRecursive(false);
        }
        return;
      }

      if (e.key === 'Backspace') {
        if (queryRef.current) {
          e.preventDefault();
          e.stopPropagation();
          setFilterQuery((q) => q.slice(0, -1));
        }
        return;
      }

      if (e.key.length === 1) {
        // Don't hijack Space (selection / quick look) until a filter is already active.
        if (e.key === ' ' && !queryRef.current) return;
        e.preventDefault();
        setFilterQuery((q) => q + e.key);
      }
    };

    window.addEventListener('keydown', handler, true);
    return () => window.removeEventListener('keydown', handler, true);
  }, [enabled]);

  // In-memory substring filter of the current directory (non-recursive).
  const localFiltered = useMemo(() => {
    if (!filterQuery) return sourceFiles;
    const q = filterQuery.toLowerCase();
    return sourceFiles.filter((f) => f.name.toLowerCase().includes(q));
  }, [sourceFiles, filterQuery]);

  // Debounced recursive backend search of subdirectories.
  useEffect(() => {
    if (!enabled || !recursive || !recursiveSupported || !filterQuery) {
      setRecursiveResults([]);
      setIsSearching(false);
      return;
    }

    let cancelled = false;
    setIsSearching(true);
    const timer = setTimeout(async () => {
      try {
        const paths = await TauriAPI.findFiles(filterQuery, currentPath);
        if (cancelled) return;
        setRecursiveResults(paths.map(pathToEntry));
      } catch {
        if (!cancelled) setRecursiveResults([]);
      } finally {
        if (!cancelled) setIsSearching(false);
      }
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [enabled, recursive, recursiveSupported, filterQuery, currentPath]);

  const useRecursive = recursive && recursiveSupported && !!filterQuery;

  // In recursive mode, merge the top-level matches (which include folders — the backend
  // `find_files` returns files only) with the recursive results so already-found items
  // stay visible and deeper file matches are appended.
  const filteredFiles = useMemo(() => {
    if (!useRecursive) return localFiltered;
    const seen = new Set(localFiltered.map((f) => f.path));
    const merged = [...localFiltered];
    for (const entry of recursiveResults) {
      if (!seen.has(entry.path)) {
        seen.add(entry.path);
        merged.push(entry);
      }
    }
    return merged;
  }, [useRecursive, localFiltered, recursiveResults]);

  return {
    filterQuery,
    recursive,
    recursiveSupported,
    toggleRecursive,
    clearFilter,
    filteredFiles,
    matchCount: filteredFiles.length,
    isSearching: useRecursive && isSearching,
  };
};
