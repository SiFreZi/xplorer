import React from 'react';
import { FileEntry, FileTag } from '@/lib/tauri-api';
import { Lock } from 'lucide-react';

export const IMAGE_EXTENSIONS = new Set([
  'jpg',
  'jpeg',
  'png',
  'gif',
  'webp',
  'bmp',
  'ico',
  'svg',
  'avif',
  'tiff',
  'tif',
]);

export const isImageFile = (file: FileEntry): boolean => {
  if (file.is_dir) return false;
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  return IMAGE_EXTENSIONS.has(ext);
};

// ─── Filter match highlighting ───────────────────────────────────────────────

/**
 * Wrap every case-insensitive occurrence of `query` in `text` with a <mark> so the
 * matching letters are highlighted (same idea as the search results view).
 * Returns the plain string when there is no query or no match.
 */
export const highlightName = (text: string, query?: string): React.ReactNode => {
  if (!query) return text;
  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();
  if (!lowerText.includes(lowerQuery)) return text;

  const parts: React.ReactNode[] = [];
  let cursor = 0;
  let matchStart = lowerText.indexOf(lowerQuery);
  let key = 0;
  while (matchStart !== -1) {
    if (matchStart > cursor) parts.push(text.slice(cursor, matchStart));
    const matchEnd = matchStart + lowerQuery.length;
    parts.push(
      <mark key={key++} className="rounded-sm bg-yellow-300/40 text-inherit">
        {text.slice(matchStart, matchEnd)}
      </mark>,
    );
    cursor = matchEnd;
    matchStart = lowerText.indexOf(lowerQuery, cursor);
  }
  if (cursor < text.length) parts.push(text.slice(cursor));
  return parts;
};

// ─── Tag dots displayed under / beside a file name ───────────────────────────

export const TagDots = ({ tags }: { tags: FileTag[] }) => {
  if (!tags || tags.length === 0) return null;

  return (
    <div className="mt-0.5 flex flex-wrap items-center gap-0.5">
      {tags.map((tag) => (
        <span
          key={tag.name}
          className="h-2 w-2 flex-shrink-0 rounded-full border border-black border-opacity-20"
          style={{ backgroundColor: tag.color }}
          title={tag.name}
        />
      ))}
    </div>
  );
};

// ─── Git status dot displayed next to a file name ────────────────────────────

export const GitStatusDot = ({ status }: { status: string | null }) => {
  if (!status) return null;

  const colorMap: Record<string, string> = {
    new: '#22c55e', // green
    untracked: '#22c55e', // green
    modified: '#f97316', // orange
    renamed: '#f97316', // orange
    deleted: '#ef4444', // red
    conflict: '#ef4444', // red
    ignored: '#9ca3af', // gray
  };

  const color = colorMap[status] || '#9ca3af';
  const label = status.charAt(0).toUpperCase() + status.slice(1);

  return (
    <span
      className="ml-1 inline-block h-2 w-2 flex-shrink-0 rounded-full"
      style={{ backgroundColor: color }}
      title={`Git: ${label}`}
    />
  );
};

// ─── Lock badge displayed on read-only files ──────────────────────────────────

export const LockBadge = ({ isReadonly }: { isReadonly: boolean }) => {
  if (!isReadonly) return null;

  return (
    <span
      className="ml-1 inline-flex flex-shrink-0 items-center"
      title="Read-only"
      aria-label="Read-only"
    >
      <Lock size={10} className="text-xp-text-muted opacity-70" />
    </span>
  );
};
