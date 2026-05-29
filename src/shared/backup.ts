/** Export / import helpers shared by options + background. */
import {
  getPrompts, getFolders, getSettings, setPrompts, setFolders, setSettings,
} from './store';
import type { BackupFile, Prompt } from './types';
import { uuid } from './id';

export async function buildBackup(): Promise<BackupFile> {
  const [prompts, folders, settings] = await Promise.all([
    getPrompts(), getFolders(), getSettings(),
  ]);
  return {
    version: 1,
    app: 'snapprompt',
    exportedAt: Date.now(),
    prompts,
    folders,
    settings,
  };
}

export type ImportStrategy = 'skip' | 'overwrite' | 'duplicate';

export interface ImportResult {
  added: number;
  overwritten: number;
  skipped: number;
}

export async function importBackup(
  file: BackupFile,
  strategy: ImportStrategy,
): Promise<ImportResult> {
  if (file.app !== 'snapprompt') throw new Error('SnapPrompt 백업 파일이 아니에요.');
  const current = await getPrompts();
  const byId = new Map(current.map((p) => [p.id, p]));
  const result: ImportResult = { added: 0, overwritten: 0, skipped: 0 };

  for (const incoming of file.prompts ?? []) {
    if (byId.has(incoming.id)) {
      if (strategy === 'skip') { result.skipped++; continue; }
      if (strategy === 'overwrite') { byId.set(incoming.id, incoming); result.overwritten++; continue; }
      if (strategy === 'duplicate') {
        const copy: Prompt = { ...incoming, id: uuid() };
        byId.set(copy.id, copy);
        result.added++;
        continue;
      }
    } else {
      byId.set(incoming.id, incoming);
      result.added++;
    }
  }

  await setPrompts([...byId.values()]);

  // merge folders by id (additive)
  if (file.folders?.length) {
    const folders = await getFolders();
    const fIds = new Set(folders.map((f) => f.id));
    const merged = [...folders, ...file.folders.filter((f) => !fIds.has(f.id))];
    await setFolders(merged);
  }
  if (file.settings) await setSettings(file.settings);

  return result;
}

export function downloadBackup(file: BackupFile): void {
  const blob = new Blob([JSON.stringify(file, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const d = new Date(file.exportedAt);
  const stamp = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  a.href = url;
  a.download = `snapprompt-backup-${stamp}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
