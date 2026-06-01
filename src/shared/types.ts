/**
 * SnapPrompt — core data model
 * See docs/PRD.md §6
 */

export type VariableType =
  | 'text' | 'textarea' | 'select' | 'date' | 'number' | 'color'
  | 'boolean' // toggle; controls {{#if name}} blocks
  | 'code';   // multi-line; wrapped in ``` on insert (options[0] = language)

/** A named set of variable values that can be applied at once. */
export interface VariablePreset {
  name: string;
  values: Record<string, string>;
}

export interface Variable {
  /** The `name` part of {{name}} */
  name: string;
  /** Input type, parsed from `{{name:type(...)}}` (Phase 3) */
  type: VariableType;
  /** The `default` part of {{name|default}}, or null */
  defaultValue: string | null;
  /** Options for `type: 'select'`, parsed from `{{name:select(a,b,c)}}` */
  options: string[];
  /** Last entered value (used when settings.rememberVariableValues is on) */
  lastValue: string | null;
  /** Whether to render a multi-line textarea (true when type === 'textarea') */
  multiline: boolean;
}

export interface Prompt {
  id: string;
  title: string;
  body: string;
  variables: Variable[];
  /** null = "분류 없음" (uncategorized) */
  folderId: string | null;
  tags: string[];
  memo: string | null;
  sourceUrl: string | null;
  favorite: boolean;
  /** Saved fill-sets for the variables (Round A). */
  presets?: VariablePreset[];
  createdAt: number;
  updatedAt: number;
  lastUsedAt: number | null;
  useCount: number;
}

export interface Folder {
  id: string;
  name: string;
  /** null = top-level. Unlimited nesting depth. */
  parentId: string | null;
  createdAt: number;
  /** Sort order within the same parent */
  order: number;
}

export type ThemePref = 'system' | 'light' | 'dark';
export type LanguagePref = 'system' | 'ko' | 'en';
export type BackupFrequency = 'off' | 'daily' | 'weekly' | 'monthly';
export type InsertionMode = 'auto' | 'clipboard-fallback';
export type SortMode = 'recent-used' | 'recent-saved' | 'most-used' | 'name';

/** How the toolbar icon opens SnapPrompt; remembered across sessions. */
export type PopupMode = 'default' | 'window' | 'panel';

export interface Settings {
  floatingButton: boolean;
  backupFrequency: BackupFrequency;
  lastBackupAt: number | null;
  defaultFolderId: string | null;
  insertionMode: InsertionMode;
  rememberVariableValues: boolean;
  theme: ThemePref;
  language: LanguagePref;
  onboardingCompletedAt: number | null;
  /** Hosts where the content-script UI is disabled (Phase 2) */
  disabledHosts: string[];
  /** Last-used open mode for the toolbar action (default popup / window / side panel) */
  popupMode: PopupMode;
}

export interface Snapshot {
  createdAt: number;
  prompts: Prompt[];
  folders: Folder[];
}

export interface BackupFile {
  version: 1;
  app: 'snapprompt';
  exportedAt: number;
  prompts: Prompt[];
  folders: Folder[];
  settings: Partial<Settings>;
}

export const SCHEMA_VERSION = 1 as const;

export interface Meta {
  schemaVersion: number;
}

/** Storage key namespace */
export const STORAGE_KEYS = {
  prompts: 'snapprompt:prompts',
  folders: 'snapprompt:folders',
  settings: 'snapprompt:settings',
  snapshots: 'snapprompt:snapshots',
  meta: 'snapprompt:meta',
} as const;

export const MAX_SNAPSHOTS = 7;

export const DEFAULT_SETTINGS: Settings = {
  floatingButton: true,
  backupFrequency: 'off',
  lastBackupAt: null,
  defaultFolderId: null,
  insertionMode: 'auto',
  rememberVariableValues: true,
  theme: 'system',
  language: 'system',
  onboardingCompletedAt: null,
  disabledHosts: [],
  popupMode: 'default',
};

/* ------------------------------------------------------------------ */
/* Messaging protocol (background <-> content <-> popup/options)       */
/* ------------------------------------------------------------------ */

export type Message =
  | { type: 'OPEN_PICKER' }
  | { type: 'SAVE_SELECTION'; text: string; sourceUrl: string }
  | { type: 'CAPTURE_AND_SAVE' }
  | { type: 'INSERT_PROMPT'; promptId: string }
  | { type: 'PROMPT_USED'; promptId: string }
  | { type: 'BACKUP_NOW' }
  | { type: 'OPEN_OPTIONS'; section?: string }
  | { type: 'SET_POPUP_MODE'; mode: PopupMode }
  | { type: 'PING' };

export type MessageResponse =
  | { ok: true; data?: unknown }
  | { ok: false; error: string };
