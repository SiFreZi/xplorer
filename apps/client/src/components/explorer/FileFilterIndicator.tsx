import { Filter, Loader2, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface FileFilterIndicatorProps {
  /** Current filter text. The indicator is hidden when empty. */
  query: string;
  /** Number of files matching the current filter. */
  matchCount: number;
  /** Whether recursive (subdirectory) search is enabled. */
  recursive: boolean;
  /** Whether recursive search is supported for the current path. */
  recursiveSupported: boolean;
  /** Whether a recursive backend search is in progress. */
  isSearching: boolean;
  /** Toggle recursive search mode. */
  onToggleRecursive: () => void;
  /** Clear the filter (also triggered by Escape). */
  onClear: () => void;
}

/**
 * Small bottom-right overlay that appears while type-to-filtering the file list.
 * Shows the typed text, a match count, a recursive toggle and a clear (X) button.
 */
const FileFilterIndicator = ({
  query,
  matchCount,
  recursive,
  recursiveSupported,
  isSearching,
  onToggleRecursive,
  onClear,
}: FileFilterIndicatorProps) => {
  const { t } = useTranslation();

  if (!query) return null;

  return (
    <div
      className="bg-xp-surface/95 border-xp-border pointer-events-auto absolute bottom-3 right-3 z-20 flex items-center gap-2 rounded-lg border px-3 py-1.5 shadow-lg backdrop-blur-md"
      role="status"
      aria-label={t('fileFilter.label')}
    >
      <Filter className="text-xp-text-secondary h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />

      <span className="text-xp-text max-w-[220px] truncate font-mono text-sm" title={query}>
        {query}
      </span>

      <span className="text-xp-text-muted whitespace-nowrap text-xs">
        {isSearching ? (
          <Loader2 className="inline h-3 w-3 animate-spin" aria-hidden="true" />
        ) : (
          t('fileFilter.matches', { count: matchCount })
        )}
      </span>

      {recursiveSupported && (
        <label
          className="text-xp-text-secondary hover:text-xp-text flex cursor-pointer select-none items-center gap-1 text-xs"
          title={t('fileFilter.recursiveHint')}
        >
          <input
            type="checkbox"
            className="accent-xp-blue h-3 w-3 cursor-pointer"
            checked={recursive}
            onChange={onToggleRecursive}
          />
          {t('fileFilter.recursive')}
        </label>
      )}

      <button
        type="button"
        onClick={onClear}
        className="text-xp-text-muted hover:bg-xp-hover hover:text-xp-text flex h-5 w-5 flex-shrink-0 items-center justify-center rounded transition-colors"
        aria-label={t('fileFilter.clear')}
        title={t('fileFilter.clear')}
      >
        <X className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
    </div>
  );
};

export default FileFilterIndicator;
