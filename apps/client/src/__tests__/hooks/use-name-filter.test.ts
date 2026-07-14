import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useNameFilter } from '@/hooks/use-name-filter';
import { TauriAPI, type FileEntry } from '@/lib/tauri-api';

vi.spyOn(TauriAPI, 'findFiles').mockResolvedValue([]);

const makeFile = (name: string, isDir = false): FileEntry => ({
  name,
  path: `C:/dir/${name}`,
  is_dir: isDir,
  size: 0,
  modified: 0,
  file_type: isDir ? 'directory' : 'file',
  is_readonly: false,
});

const source: FileEntry[] = [
  makeFile('Report.pdf'),
  makeFile('report-draft.txt'),
  makeFile('images', true),
  makeFile('notes.md'),
];

const press = (key: string) => {
  act(() => {
    window.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
  });
};

describe('useNameFilter', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('starts empty and returns all files', () => {
    const { result } = renderHook(() =>
      useNameFilter({ enabled: true, currentPath: 'C:/dir', sourceFiles: source }),
    );
    expect(result.current.filterQuery).toBe('');
    expect(result.current.filteredFiles).toHaveLength(4);
    expect(result.current.matchCount).toBe(4);
  });

  it('appends typed characters and filters by case-insensitive substring', () => {
    const { result } = renderHook(() =>
      useNameFilter({ enabled: true, currentPath: 'C:/dir', sourceFiles: source }),
    );
    press('r');
    press('e');
    press('p');
    expect(result.current.filterQuery).toBe('rep');
    // matches Report.pdf and report-draft.txt
    expect(result.current.filteredFiles.map((f) => f.name)).toEqual([
      'Report.pdf',
      'report-draft.txt',
    ]);
  });

  it('removes the last character on Backspace', () => {
    const { result } = renderHook(() =>
      useNameFilter({ enabled: true, currentPath: 'C:/dir', sourceFiles: source }),
    );
    press('n');
    press('o');
    expect(result.current.filterQuery).toBe('no');
    press('Backspace');
    expect(result.current.filterQuery).toBe('n');
  });

  it('clears the query on Escape', () => {
    const { result } = renderHook(() =>
      useNameFilter({ enabled: true, currentPath: 'C:/dir', sourceFiles: source }),
    );
    press('n');
    press('o');
    expect(result.current.filterQuery).toBe('no');
    press('Escape');
    expect(result.current.filterQuery).toBe('');
    expect(result.current.filteredFiles).toHaveLength(4);
  });

  it('clears via clearFilter()', () => {
    const { result } = renderHook(() =>
      useNameFilter({ enabled: true, currentPath: 'C:/dir', sourceFiles: source }),
    );
    press('n');
    expect(result.current.filterQuery).toBe('n');
    act(() => result.current.clearFilter());
    expect(result.current.filterQuery).toBe('');
  });

  it('ignores keystrokes when disabled', () => {
    const { result } = renderHook(() =>
      useNameFilter({ enabled: false, currentPath: 'C:/dir', sourceFiles: source }),
    );
    press('r');
    expect(result.current.filterQuery).toBe('');
  });

  it('does not start filtering on a bare Space', () => {
    const { result } = renderHook(() =>
      useNameFilter({ enabled: true, currentPath: 'C:/dir', sourceFiles: source }),
    );
    press(' ');
    expect(result.current.filterQuery).toBe('');
  });

  it('resets the query when the path changes', () => {
    const { result, rerender } = renderHook(
      ({ path }) => useNameFilter({ enabled: true, currentPath: path, sourceFiles: source }),
      { initialProps: { path: 'C:/dir' } },
    );
    press('r');
    expect(result.current.filterQuery).toBe('r');
    rerender({ path: 'C:/other' });
    expect(result.current.filterQuery).toBe('');
  });

  it('reports recursive support based on the path scheme', () => {
    const real = renderHook(() =>
      useNameFilter({ enabled: true, currentPath: 'C:/dir', sourceFiles: source }),
    );
    expect(real.result.current.recursiveSupported).toBe(true);

    const virtual = renderHook(() =>
      useNameFilter({ enabled: true, currentPath: 'xplorer://home', sourceFiles: source }),
    );
    expect(virtual.result.current.recursiveSupported).toBe(false);
  });

  it('resets recursive mode on Escape', () => {
    const { result } = renderHook(() =>
      useNameFilter({ enabled: true, currentPath: 'C:/dir', sourceFiles: source }),
    );
    press('r');
    act(() => result.current.toggleRecursive());
    expect(result.current.recursive).toBe(true);
    press('Escape');
    expect(result.current.filterQuery).toBe('');
    expect(result.current.recursive).toBe(false);
  });

  it('resets recursive mode via clearFilter()', () => {
    const { result } = renderHook(() =>
      useNameFilter({ enabled: true, currentPath: 'C:/dir', sourceFiles: source }),
    );
    press('r');
    act(() => result.current.toggleRecursive());
    expect(result.current.recursive).toBe(true);
    act(() => result.current.clearFilter());
    expect(result.current.recursive).toBe(false);
  });
});
