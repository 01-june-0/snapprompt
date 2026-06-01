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

/* ---------- Image / video generation domain (Round C) ---------- */

/** What kind of prompt this is. `image`/`video` unlock generation options. */
export type PromptKind = 'general' | 'image' | 'video';

/** How a negative prompt is appended on insert. */
export type NegativeStyle =
  | 'label' // "\nNegative prompt: …"  (Stable Diffusion / generic)
  | 'mj';   // " --no a, b, c"          (Midjourney)

export type ParamControl = 'select' | 'text' | 'number' | 'toggle';

/**
 * A toggleable generation parameter appended to the prompt on insert.
 * `token` is a template whose `{}` is replaced by `value` (e.g. "--ar {}").
 * For `control: 'toggle'`, the bare `token` (no `{}`) is emitted when enabled.
 */
export interface ImageParam {
  id: string;
  label: string;
  token: string;
  control: ParamControl;
  value: string;
  options?: string[];
  enabled: boolean;
}

/** A reference image, prepended (as a URL) to the prompt on insert. */
export interface ReferenceImage {
  id: string;
  url: string;
  note?: string;
}

/* ---------- History / iteration (Round D) ---------- */

/** A snapshot of a prompt's editable content, captured on each edit. */
export interface PromptVersion {
  at: number;
  title: string;
  body: string;
  kind?: PromptKind;
  negativePrompt?: string | null;
  negativeStyle?: NegativeStyle;
  params?: ImageParam[];
  references?: ReferenceImage[];
}

/** A log entry for one insertion/copy of a prompt. */
export interface InsertionRecord {
  id: string;
  promptId: string;
  at: number;
  title: string;
  /** The final assembled text that was inserted/copied. */
  text: string;
  /** Variable values used at that time. */
  values: Record<string, string>;
  /** Host the prompt was used on, when known. */
  host?: string;
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
  /* ---- image/video generation extras (Round C); absent = general text prompt ---- */
  /** Prompt kind; missing/undefined is treated as 'general'. */
  kind?: PromptKind;
  /** Things to exclude (supports variables/conditionals). */
  negativePrompt?: string | null;
  /** How the negative prompt is appended; defaults to 'label'. */
  negativeStyle?: NegativeStyle;
  /** Toggleable generation parameters appended to the body. */
  params?: ImageParam[];
  /** Reference image URLs prepended to the body. */
  references?: ReferenceImage[];
  /** Edit-history snapshots (Round D); newest first, capped at MAX_VERSIONS. */
  versions?: PromptVersion[];
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
  insertions: 'snapprompt:insertions',
  meta: 'snapprompt:meta',
} as const;

export const MAX_SNAPSHOTS = 7;
/** Per-prompt edit-history snapshots kept (Round D). */
export const MAX_VERSIONS = 15;
/** Global insertion-log entries kept (Round D). */
export const MAX_INSERTIONS = 200;

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
  | { type: 'PROMPT_USED'; promptId: string; text?: string; values?: Record<string, string>; host?: string }
  | { type: 'BACKUP_NOW' }
  | { type: 'OPEN_OPTIONS'; section?: string }
  | { type: 'SET_POPUP_MODE'; mode: PopupMode }
  | { type: 'PING' };

export type MessageResponse =
  | { ok: true; data?: unknown }
  | { ok: false; error: string };
