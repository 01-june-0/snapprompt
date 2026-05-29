import { useEffect, useMemo, useState } from 'preact/hooks';
import type { Settings, Prompt, Folder, ThemePref, LanguagePref, BackupFrequency, Snapshot } from '@shared/types';
import {
  getSettings, setSettings, getPrompts, setPrompts, getFolders, setFolders,
  getSnapshots, restoreSnapshot, subscribe,
} from '@shared/store';
import { applyTheme } from '@shared/theme';
import { buildBackup, downloadBackup, importBackup } from '@shared/backup';
import { sendToBackground } from '@shared/messaging';
import { flattenTree, wouldCycle, folderPath } from '@shared/folders';
import { search } from '@shared/search';
import { t } from '@shared/i18n';
import { uuid } from '@shared/id';

type Tab = 'general' | 'prompts' | 'folders' | 'tags' | 'backup' | 'shortcuts' | 'data' | 'about';

export function Options() {
  const [tab, setTab] = useState<Tab>('general');
  const [settings, setLocalSettings] = useState<Settings | null>(null);
  const [prompts, setLocalPrompts] = useState<Prompt[]>([]);
  const [folders, setLocalFolders] = useState<Folder[]>([]);
  const [toast, setToast] = useState<string | null>(null);

  async function reload() {
    const [s, p, f] = await Promise.all([getSettings(), getPrompts(), getFolders()]);
    setLocalSettings(s); setLocalPrompts(p); setLocalFolders(f);
  }
  useEffect(() => { reload(); return subscribe(reload); }, []);

  function flash(m: string) { setToast(m); setTimeout(() => setToast(null), 2200); }
  async function patch(p: Partial<Settings>) {
    const next = await setSettings(p);
    setLocalSettings(next);
    if (p.theme) applyTheme(p.theme);
  }

  if (!settings) return null;

  return (
    <>
      <header class="op-header">
        <div class="op-header-inner">
          <div class="op-mark"><Mark /></div>
          <div><div class="op-name">SnapPrompt</div><div class="op-sub">{t('opt.headerSub')}</div></div>
        </div>
      </header>
      <div class="op-layout">
        <nav class="op-nav">
          <TabBtn id="general" tab={tab} set={setTab} label={t('opt.nav.general')} />
          <TabBtn id="prompts" tab={tab} set={setTab} label={t('opt.nav.prompts')} />
          <TabBtn id="folders" tab={tab} set={setTab} label={t('opt.nav.folders')} />
          <TabBtn id="tags" tab={tab} set={setTab} label={t('opt.nav.tags')} />
          <TabBtn id="backup" tab={tab} set={setTab} label={t('opt.nav.backup')} />
          <TabBtn id="shortcuts" tab={tab} set={setTab} label={t('opt.nav.shortcuts')} />
          <div class="op-nav-sep" />
          <TabBtn id="data" tab={tab} set={setTab} label={t('opt.nav.data')} />
          <TabBtn id="about" tab={tab} set={setTab} label={t('opt.nav.about')} />
        </nav>
        <div>
          {tab === 'general' && <General settings={settings} patch={patch} folders={folders} />}
          {tab === 'prompts' && <PromptsManager prompts={prompts} folders={folders} flash={flash} onChange={async (p) => { await setPrompts(p); setLocalPrompts(p); }} />}
          {tab === 'folders' && <Folders folders={folders} onChange={async (f) => { await setFolders(f); setLocalFolders(f); }} />}
          {tab === 'tags' && <Tags prompts={prompts} onChange={async (p) => { await setPrompts(p); setLocalPrompts(p); flash(t('opt.tags.toast.cleaned')); }} />}
          {tab === 'backup' && <Backup settings={settings} patch={patch} flash={flash} onRestore={reload} />}
          {tab === 'shortcuts' && <Shortcuts />}
          {tab === 'data' && <Data prompts={prompts} folders={folders} flash={flash} onCleared={reload} />}
          {tab === 'about' && <About prompts={prompts} folders={folders} />}
        </div>
      </div>
      {toast && <div class="op-toast"><span class="dot"><Check /></span>{toast}</div>}
    </>
  );
}

function TabBtn({ id, tab, set, label }: { id: Tab; tab: Tab; set: (t: Tab) => void; label: string }) {
  return <button class={`op-tab${tab === id ? ' active' : ''}`} onClick={() => set(id)}><Dot /> {label}</button>;
}

/* ---------- General ---------- */
function General({ settings, patch, folders }: { settings: Settings; patch: (p: Partial<Settings>) => void; folders: Folder[] }) {
  return (
    <>
      <h2 class="op-panel-title">{t('opt.nav.general')}</h2>
      <p class="op-panel-desc">{t('opt.general.desc')}</p>
      <div class="op-card">
        <div class="op-setting">
          <div class="op-setting-info"><div class="op-setting-label">{t('opt.theme')}</div><div class="op-setting-hint">{t('opt.theme.hint')}</div></div>
          <Seg<ThemePref> value={settings.theme} options={[['system', t('opt.theme.system')], ['light', t('opt.theme.light')], ['dark', t('opt.theme.dark')]]} onChange={(v) => patch({ theme: v })} />
        </div>
        <div class="op-setting">
          <div class="op-setting-info"><div class="op-setting-label">{t('opt.language')}</div><div class="op-setting-hint">{t('opt.language.hint')}</div></div>
          <select class="op-select" value={settings.language} onChange={(e) => patch({ language: (e.target as HTMLSelectElement).value as LanguagePref })}>
            <option value="system">{t('opt.language.system')}</option><option value="ko">한국어</option><option value="en">English</option>
          </select>
        </div>
      </div>
      <div class="op-card">
        <Toggle label={t('opt.floating')} hint={t('opt.floating.hint')} checked={settings.floatingButton} onChange={(v) => patch({ floatingButton: v })} />
        <div class="op-setting">
          <div class="op-setting-info"><div class="op-setting-label">{t('opt.insertMode')}</div><div class="op-setting-hint">{t('opt.insertMode.hint')}</div></div>
          <Seg value={settings.insertionMode} options={[['auto', t('opt.insertMode.auto')], ['clipboard-fallback', t('opt.insertMode.clip')]]} onChange={(v) => patch({ insertionMode: v })} />
        </div>
        <Toggle label={t('opt.remember')} hint={t('opt.remember.hint')} checked={settings.rememberVariableValues} onChange={(v) => patch({ rememberVariableValues: v })} />
        <div class="op-setting">
          <div class="op-setting-info"><div class="op-setting-label">{t('opt.defaultFolder')}</div><div class="op-setting-hint">{t('opt.defaultFolder.hint')}</div></div>
          <select class="op-select" value={settings.defaultFolderId ?? ''} onChange={(e) => patch({ defaultFolderId: (e.target as HTMLSelectElement).value || null })}>
            <option value="">{t('common.uncategorized')}</option>
            {flattenTree(folders).map((f) => <option key={f.id} value={f.id}>{indent(f.depth)}{f.name}</option>)}
          </select>
        </div>
      </div>
    </>
  );
}

/* ---------- Folders ---------- */
function Folders({ folders, onChange }: { folders: Folder[]; onChange: (f: Folder[]) => void }) {
  const [name, setName] = useState('');
  const [parentId, setParentId] = useState<string | null>(null);
  const flat = useMemo(() => flattenTree(folders), [folders]);

  function add() {
    const n = name.trim();
    if (!n) return;
    const siblings = folders.filter((f) => f.parentId === parentId);
    onChange([...folders, { id: uuid(), name: n, parentId, createdAt: Date.now(), order: siblings.length }]);
    setName('');
    setParentId(null);
  }
  function rename(id: string, newName: string) {
    onChange(folders.map((f) => (f.id === id ? { ...f, name: newName } : f)));
  }
  function reparent(id: string, newParent: string | null) {
    if (wouldCycle(folders, id, newParent)) return; // ignore invalid move
    onChange(folders.map((f) => (f.id === id ? { ...f, parentId: newParent } : f)));
  }
  function remove(id: string) {
    const node = folders.find((f) => f.id === id);
    const promoteTo = node?.parentId ?? null; // children rise to grandparent
    onChange(
      folders
        .filter((f) => f.id !== id)
        .map((f) => (f.parentId === id ? { ...f, parentId: promoteTo } : f)),
    );
  }

  return (
    <>
      <h2 class="op-panel-title">{t('opt.nav.folders')}</h2>
      <p class="op-panel-desc">{t('opt.folders.desc')}</p>

      <div class="op-card" style="padding:16px;margin-bottom:16px">
        <div style="display:flex;gap:8px;align-items:center">
          <input class="op-input" style="flex:1" value={name} placeholder={t('opt.folders.namePlaceholder')} onInput={(e) => setName((e.target as HTMLInputElement).value)} onKeyDown={(e) => e.key === 'Enter' && add()} />
          <select class="op-select" value={parentId ?? ''} onChange={(e) => setParentId((e.target as HTMLSelectElement).value || null)}>
            <option value="">{t('common.topLevel')}</option>
            {flat.map((f) => <option key={f.id} value={f.id}>{indent(f.depth)}{f.name}</option>)}
          </select>
          <button class="op-btn primary sm" onClick={add}>{t('common.add')}</button>
        </div>
        <div style="font-size:11px;color:var(--text-muted);margin-top:8px">{t('opt.folders.parentHint')}</div>
      </div>

      <div class="op-card">
        <div class="op-list">
          {flat.length === 0 && <div class="op-row"><span class="op-row-title" style="color:var(--text-muted)">{t('opt.folders.empty')}</span></div>}
          {flat.map((f) => (
            <div class="op-row" key={f.id}>
              <span style={`width:${f.depth * 16}px;flex-shrink:0`} />
              {f.depth > 0 && <span style="color:var(--text-disabled);flex-shrink:0">└</span>}
              <input class="op-input" style="flex:1" value={f.name} onChange={(e) => rename(f.id, (e.target as HTMLInputElement).value)} />
              <select class="op-select" style="min-width:120px" value={f.parentId ?? ''} onChange={(e) => reparent(f.id, (e.target as HTMLSelectElement).value || null)}>
                <option value="">{t('common.topLevel')}</option>
                {flat.filter((o) => o.id !== f.id && !wouldCycle(folders, f.id, o.id)).map((o) => (
                  <option key={o.id} value={o.id}>{indent(o.depth)}{o.name}</option>
                ))}
              </select>
              <button class="op-btn secondary sm" onClick={() => remove(f.id)}>{t('common.delete')}</button>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

function indent(depth: number): string {
  return '  '.repeat(depth);
}

/* ---------- Prompts manager (F9.10) ---------- */
function PromptsManager({
  prompts, folders, onChange, flash,
}: {
  prompts: Prompt[]; folders: Folder[];
  onChange: (p: Prompt[]) => void; flash: (m: string) => void;
}) {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [tagToAdd, setTagToAdd] = useState('');

  const visible = useMemo(
    () => (query.trim() ? search(prompts, query).map((r) => r.prompt) : prompts),
    [prompts, query],
  );
  const allVisibleSelected = visible.length > 0 && visible.every((p) => selected.has(p.id));

  function toggle(id: string) {
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }
  function toggleAll() {
    setSelected(allVisibleSelected ? new Set() : new Set(visible.map((p) => p.id)));
  }
  function moveSelected(folderId: string | null) {
    const now = Date.now();
    onChange(prompts.map((p) => (selected.has(p.id) ? { ...p, folderId, updatedAt: now } : p)));
    flash(t('opt.prompts.toast.moved', [selected.size]));
    setSelected(new Set());
  }
  function addTagToSelected() {
    const tag = tagToAdd.trim().replace(/^#/, '');
    if (!tag) return;
    onChange(prompts.map((p) => (selected.has(p.id) && !p.tags.includes(tag) ? { ...p, tags: [...p.tags, tag], updatedAt: Date.now() } : p)));
    flash(t('opt.prompts.toast.tagAdded', [tag]));
    setTagToAdd('');
  }
  function deleteSelected() {
    if (!confirm(t('opt.prompts.deleteConfirm', [selected.size]))) return;
    onChange(prompts.filter((p) => !selected.has(p.id)));
    flash(t('opt.prompts.toast.deleted', [selected.size]));
    setSelected(new Set());
  }

  return (
    <>
      <h2 class="op-panel-title">{t('opt.nav.prompts')}</h2>
      <p class="op-panel-desc">{t('opt.prompts.desc')}</p>

      <div style="display:flex;gap:8px;margin-bottom:16px;align-items:center">
        <input class="op-input" style="flex:1" placeholder={t('opt.prompts.search')} value={query} onInput={(e) => setQuery((e.target as HTMLInputElement).value)} />
        <label style="display:flex;align-items:center;gap:6px;font-size:var(--text-sm);color:var(--text-secondary);cursor:pointer;white-space:nowrap">
          <input type="checkbox" checked={allVisibleSelected} onChange={toggleAll} /> {t('opt.prompts.selectAll')}
        </label>
      </div>

      {selected.size > 0 && (
        <div class="op-banner info" style="gap:10px;flex-wrap:wrap">
          <span style="font-weight:var(--weight-semi)">{t('opt.prompts.selected', [selected.size])}</span>
          <div style="display:flex;gap:8px;margin-left:auto;align-items:center;flex-wrap:wrap">
            <select class="op-select" value="__" onChange={(e) => { const v = (e.target as HTMLSelectElement).value; if (v !== '__') moveSelected(v === '' ? null : v); }}>
              <option value="__">{t('opt.prompts.moveTo')}</option>
              <option value="">{t('common.uncategorized')}</option>
              {flattenTree(folders).map((f) => <option key={f.id} value={f.id}>{indent(f.depth)}{f.name}</option>)}
            </select>
            <input class="op-input" style="width:120px" placeholder={t('opt.prompts.addTag')} value={tagToAdd} onInput={(e) => setTagToAdd((e.target as HTMLInputElement).value)} onKeyDown={(e) => e.key === 'Enter' && addTagToSelected()} />
            <button class="op-btn secondary sm" onClick={addTagToSelected}>{t('common.add')}</button>
            <button class="op-btn danger sm" onClick={deleteSelected}>{t('common.delete')}</button>
          </div>
        </div>
      )}

      <div class="op-card">
        <div class="op-list">
          {visible.length === 0 && <div class="op-row"><span class="op-row-title" style="color:var(--text-muted)">{query ? t('opt.prompts.emptySearch') : t('opt.prompts.emptyNone')}</span></div>}
          {visible.map((p) => (
            <label class="op-row" key={p.id} style="cursor:pointer">
              <input type="checkbox" checked={selected.has(p.id)} onChange={() => toggle(p.id)} />
              <div style="flex:1;min-width:0">
                <div class="op-row-title" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">{p.title || t('opt.prompts.untitled')}</div>
                <div class="op-row-sub">{folderPath(folders, p.folderId)}{p.tags.length ? ' · ' + p.tags.map((tg) => '#' + tg).join(' ') : ''}</div>
              </div>
              {p.variables.length > 0 && <span class="op-row-sub" style="flex-shrink:0;color:var(--text-accent)">{t('common.varsCount', [p.variables.length])}</span>}
            </label>
          ))}
        </div>
      </div>
    </>
  );
}

/* ---------- Tags ---------- */
function Tags({ prompts, onChange }: { prompts: Prompt[]; onChange: (p: Prompt[]) => void }) {
  const counts = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of prompts) for (const t of p.tags) map.set(t, (map.get(t) ?? 0) + 1);
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [prompts]);
  function removeTag(tag: string) {
    onChange(prompts.map((p) => ({ ...p, tags: p.tags.filter((t) => t !== tag) })));
  }
  return (
    <>
      <h2 class="op-panel-title">{t('opt.nav.tags')}</h2>
      <p class="op-panel-desc">{t('opt.tags.desc')}</p>
      <div class="op-card">
        <div class="op-tagwrap">
          {counts.length === 0 && <span style="color:var(--text-muted);font-size:var(--text-sm)">{t('opt.tags.empty')}</span>}
          {counts.map(([tag, cnt]) => (
            <span class="op-tagchip" key={tag}>
              <span class="hash">#</span>{tag}<span class="cnt">{cnt}</span>
              <button onClick={() => removeTag(tag)}><Close /></button>
            </span>
          ))}
        </div>
      </div>
    </>
  );
}

/* ---------- Backup ---------- */
function Backup({ settings, patch, flash, onRestore }: { settings: Settings; patch: (p: Partial<Settings>) => void; flash: (m: string) => void; onRestore: () => void }) {
  const [snapshots, setSnaps] = useState<Snapshot[]>([]);
  useEffect(() => { getSnapshots().then(setSnaps); }, []);

  async function doExport() { downloadBackup(await buildBackup()); flash(t('opt.backup.toast.exported')); }
  async function doImport(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      const res = await importBackup(data, 'duplicate');
      flash(t('opt.backup.toast.imported', [res.added, res.overwritten, res.skipped]));
      onRestore();
    } catch (err) { flash(t('opt.backup.toast.importFail', [String(err)])); }
  }
  async function restore(s: Snapshot) {
    await restoreSnapshot(s.createdAt);
    flash(t('opt.backup.toast.restored'));
    onRestore();
  }

  return (
    <>
      <h2 class="op-panel-title">{t('opt.nav.backup')}</h2>
      <p class="op-panel-desc">{t('opt.backup.desc')}</p>
      <div class="op-card">
        <Toggle label={t('opt.backup.auto')} hint={t('opt.backup.autoHint')} checked={settings.backupFrequency !== 'off'} onChange={(v) => patch({ backupFrequency: v ? 'weekly' : 'off' })} />
        <div class="op-setting">
          <div class="op-setting-info"><div class="op-setting-label">{t('opt.backup.freq')}</div><div class="op-setting-hint">{t('opt.backup.freqHint')}</div></div>
          <select class="op-select" value={settings.backupFrequency} disabled={settings.backupFrequency === 'off'} onChange={(e) => patch({ backupFrequency: (e.target as HTMLSelectElement).value as BackupFrequency })}>
            <option value="daily">{t('opt.freq.daily')}</option><option value="weekly">{t('opt.freq.weekly')}</option><option value="monthly">{t('opt.freq.monthly')}</option>
          </select>
        </div>
        <div class="op-setting">
          <div class="op-setting-info"><div class="op-setting-label">{t('opt.backup.now')}</div><div class="op-setting-hint">{t('opt.backup.nowHint')}</div></div>
          <button class="op-btn secondary sm" onClick={async () => {
            const res = await sendToBackground({ type: 'BACKUP_NOW' });
            flash(res.ok ? t('opt.backup.toast.now') : (res.error ?? t('opt.backup.toast.nowFail')));
          }}>{t('opt.backup.nowBtn')}</button>
        </div>
      </div>

      <div class="op-card" style="margin-top:16px">
        <div class="op-setting">
          <div class="op-setting-info"><div class="op-setting-label">{t('opt.backup.manual')}</div><div class="op-setting-hint">{t('opt.backup.manualHint')}</div></div>
          <div style="display:flex;gap:8px">
            <button class="op-btn secondary sm" onClick={doExport}>{t('opt.backup.export')}</button>
            <label class="op-btn secondary sm">{t('opt.backup.import')}<input type="file" accept="application/json" style="display:none" onChange={doImport} /></label>
          </div>
        </div>
      </div>

      <div class="op-card" style="margin-top:16px">
        <div class="op-list">
          <div class="op-row"><span class="op-row-title">{t('opt.backup.snapshots')}</span></div>
          {snapshots.length === 0 && <div class="op-row"><span class="op-row-sub">{t('opt.backup.snapshotsEmpty')}</span></div>}
          {snapshots.map((s) => (
            <div class="op-row" key={s.createdAt}>
              <div style="flex:1">
                <div class="op-row-title">{new Date(s.createdAt).toLocaleString()}</div>
                <div class="op-row-sub">{s.prompts.length} prompts · {s.folders.length} folders</div>
              </div>
              <button class="op-btn secondary sm" onClick={() => restore(s)}>{t('opt.backup.restore')}</button>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

/* ---------- Shortcuts ---------- */
function Shortcuts() {
  return (
    <>
      <h2 class="op-panel-title">{t('opt.nav.shortcuts')}</h2>
      <p class="op-panel-desc">{t('opt.shortcuts.desc')}</p>
      <div class="op-card">
        <div class="op-setting"><div class="op-setting-info"><div class="op-setting-label">{t('opt.shortcuts.picker')}</div><div class="op-setting-hint">{t('opt.shortcuts.pickerHint')}</div></div></div>
        <div class="op-setting"><div class="op-setting-info"><div class="op-setting-label">{t('opt.shortcuts.save')}</div><div class="op-setting-hint">{t('opt.shortcuts.saveHint')}</div></div></div>
      </div>
      <div class="op-banner info" style="margin-top:16px">
        {t('opt.shortcuts.banner')}
        <button class="op-btn primary sm" style="margin-left:auto" onClick={() => chrome.tabs.create({ url: 'chrome://extensions/shortcuts' })}>{t('opt.shortcuts.open')}</button>
      </div>
    </>
  );
}

/* ---------- Data ---------- */
function Data({ prompts, folders, flash, onCleared }: { prompts: Prompt[]; folders: Folder[]; flash: (m: string) => void; onCleared: () => void }) {
  const bytes = useMemo(() => new Blob([JSON.stringify({ prompts, folders })]).size, [prompts, folders]);
  async function clearAll() {
    if (!confirm(t('opt.data.clearConfirm'))) return;
    await Promise.all([setPrompts([]), setFolders([])]);
    flash(t('opt.data.toast.cleared'));
    onCleared();
  }
  return (
    <>
      <h2 class="op-panel-title">{t('opt.nav.data')}</h2>
      <p class="op-panel-desc">{t('opt.data.desc')}</p>
      <div class="op-card" style="padding:20px">
        <div style="display:flex;justify-content:space-between;margin-bottom:12px">
          <div class="op-setting-label">{t('opt.data.usage')}</div>
          <div class="op-row-sub">{(bytes / 1024).toFixed(1)} KB</div>
        </div>
        <div class="op-bar"><div style={`width:${Math.min(100, bytes / 50000 * 100)}%`} /></div>
        <div style="font-size:11px;color:var(--text-muted);margin-top:8px">{t('opt.data.usageHint', [prompts.length])}</div>
      </div>
      <div class="op-card op-danger-zone" style="margin-top:16px">
        <div class="op-setting">
          <div class="op-setting-info"><div class="op-setting-label" style="color:var(--danger-700)">{t('opt.data.clear')}</div><div class="op-setting-hint">{t('opt.data.clearHint')}</div></div>
          <button class="op-btn danger sm" onClick={clearAll}>{t('opt.data.clearBtn')}</button>
        </div>
      </div>
    </>
  );
}

/* ---------- About ---------- */
function About({ prompts, folders }: { prompts: Prompt[]; folders: Folder[] }) {
  const totalUse = prompts.reduce((a, p) => a + p.useCount, 0);
  return (
    <>
      <h2 class="op-panel-title">{t('opt.nav.about')}</h2>
      <p class="op-panel-desc">{t('opt.about.desc')}</p>
      <div class="op-card" style="padding:40px;text-align:center">
        <div style="width:64px;height:64px;border-radius:16px;background:var(--grad-primary);color:#fff;display:grid;place-items:center;margin:0 auto 16px"><Mark big /></div>
        <div style="font-size:var(--text-2xl);font-weight:700">SnapPrompt</div>
        <div style="color:var(--text-muted);font-size:var(--text-sm)">v1.0.0</div>
        <div style="color:var(--text-secondary);font-size:var(--text-sm);margin-top:12px">{t('opt.about.tagline')}</div>
      </div>
      <div class="op-card" style="margin-top:16px;display:grid;grid-template-columns:repeat(3,1fr);gap:12px;padding:20px">
        <Stat v={prompts.length} l={t('opt.about.statPrompts')} />
        <Stat v={folders.length} l={t('opt.about.statFolders')} />
        <Stat v={totalUse} l={t('opt.about.statUses')} />
      </div>
    </>
  );
}
function Stat({ v, l }: { v: number; l: string }) {
  return <div style="text-align:center;padding:16px;background:var(--bg-subtle);border-radius:10px"><div style="font-size:var(--text-2xl);font-weight:700;color:var(--text-accent)">{v}</div><div style="font-size:var(--text-xs);color:var(--text-muted);margin-top:2px">{l}</div></div>;
}

/* ---------- shared ---------- */
function Toggle({ label, hint, checked, onChange }: { label: string; hint: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div class="op-setting">
      <div class="op-setting-info"><div class="op-setting-label">{label}</div><div class="op-setting-hint">{hint}</div></div>
      <label class="op-toggle"><input type="checkbox" checked={checked} onChange={(e) => onChange((e.target as HTMLInputElement).checked)} /><span class="track" /></label>
    </div>
  );
}
function Seg<T extends string>({ value, options, onChange }: { value: T; options: [T, string][]; onChange: (v: T) => void }) {
  return <div class="op-seg">{options.map(([v, l]) => <button class={value === v ? 'active' : ''} onClick={() => onChange(v)} key={v}>{l}</button>)}</div>;
}

const Mark = ({ big }: { big?: boolean }) => <svg width={big ? 34 : 19} height={big ? 34 : 19} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3h12l-2 8 4 5-7-2-7 4 2-9-4-4z" /></svg>;
const Dot = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9" /></svg>;
const Check = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12" /></svg>;
const Close = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>;
