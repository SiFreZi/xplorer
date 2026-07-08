import { useCallback, useRef } from 'react';
import { startDrag } from '@crabnebula/tauri-plugin-drag';
import { resolveResource } from '@tauri-apps/api/path';
import type { FileEntry } from '@/lib/tauri-api';
import { useDragDropContext } from '@/contexts/DragDropContext';

interface UseDraggableOptions {
  file: FileEntry;
  selectedFiles: Set<string>;
  allFiles: FileEntry[];
}

const DRAG_THRESHOLD = 5; // pixels before drag starts

let _dragIconPath: string | null = null;
const getDragIconPath = async (): Promise<string> => {
  if (_dragIconPath !== null) return _dragIconPath;
  try {
    _dragIconPath = await resolveResource('icons/icon.png');
  } catch (err) {
    console.error('Failed to resolve drag icon resource:', err);
    _dragIconPath = '';
  }
  return _dragIconPath;
};

// Warm the icon path at module load so the very first drag has a valid icon.
// tauri-plugin-drag requires a non-empty image path on Windows.
void getDragIconPath();

/**
 * Native drag hook using tauri-plugin-drag.
 * Uses mousedown/mousemove to detect drag intent, then calls startDrag()
 * which creates an OS-level drag operation (works for internal drops AND
 * dragging to desktop/other apps).
 */
export const useDraggable = ({ file, selectedFiles, allFiles }: UseDraggableOptions) => {
  const mouseDownRef = useRef<{ x: number; y: number } | null>(null);
  const draggingRef = useRef(false);
  const { startInternalDrag, endDrag } = useDragDropContext();

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return; // only left button
    mouseDownRef.current = { x: e.clientX, y: e.clientY };
    draggingRef.current = false;
  }, []);

  const onMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!mouseDownRef.current || draggingRef.current) return;

      const dx = e.clientX - mouseDownRef.current.x;
      const dy = e.clientY - mouseDownRef.current.y;
      if (Math.abs(dx) + Math.abs(dy) < DRAG_THRESHOLD) return;

      draggingRef.current = true;
      mouseDownRef.current = null;

      // Determine which files to drag
      let pathsToDrag: string[];
      if (selectedFiles.has(file.path) && selectedFiles.size > 1) {
        pathsToDrag = allFiles.filter((f) => selectedFiles.has(f.path)).map((f) => f.path);
      } else {
        pathsToDrag = [file.path];
      }

      // Notify context this is an internal drag (default operation: move).
      startInternalDrag(pathsToDrag);

      // Always advertise COPY as the native OS effect. Our OWN window (WebView2)
      // is the drop target for internal drags and requests COPY by default; if we
      // advertised MOVE only, Windows would show the "not allowed" cursor and
      // reject the drop. The ACTUAL copy-vs-move is decided by DragDropContext
      // from the live Ctrl state at drop time (Ctrl during the drag => copy),
      // independent of this OS effect.
      // Start native Tauri drag — OS handles visuals + drop
      // When dropped back in our window, onDragDropEvent fires
      // When dropped on desktop/another app, OS handles it
      getDragIconPath().then((icon) => {
        startDrag({ item: pathsToDrag, icon, mode: 'copy' })
          .catch((err) => {
            console.error('startDrag failed:', err);
          })
          .finally(() => {
            // The native drag has fully ended (dropped or cancelled). Reset any
            // lingering drag state — for drops OUTSIDE our window no Tauri
            // drag-drop event fires, so this is the only reliable reset point.
            endDrag();
          });
      });
    },
    [file.path, selectedFiles, allFiles, startInternalDrag, endDrag],
  );

  const onMouseUp = useCallback(() => {
    mouseDownRef.current = null;
    draggingRef.current = false;
  }, []);

  const onMouseLeave = useCallback(() => {
    // If mouse leaves the element before threshold, cancel tracking
    if (!draggingRef.current) {
      mouseDownRef.current = null;
    }
  }, []);

  return {
    onMouseDown,
    onMouseMove,
    onMouseUp,
    onMouseLeave,
  };
};
