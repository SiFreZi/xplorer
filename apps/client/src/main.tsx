import React from 'react';
import ReactDOM from 'react-dom';
import { createRoot } from 'react-dom/client';
import './i18n';
import App from './App';
import './index.css';

// Expose React on window so extensions loaded via new Function() can access it
(window as unknown as Record<string, unknown>).React = React;
(window as unknown as Record<string, unknown>).ReactDOM = ReactDOM;

// Expose the Extension SDK so extensions can import from '@xplorer/extension-sdk'
import * as XplorerSDK from '@xplorer/extension-sdk';
(window as unknown as Record<string, unknown>).XplorerSDK = XplorerSDK;

// Install theme event bridge so extension themes register in the theme picker
import { installThemeEventBridge } from './lib/theme-registry';
installThemeEventBridge();

// Apply persisted font-size + accessibility settings before first paint so the
// UI is consistent from startup (not only after the Settings page is opened).
import { applyGlobalUiSettings, adjustRootFontPx } from './lib/utils';
applyGlobalUiSettings();

// Ctrl + mouse wheel zooms the whole UI (scales the rem-based root font size).
window.addEventListener(
  'wheel',
  (e: WheelEvent) => {
    if (!e.ctrlKey) return;
    e.preventDefault();
    adjustRootFontPx(e.deltaY < 0 ? 1 : -1);
  },
  { passive: false },
);

import { toast } from './hooks/use-toast';
window.addEventListener('xplorer:extension-toast', ((e: CustomEvent) => {
  const { title, description, variant } = e.detail;
  toast({ title, description, variant });
}) as EventListener);

window.addEventListener('unhandledrejection', (event) => {
  console.error('[Unhandled Promise Rejection]', event.reason);
});

createRoot(document.getElementById('root')!).render(<App />);
