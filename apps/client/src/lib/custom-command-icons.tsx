/**
 * Selectable icons for user-defined custom context-menu commands. Shared by the
 * settings card (icon picker) and the context-menu factory (rendering).
 *
 * An icon is stored on each CustomCommand as either a registry name (below) or a
 * `data:` URL for a user-supplied custom image.
 */

import type { ReactNode } from 'react';
import {
  ExternalLink,
  Terminal,
  Code2,
  FileCode,
  Pencil,
  Play,
  Rocket,
  FolderOpen,
  Settings,
  GitBranch,
  GitFork,
  Package,
  Globe,
  Zap,
  Wrench,
  Box,
  Braces,
  type LucideIcon,
} from 'lucide-react';

type IconRenderer = (size: number) => ReactNode;

const lucide =
  (Icon: LucideIcon): IconRenderer =>
  (size) => <Icon size={size} />;

// ── App brand icons (simplified, monochrome, currentColor) ───────────────────

const VsCodeIcon: IconRenderer = (size) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M23.15 2.587L18.21.21a1.494 1.494 0 0 0-1.705.29l-9.46 8.63-4.12-3.128a.999.999 0 0 0-1.276.057L.327 7.261A1 1 0 0 0 .326 8.74L3.899 12 .326 15.26a1 1 0 0 0 .001 1.479L1.65 17.94a.999.999 0 0 0 1.276.057l4.12-3.128 9.46 8.63a1.492 1.492 0 0 0 1.704.29l4.942-2.377A1.5 1.5 0 0 0 24 20.06V3.939a1.5 1.5 0 0 0-.85-1.352zm-5.146 14.861L10.826 12l7.178-5.448v10.896z" />
  </svg>
);

const ZedIcon: IconRenderer = (size) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <rect x="2.5" y="2.5" width="19" height="19" rx="4" stroke="currentColor" strokeWidth="1.6" />
    <path
      d="M7 7.5h9.5L8 16.5h8"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

// ── Registry ─────────────────────────────────────────────────────────────────

const RENDERERS: Record<string, IconRenderer> = {
  'external-link': lucide(ExternalLink),
  vscode: VsCodeIcon,
  fork: lucide(GitFork),
  zed: ZedIcon,
  terminal: lucide(Terminal),
  code: lucide(Code2),
  'file-code': lucide(FileCode),
  pencil: lucide(Pencil),
  play: lucide(Play),
  rocket: lucide(Rocket),
  folder: lucide(FolderOpen),
  settings: lucide(Settings),
  git: lucide(GitBranch),
  package: lucide(Package),
  globe: lucide(Globe),
  zap: lucide(Zap),
  wrench: lucide(Wrench),
  box: lucide(Box),
  braces: lucide(Braces),
};

/** Ordered list of selectable named icons for the picker. */
export const CUSTOM_COMMAND_ICON_NAMES: string[] = Object.keys(RENDERERS);

/** Default icon name when a command has none set. */
export const DEFAULT_CUSTOM_COMMAND_ICON = 'external-link';

/** True when the icon value is a user-supplied custom image (data URL). */
export const isCustomImageIcon = (icon?: string): boolean => !!icon && icon.startsWith('data:');

/**
 * Render an icon value (registry name or `data:` image URL) at the given size.
 * Falls back to the default icon for unknown names.
 */
export const renderCustomCommandIcon = (icon: string | undefined, size: number): ReactNode => {
  if (isCustomImageIcon(icon)) {
    return (
      <img
        src={icon}
        width={size}
        height={size}
        alt=""
        style={{ objectFit: 'contain', display: 'inline-block', borderRadius: 2 }}
      />
    );
  }
  const renderer = (icon && RENDERERS[icon]) || RENDERERS[DEFAULT_CUSTOM_COMMAND_ICON];
  return renderer(size);
};
