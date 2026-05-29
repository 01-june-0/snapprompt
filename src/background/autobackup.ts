/**
 * Automatic JSON backup to the downloads folder (Phase 2).
 * Runs from the service worker, so it cannot use anchor downloads — instead it
 * hands a data: URL to chrome.downloads.download. Gated by settings.backupFrequency.
 */
import { buildBackup } from '@shared/backup';
import { getSettings, setSettings } from '@shared/store';
import type { BackupFrequency } from '@shared/types';

const DAY = 86_400_000;
const INTERVAL_MS: Record<Exclude<BackupFrequency, 'off'>, number> = {
  daily: DAY,
  weekly: 7 * DAY,
  monthly: 30 * DAY,
};

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

/** Download a backup now if the configured interval has elapsed. */
export async function maybeAutoBackup(): Promise<void> {
  const settings = await getSettings();
  if (settings.backupFrequency === 'off') return;

  const interval = INTERVAL_MS[settings.backupFrequency];
  if (settings.lastBackupAt && Date.now() - settings.lastBackupAt < interval) return;

  const backup = await buildBackup();
  if (backup.prompts.length === 0) return; // nothing to back up

  const json = JSON.stringify(backup, null, 2);
  // data: URL handles unicode via encodeURIComponent (no btoa Latin1 issues).
  const url = 'data:application/json;charset=utf-8,' + encodeURIComponent(json);
  const d = new Date(backup.exportedAt);
  const filename = `snapprompt/snapprompt-backup-${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}.json`;

  try {
    await chrome.downloads.download({ url, filename, saveAs: false, conflictAction: 'uniquify' });
    await setSettings({ lastBackupAt: Date.now() });
  } catch (e) {
    console.warn('[SnapPrompt] auto-backup failed:', e);
  }
}
