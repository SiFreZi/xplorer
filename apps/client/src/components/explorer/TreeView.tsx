import React, { useState, useMemo } from 'react';
import { FileEntry, TauriAPI } from '@/lib/tauri-api';
import { ViewComponentProps } from './FileGridTypes';
import { useDraggable } from '@/hooks/use-draggable';

interface TreeItemRowProps {
  file: FileEntry;
  depth: number;
  siblings: FileEntry[];
  selectedFiles: Set<string>;
  isExpanded: boolean;
  getFileIcon: (file: FileEntry) => React.ReactNode;
  onToggle: (path: string) => void;
  onFileClick: (file: FileEntry, e: React.MouseEvent) => void;
  onFileDoubleClick: (file: FileEntry) => void;
  onFileRightClick: (file: FileEntry, e: React.MouseEvent) => void;
}

// Single tree row — isolated so useDraggable (a hook) is called per component
// instance rather than inside a map callback.
const TreeItemRow = React.memo(
  ({
    file,
    depth,
    siblings,
    selectedFiles,
    isExpanded,
    getFileIcon,
    onToggle,
    onFileClick,
    onFileDoubleClick,
    onFileRightClick,
  }: TreeItemRowProps) => {
    // Native drag via tauri-plugin-drag (mousedown/mousemove/mouseup)
    const dragHandlers = useDraggable({ file, selectedFiles, allFiles: siblings });
    return (
      <div
        role="treeitem"
        aria-selected={selectedFiles.has(file.path)}
        aria-expanded={file.is_dir ? isExpanded : undefined}
        aria-label={`${file.name}${file.is_dir ? ', folder' : ', file'}`}
        tabIndex={0}
        data-file-path={file.path}
        data-drop-target={file.is_dir ? file.path : undefined}
        className={`hover:bg-xp-surface-light flex min-w-0 cursor-pointer select-none items-center overflow-hidden rounded px-2 py-1 transition-colors ${
          selectedFiles.has(file.path)
            ? 'bg-xp-purple/20 border-xp-purple/40 border'
            : 'text-xp-text border border-transparent'
        } `}
        style={{ paddingLeft: `${depth * 20 + 8}px` }}
        {...dragHandlers}
        onClick={(e) => {
          if (file.is_dir) {
            onToggle(file.path);
          }
          onFileClick(file, e);
        }}
        onDoubleClick={() => onFileDoubleClick(file)}
        onContextMenu={(e) => onFileRightClick(file, e)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') onFileDoubleClick(file);
          if (e.key === ' ') {
            e.preventDefault();
            const syntheticEvent = {
              ctrlKey: e.ctrlKey,
              shiftKey: e.shiftKey,
              metaKey: e.metaKey,
              button: 0,
            } as React.MouseEvent;
            onFileClick(file, syntheticEvent);
          }
        }}
      >
        <div className="flex min-w-0 flex-1 items-center space-x-1">
          {file.is_dir && (
            <button
              className="hover:bg-xp-surface-light flex-shrink-0 rounded p-0.5"
              onClick={(e) => {
                e.stopPropagation();
                onToggle(file.path);
              }}
              aria-label={isExpanded ? `Collapse ${file.name}` : `Expand ${file.name}`}
            >
              <svg
                className={`h-3 w-3 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          )}
          {!file.is_dir && <div className="w-4 flex-shrink-0" />}

          <span className="mr-2 flex-shrink-0 text-sm">{getFileIcon(file)}</span>
          <span className="file-entry-name flex-1 truncate">{file.name}</span>
        </div>
      </div>
    );
  },
);
TreeItemRow.displayName = 'TreeItemRow';

// Tree View Component
const TreeView = ({
  files,
  selectedFiles,
  getFileIcon,
  handleFileClick,
  handleFileDoubleClick,
  handleFileRightClick,
  handleBackgroundRightClick,
}: ViewComponentProps) => {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [folderContents, setFolderContents] = useState<Map<string, FileEntry[]>>(new Map());

  const toggleFolder = async (folderPath: string) => {
    setExpandedFolders((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(folderPath)) {
        newSet.delete(folderPath);
      } else {
        newSet.add(folderPath);
        // Load folder contents if not already loaded
        if (!folderContents.has(folderPath)) {
          loadFolderContents(folderPath);
        }
      }
      return newSet;
    });
  };

  const loadFolderContents = async (folderPath: string) => {
    try {
      const contents = await TauriAPI.readDirectory(folderPath);
      setFolderContents((prev) => new Map(prev.set(folderPath, contents)));
    } catch (error) {
      console.error('Failed to load folder contents:', error);
      // Set empty array on error so we don't keep trying
      setFolderContents((prev) => new Map(prev.set(folderPath, [])));
    }
  };

  // Sort files: directories first, then by name
  const sortedFiles = useMemo(
    () =>
      [...files].sort((a, b) => {
        if (a.is_dir && !b.is_dir) return -1;
        if (!a.is_dir && b.is_dir) return 1;
        return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
      }),
    [files],
  );

  const renderFileItem = (
    file: FileEntry,
    depth: number = 0,
    siblings: FileEntry[] = sortedFiles,
  ) => (
    <div key={`${file.path}-${depth}`}>
      <TreeItemRow
        file={file}
        depth={depth}
        siblings={siblings}
        selectedFiles={selectedFiles}
        isExpanded={expandedFolders.has(file.path)}
        getFileIcon={getFileIcon}
        onToggle={toggleFolder}
        onFileClick={handleFileClick}
        onFileDoubleClick={handleFileDoubleClick}
        onFileRightClick={handleFileRightClick}
      />

      {/* Show nested content if expanded */}
      {file.is_dir && expandedFolders.has(file.path) && (
        <div role="group">
          {folderContents.has(file.path) ? (
            folderContents
              .get(file.path)
              ?.sort((a, b) => {
                // Sort children: directories first, then alphabetically
                if (a.is_dir && !b.is_dir) return -1;
                if (!a.is_dir && b.is_dir) return 1;
                return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
              })
              ?.map((childFile, _i, sortedChildren) =>
                renderFileItem(childFile, depth + 1, sortedChildren),
              )
          ) : (
            <div
              className="text-xp-text-muted flex items-center py-1 text-xs"
              style={{ paddingLeft: `${(depth + 1) * 20 + 8}px` }}
            >
              <svg className="mr-2 h-3 w-3 animate-spin" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z"
                  clipRule="evenodd"
                />
              </svg>
              Loading...
            </div>
          )}
        </div>
      )}
    </div>
  );

  return (
    <div
      className="overflow-hidden text-sm"
      role="tree"
      aria-label="File tree"
      onContextMenu={handleBackgroundRightClick || undefined}
    >
      {sortedFiles.map((file) => renderFileItem(file, 0))}
    </div>
  );
};

export default TreeView;
