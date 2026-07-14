import React from 'react';
import { FileEntry, FolderSizeInfo, FileTag } from '@/lib/tauri-api';

export interface ViewComponentProps {
  files: FileEntry[];
  selectedFiles: Set<string>;
  currentPath: string;
  groupId: string;
  getFileIcon: (file: FileEntry) => React.ReactNode;
  formatFileSize: (bytes: number) => string;
  formatFolderSize: (folderSizeInfo: FolderSizeInfo | null, isCalculating?: boolean) => string;
  formatDate: (timestamp: number) => string;
  handleFileClick: (file: FileEntry, event: React.MouseEvent) => void;
  handleFileDoubleClick: (file: FileEntry) => void;
  handleFileRightClick: (file: FileEntry, event: React.MouseEvent) => void;
  handleBackgroundRightClick?: (event: React.MouseEvent) => void;
  /** Open a folder in a new tab (used by middle-click). */
  openInNewTab?: (file: FileEntry) => void;
  getFolderSize: (path: string) => FolderSizeInfo | null;
  isCalculatingSize: (path: string) => boolean;
  calculateFolderSize?: (path: string) => void;
  /** Active type-to-filter query, used to highlight matching letters in names. */
  filterQuery?: string;
  /** Path currently being inline-renamed (Windows-Explorer style), or null. */
  renamingPath?: string | null;
  /** Existing sibling names, used for rename conflict validation. */
  existingNames?: string[];
  /** Confirm an inline rename (Enter / blur). */
  onRenameConfirm?: (oldPath: string, newName: string) => void;
  /** Cancel an inline rename (Escape). */
  onRenameCancel?: () => void;
  /** Confirm rename and advance to the next file (Tab). */
  onRenameTab?: (oldPath: string, newName: string) => void;
  /**
   * Column view: report the directory shown in the deepest column so the
   * address bar and "new folder" target can follow the active column without
   * changing the pane's root path.
   */
  onActiveDirChange?: (dir: string) => void;
}

export interface SizeBadgeInfo {
  percentile: number;
  color: string;
  label: string;
}

export interface FileGridItemProps {
  file: FileEntry;
  isSelected: boolean;
  tags: FileTag[];
  gitStatus: string | null;
  isGridView: boolean;
  isListView: boolean;
  viewMode: string;
  itemSize: string;
  selectedFiles: Set<string>;
  allFiles: FileEntry[];
  getFileIcon: (file: FileEntry) => React.ReactNode;
  formatFileSize: (bytes: number) => string;
  formatFolderSize: (folderSizeInfo: FolderSizeInfo | null, isCalculating?: boolean) => string;
  formatDate: (timestamp: number) => string;
  onFileClick: (file: FileEntry, event: React.MouseEvent) => void;
  onFileDoubleClick: (file: FileEntry) => void;
  onFileRightClick: (file: FileEntry, event: React.MouseEvent) => void;
  getFolderSize: (path: string) => FolderSizeInfo | null;
  isCalculatingSize: (path: string) => boolean;
  /** When true, show a color-coded size percentile badge */
  showSizeBadge?: boolean;
  /** Size percentile info for this file (color, label, percentile) */
  sizeBadgeInfo?: SizeBadgeInfo | null;
  /** Pre-resolved thumbnail URL for image files (from useThumbnailCache) */
  thumbnailUrl?: string;
  /** Active type-to-filter query, used to highlight matching letters in the name. */
  filterQuery?: string;
  /** When true, the file name label is replaced with an inline rename input */
  isRenaming?: boolean;
  /** List of existing file/folder names in the directory (for conflict detection) */
  existingNames?: string[];
  /** Called when the user confirms the rename (Enter key or Tab key) */
  onRenameConfirm?: (oldPath: string, newName: string) => void;
  /** Called when the user cancels the rename (Escape key or blur) */
  onRenameCancel?: () => void;
  /** Called when Tab is pressed during rename to move to next file */
  onRenameTab?: (oldPath: string, newName: string) => void;
}
