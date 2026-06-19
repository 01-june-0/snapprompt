/**
 * Storage abstraction over chrome.storage.local.
 * - Typed getters/setters per entity
 * - onChanged subscription helper
 * - schema migration hook
 */
import {
  STORAGE_KEYS,
  DEFAULT_SETTINGS,
  DEFAULT_ALLOWED_HOSTS,
  SCHEMA_VERSION,
  MAX_SNAPSHOTS,
  MAX_VERSIONS,
  MAX_INSERTIONS,
  type Prompt,
  type Folder,
  type Settings,
  type Snapshot,
  type Meta,
  type PromptVersion,
  type InsertionRecord,
} from './types';

type Area = chrome.storage.StorageArea;

function area(): Area {
  return chrome.storage.local;
}

async function getRaw<T>(key: string, fallback: T): Promise<T> {
  const res = await area().get(key);
  return (res[key] as T) ?? fallback;
}

async function setRaw(key: string, value: unknown): Promise<void> {
  await area().set({ [key]: value });
}

/* ---------- Prompts ---------- */

export async function getPrompts(): Promise<Prompt[]> {
  return getRaw<Prompt[]>(STORAGE_KEYS.prompts, []);
}

export async function setPrompts(prompts: Prompt[]): Promise<void> {
  await setRaw(STORAGE_KEYS.prompts, prompts);
}

export async function upsertPrompt(prompt: Prompt): Promise<void> {
  const prompts = await getPrompts();
  const idx = prompts.findIndex((p) => p.id === prompt.id);
  if (idx >= 0) prompts[idx] = prompt;
  else prompts.unshift(prompt);
  await setPrompts(prompts);
}

export async function deletePrompt(id: string): Promise<void> {
  const prompts = await getPrompts();
  await setPrompts(prompts.filter((p) => p.id !== id));
}

export async function recordUsage(id: string): Promise<void> {
  const prompts = await getPrompts();
  const p = prompts.find((x) => x.id === id);
  if (!p) return;
  p.useCount += 1;
  p.lastUsedAt = Date.now();
  await setPrompts(prompts);
}

/* ---------- History: edit versions (Round D) ---------- */

/** Snapshot a prompt's current editable content as a version entry. */
export function makeVersion(p: Pick<Prompt,
  'title' | 'body' | 'kind' | 'negativePrompt' | 'negativeStyle' | 'params' | 'references'>,
  at: number,
): PromptVersion {
  return {
    at,
    title: p.title,
    body: p.body,
    kind: p.kind,
    negativePrompt: p.negativePrompt,
    negativeStyle: p.negativeStyle,
    params: p.params,
    references: p.references,
  };
}

/** True when the editable content of two prompts/versions differs. */
export function contentChanged(
  a: Pick<Prompt, 'title' | 'body' | 'negativePrompt' | 'kind' | 'params' | 'references' | 'negativeStyle'>,
  b: Pick<Prompt, 'title' | 'body' | 'negativePrompt' | 'kind' | 'params' | 'references' | 'negativeStyle'>,
): boolean {
  const norm = (p: typeof a) => JSON.stringify({
    title: p.title, body: p.body, kind: p.kind ?? 'general',
    negativePrompt: p.negativePrompt ?? '', negativeStyle: p.negativeStyle ?? 'label',
    params: p.params ?? [], references: p.references ?? [],
  });
  return norm(a) !== norm(b);
}

/** Prepend a version, dropping the oldest beyond MAX_VERSIONS. */
export function pushVersion(versions: PromptVersion[] | undefined, v: PromptVersion): PromptVersion[] {
  return [v, ...(versions ?? [])].slice(0, MAX_VERSIONS);
}

/* ---------- History: insertion log (Round D) ---------- */

export async function getInsertions(): Promise<InsertionRecord[]> {
  return getRaw<InsertionRecord[]>(STORAGE_KEYS.insertions, []);
}

export async function addInsertion(rec: InsertionRecord): Promise<void> {
  const list = await getInsertions();
  await setRaw(STORAGE_KEYS.insertions, [rec, ...list].slice(0, MAX_INSERTIONS));
}

export async function clearInsertions(): Promise<void> {
  await setRaw(STORAGE_KEYS.insertions, []);
}

/* ---------- Folders ---------- */

export async function getFolders(): Promise<Folder[]> {
  return getRaw<Folder[]>(STORAGE_KEYS.folders, []);
}

export async function setFolders(folders: Folder[]): Promise<void> {
  await setRaw(STORAGE_KEYS.folders, folders);
}

/* ---------- Settings ---------- */

export async function getSettings(): Promise<Settings> {
  const stored = await getRaw<Partial<Settings>>(STORAGE_KEYS.settings, {});
  return { ...DEFAULT_SETTINGS, ...stored };
}

export async function setSettings(patch: Partial<Settings>): Promise<Settings> {
  const next = { ...(await getSettings()), ...patch };
  await setRaw(STORAGE_KEYS.settings, next);
  return next;
}

/* ---------- Snapshots ---------- */

export async function getSnapshots(): Promise<Snapshot[]> {
  return getRaw<Snapshot[]>(STORAGE_KEYS.snapshots, []);
}

/** Capture a snapshot of the current data, keeping at most MAX_SNAPSHOTS. */
export async function takeSnapshot(): Promise<void> {
  const [prompts, folders, snapshots] = await Promise.all([
    getPrompts(),
    getFolders(),
    getSnapshots(),
  ]);
  const snap: Snapshot = { createdAt: Date.now(), prompts, folders };
  const next = [snap, ...snapshots].slice(0, MAX_SNAPSHOTS);
  await setRaw(STORAGE_KEYS.snapshots, next);
}

/** Take a rollback snapshot if the newest one is older than ~a day. Called on
 * app open (popup/options) — replaces the former daily alarm (no alarms perm). */
export async function maybeSnapshot(): Promise<void> {
  const snaps = await getSnapshots();
  const newest = snaps[0]?.createdAt ?? 0;
  if (Date.now() - newest > 24 * 60 * 60 * 1000) await takeSnapshot();
}

export async function restoreSnapshot(createdAt: number): Promise<boolean> {
  const snapshots = await getSnapshots();
  const snap = snapshots.find((s) => s.createdAt === createdAt);
  if (!snap) return false;
  await Promise.all([setPrompts(snap.prompts), setFolders(snap.folders)]);
  return true;
}

/* ---------- Meta / migration ---------- */

export async function ensureSchema(): Promise<void> {
  const meta = await getRaw<Meta | null>(STORAGE_KEYS.meta, null);
  const from = meta?.schemaVersion ?? 0;
  // v2: blacklist (disabledHosts) → allowlist (allowedHosts); drop downloads/alarms-era fields
  if (from < 2) await migrateToV2();
  if (!meta || meta.schemaVersion !== SCHEMA_VERSION) {
    await setRaw(STORAGE_KEYS.meta, { schemaVersion: SCHEMA_VERSION } as Meta);
  }
}

async function migrateToV2(): Promise<void> {
  const raw = await getRaw<Record<string, unknown> | null>(STORAGE_KEYS.settings, null);
  if (!raw) return; // fresh install — DEFAULT_SETTINGS already seeds allowedHosts
  if (!Array.isArray(raw.allowedHosts)) raw.allowedHosts = [...DEFAULT_ALLOWED_HOSTS];
  delete raw.disabledHosts;
  delete raw.backupFrequency;
  await setRaw(STORAGE_KEYS.settings, raw);
}

/* ---------- onChanged subscription ---------- */

export type StoreListener = () => void;

/** Subscribe to any SnapPrompt data change. Returns an unsubscribe fn. */
export function subscribe(listener: StoreListener): () => void {
  const handler = (
    changes: Record<string, chrome.storage.StorageChange>,
    areaName: string,
  ) => {
    if (areaName !== 'local') return;
    const keys = Object.values(STORAGE_KEYS) as string[];
    if (Object.keys(changes).some((k) => keys.includes(k))) listener();
  };
  chrome.storage.onChanged.addListener(handler);
  return () => chrome.storage.onChanged.removeListener(handler);
}
