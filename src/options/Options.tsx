import { useEffect, useMemo, useState } from 'preact/hooks';
import type { Settings, Prompt, Folder, ThemePref, LanguagePref, Snapshot, BackupFile, InsertionRecord } from '@shared/types';
import { DEFAULT_ALLOWED_HOSTS } from '@shared/types';
import {
  getSettings, setSettings, getPrompts, setPrompts, getFolders, setFolders,
  getSnapshots, restoreSnapshot, subscribe,
  contentChanged, pushVersion, makeVersion, getInsertions, clearInsertions,
} from '@shared/store';
import { applyTheme } from '@shared/theme';
import { buildBackup, downloadBackup, importBackup, type ImportStrategy } from '@shared/backup';
import { flattenTree, wouldCycle, folderPath } from '@shared/folders';
import { search } from '@shared/search';
import { extractVariables } from '@shared/variables';
import { STARTER_PACKS, buildPack, type StarterPack } from '@shared/starterpacks';
import { t, dateLocale } from '@shared/i18n';
import { uuid } from '@shared/id';
import { PromptOptionsEditor, type ImageOptionsValue } from '@/components/PromptOptionsEditor';
import { PromptHistory } from '@/components/PromptHistory';

type Tab = 'general' | 'stats' | 'history' | 'prompts' | 'folders' | 'tags' | 'backup' | 'shortcuts' | 'data' | 'about';

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
  async function addStarterPack(pack: StarterPack) {
    const folderName = t('pack.' + pack.id);
    if (folders.some((f) => f.name === folderName) && !confirm(t('opt.packs.dupConfirm', [folderName]))) return;
    const { folder, prompts: ps } = buildPack(pack, folderName);
    const nextFolders = [...folders, folder];
    const nextPrompts = [...ps, ...prompts];
    await Promise.all([setFolders(nextFolders), setPrompts(nextPrompts)]);
    setLocalFolders(nextFolders); setLocalPrompts(nextPrompts);
    flash(t('opt.packs.added', [folderName, ps.length]));
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
          <TabBtn id="stats" tab={tab} set={setTab} label={t('opt.nav.stats')} />
          <TabBtn id="history" tab={tab} set={setTab} label={t('opt.nav.history')} />
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
          {tab === 'general' && <General settings={settings} patch={patch} folders={folders} addPack={addStarterPack} />}
          {tab === 'stats' && <Stats prompts={prompts} folders={folders} />}
          {tab === 'history' && <History prompts={prompts} flash={flash} />}
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

/* Common sites where the floating button is often unwanted (NOT enabled by
   default — only offered as one-click quick-add chips). LLM sites excluded.
   one-click chips). Adding a site requests its host permission. */
/* ---------- General ---------- */
function General({ settings, patch, folders, addPack }: { settings: Settings; patch: (p: Partial<Settings>) => void; folders: Folder[]; addPack: (p: StarterPack) => void }) {
  // The floating button is available only on the built-in supported LLM sites
  // (the extension's static content-script hosts). allowedHosts = which of
  // those currently show it. Right-click / shortcut work on any site regardless.
  const inactiveHosts = DEFAULT_ALLOWED_HOSTS.filter((h) => !settings.allowedHosts.includes(h));
  function addHost(h: string) {
    if (!settings.allowedHosts.includes(h)) patch({ allowedHosts: [...settings.allowedHosts, h] });
  }
  function removeHost(h: string) {
    patch({ allowedHosts: settings.allowedHosts.filter((x) => x !== h) });
  }
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
            <option value="system">{t('opt.language.system')}</option><option value="ko">한국어</option><option value="en">English</option><option value="ja">日本語</option><option value="zh">中文</option>
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

      <div class="op-card" style="padding:16px;margin-bottom:16px">
        <div class="op-setting-label">{t('opt.packs')}</div>
        <div class="op-setting-hint" style="margin-bottom:10px">{t('opt.packs.hint')}</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          {STARTER_PACKS.map((p) => {
            const added = folders.some((f) => f.name === t('pack.' + p.id));
            return (
              <button
                class="op-btn secondary sm"
                key={p.id}
                style={added ? 'opacity:.6' : ''}
                title={added ? t('opt.packs.reAdd') : undefined}
                onClick={() => addPack(p)}
              >
                {added ? '✓' : '+'} {t('pack.' + p.id)} ({p.prompts.length})
              </button>
            );
          })}
        </div>
      </div>

      <div class="op-card" style="padding:16px">
        <div class="op-setting-label">{t('opt.sites')}</div>
        <div class="op-setting-hint" style="margin-bottom:10px">{t('opt.sites.hint')}</div>
        {settings.allowedHosts.length === 0
          ? <div style="font-size:11px;color:var(--text-muted);margin-bottom:10px">{t('opt.sites.empty')}</div>
          : <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:10px">
              {settings.allowedHosts.map((h) => (
                <span class="op-tagchip" key={h}>{h}<button onClick={() => removeHost(h)}><Close /></button></span>
              ))}
            </div>}
        {inactiveHosts.length > 0 && (
          <div style="display:flex;align-items:center;flex-wrap:wrap;gap:6px">
            <span style="font-size:11px;color:var(--text-muted)">{t('opt.sites.quickAdd')}</span>
            {inactiveHosts.map((h) => (
              <button class="op-btn secondary sm" key={h} onClick={() => addHost(h)}>+ {h}</button>
            ))}
          </div>
        )}
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
  const [editing, setEditing] = useState<Prompt | null>(null);

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

  if (editing) {
    return (
      <OptPromptEditor
        prompt={editing}
        folders={folders}
        onCancel={() => setEditing(null)}
        onSave={(upd) => { onChange(prompts.map((p) => (p.id === upd.id ? upd : p))); setEditing(null); flash(t('popup.toast.saved')); }}
        onDelete={() => { onChange(prompts.filter((p) => p.id !== editing.id)); setEditing(null); flash(t('popup.toast.deleted')); }}
      />
    );
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
            <div class="op-row" key={p.id}>
              <input type="checkbox" checked={selected.has(p.id)} onChange={() => toggle(p.id)} />
              <div style="flex:1;min-width:0;cursor:pointer" onClick={() => setEditing(p)}>
                <div class="op-row-title" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">{p.title || t('opt.prompts.untitled')}</div>
                <div class="op-row-sub">{folderPath(folders, p.folderId)}{p.tags.length ? ' · ' + p.tags.map((tg) => '#' + tg).join(' ') : ''}</div>
              </div>
              {p.variables.length > 0 && <span class="op-row-sub" style="flex-shrink:0;color:var(--text-accent)">{t('common.varsCount', [p.variables.length])}</span>}
              <button class="op-btn secondary sm" onClick={() => setEditing(p)}>{t('opt.prompts.edit')}</button>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

/* ---------- Inline prompt editor (in PromptsManager) ---------- */
function OptPromptEditor({
  prompt, folders, onSave, onCancel, onDelete,
}: {
  prompt: Prompt; folders: Folder[];
  onSave: (p: Prompt) => void; onCancel: () => void; onDelete: () => void;
}) {
  const [title, setTitle] = useState(prompt.title);
  const [body, setBody] = useState(prompt.body);
  const [folderId, setFolderId] = useState<string | null>(prompt.folderId);
  const [tags, setTags] = useState(prompt.tags.join(', '));
  const [memo, setMemo] = useState(prompt.memo ?? '');
  const [img, setImg] = useState<ImageOptionsValue>({
    kind: prompt.kind ?? 'general',
    negativePrompt: prompt.negativePrompt ?? '',
    negativeStyle: prompt.negativeStyle ?? 'label',
    params: prompt.params ?? [],
    references: prompt.references ?? [],
  });

  function save() {
    const next: Prompt = {
      ...prompt,
      title: title.trim() || t('common.newPrompt'),
      body,
      folderId,
      tags: tags.split(',').map((tg) => tg.trim().replace(/^#/, '')).filter(Boolean),
      memo: memo.trim() || null,
      variables: extractVariables(body + '\n' + img.negativePrompt),
      kind: img.kind,
      negativePrompt: img.negativePrompt.trim() || null,
      negativeStyle: img.negativeStyle,
      params: img.params,
      references: img.references,
      updatedAt: Date.now(),
    };
    if (contentChanged(prompt, next)) {
      next.versions = pushVersion(prompt.versions, makeVersion(prompt, prompt.updatedAt));
    }
    onSave(next);
  }
  function del() {
    if (!confirm(t('popup.deleteConfirm'))) return;
    onDelete();
  }

  return (
    <>
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px">
        <button class="op-btn secondary sm" onClick={onCancel}>← {t('common.back')}</button>
        <h2 class="op-panel-title" style="margin:0;font-size:var(--text-xl)">{t('opt.prompts.edit')}</h2>
      </div>
      <div class="op-card" style="padding:20px;display:flex;flex-direction:column;gap:14px">
        <div>
          <label class="op-setting-label">{t('common.title')}</label>
          <input class="op-input" style="width:100%;margin-top:6px" value={title} onInput={(e) => setTitle((e.target as HTMLInputElement).value)} />
        </div>
        <div>
          <label class="op-setting-label">{t('common.body')}</label>
          <textarea style="width:100%;margin-top:6px;min-height:160px;padding:10px;background:var(--bg-surface);border:1px solid var(--border-default);border-radius:var(--radius-md);color:var(--text-primary);font-family:var(--font-mono);font-size:12.5px;line-height:1.55;resize:vertical" value={body} onInput={(e) => setBody((e.target as HTMLTextAreaElement).value)} />
        </div>
        <PromptOptionsEditor value={img} onChange={setImg} body={body} />
        <div style="display:flex;gap:12px;flex-wrap:wrap">
          <div style="flex:1;min-width:160px">
            <label class="op-setting-label">{t('common.folder')}</label>
            <select class="op-select" style="width:100%;margin-top:6px" value={folderId ?? ''} onChange={(e) => setFolderId((e.target as HTMLSelectElement).value || null)}>
              <option value="">{t('common.uncategorized')}</option>
              {flattenTree(folders).map((f) => <option key={f.id} value={f.id}>{indent(f.depth)}{f.name}</option>)}
            </select>
          </div>
          <div style="flex:1;min-width:160px">
            <label class="op-setting-label">{t('common.tags')}</label>
            <input class="op-input" style="width:100%;margin-top:6px" value={tags} placeholder={t('common.tagsPlaceholder')} onInput={(e) => setTags((e.target as HTMLInputElement).value)} />
          </div>
        </div>
        <div>
          <label class="op-setting-label">{t('common.memo')}</label>
          <input class="op-input" style="width:100%;margin-top:6px" value={memo} placeholder={t('common.memoPlaceholder')} onInput={(e) => setMemo((e.target as HTMLInputElement).value)} />
        </div>
        {(prompt.versions?.length ?? 0) > 0 && (
          <PromptHistory
            versions={prompt.versions ?? []}
            current={{ title, body, kind: img.kind, negativePrompt: img.negativePrompt, negativeStyle: img.negativeStyle, params: img.params, references: img.references }}
            onRestore={(v) => {
              setTitle(v.title);
              setBody(v.body);
              setImg({
                kind: v.kind ?? 'general',
                negativePrompt: v.negativePrompt ?? '',
                negativeStyle: v.negativeStyle ?? 'label',
                params: v.params ?? [],
                references: v.references ?? [],
              });
            }}
          />
        )}
        <div style="display:flex;gap:8px;margin-top:4px">
          <button class="op-btn danger sm" onClick={del}>{t('common.delete')}</button>
          <div style="margin-left:auto;display:flex;gap:8px">
            <button class="op-btn secondary" onClick={onCancel}>{t('common.cancel')}</button>
            <button class="op-btn primary" onClick={save}>{t('common.save')}</button>
          </div>
        </div>
      </div>
    </>
  );
}

/* ---------- History (insertion log, Round D) ---------- */
function History({ prompts, flash }: { prompts: Prompt[]; flash: (m: string) => void }) {
  const [records, setRecords] = useState<InsertionRecord[]>([]);
  useEffect(() => { getInsertions().then(setRecords); }, []);

  const titleOf = (r: InsertionRecord) =>
    prompts.find((p) => p.id === r.promptId)?.title || r.title || t('common.newPrompt');

  async function clearAll() {
    if (!confirm(t('opt.history.clearConfirm'))) return;
    await clearInsertions();
    setRecords([]);
    flash(t('opt.history.cleared'));
  }
  async function copy(text: string) {
    await navigator.clipboard.writeText(text);
    flash(t('popup.toast.copied'));
  }

  return (
    <>
      <h2 class="op-panel-title">{t('opt.nav.history')}</h2>
      <p class="op-panel-desc">{t('opt.history.desc')}</p>
      {records.length > 0 && (
        <div style="display:flex;justify-content:flex-end;margin-bottom:12px">
          <button class="op-btn secondary sm" onClick={() => void clearAll()}>{t('opt.history.clearAll')}</button>
        </div>
      )}
      <div class="op-card">
        <div class="op-list">
          {records.length === 0 && (
            <div class="op-row"><span class="op-row-title" style="color:var(--text-muted)">{t('opt.history.empty')}</span></div>
          )}
          {records.map((r) => (
            <div class="op-row" key={r.id} style="align-items:flex-start">
              <div style="flex:1;min-width:0">
                <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
                  <span class="op-row-title">{titleOf(r)}</span>
                  <span class="op-row-sub">{new Date(r.at).toLocaleString(dateLocale())}</span>
                  {r.host && <span class="op-row-sub">· {r.host}</span>}
                </div>
                <div style="margin-top:4px;font-family:var(--font-mono);font-size:11.5px;color:var(--text-muted);white-space:pre-wrap;word-break:break-word;max-height:60px;overflow:hidden">{r.text.slice(0, 240)}</div>
              </div>
              <button class="op-btn secondary sm" onClick={() => void copy(r.text)}>{t('common.copy')}</button>
            </div>
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
    onChange(prompts.map((p) => ({ ...p, tags: p.tags.filter((tg) => tg !== tag) })));
  }
  function renameTag(oldTag: string, raw: string) {
    const nt = raw.trim().replace(/^#/, '');
    if (!nt || nt === oldTag) return;
    // renaming to an existing tag merges (Set dedupes within each prompt)
    onChange(prompts.map((p) => (
      p.tags.includes(oldTag)
        ? { ...p, tags: [...new Set(p.tags.map((tg) => (tg === oldTag ? nt : tg)))], updatedAt: Date.now() }
        : p
    )));
  }
  return (
    <>
      <h2 class="op-panel-title">{t('opt.nav.tags')}</h2>
      <p class="op-panel-desc">{t('opt.tags.desc')}</p>
      <div class="op-banner info" style="margin-bottom:16px">{t('opt.tags.listHint')}</div>
      <div class="op-card">
        <div class="op-list">
          {counts.length === 0 && <div class="op-row"><span class="op-row-title" style="color:var(--text-muted)">{t('opt.tags.empty')}</span></div>}
          {counts.map(([tag, cnt]) => (
            <div class="op-row" key={tag}>
              <span style="color:var(--text-accent);font-weight:var(--weight-semi)">#</span>
              <input class="op-input" style="flex:1" value={tag} onChange={(e) => renameTag(tag, (e.target as HTMLInputElement).value)} />
              <span class="op-row-sub">{cnt}</span>
              <button class="op-btn secondary sm" onClick={() => removeTag(tag)}>{t('common.delete')}</button>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

/* ---------- Backup ---------- */
function Backup({ settings, patch, flash, onRestore }: { settings: Settings; patch: (p: Partial<Settings>) => void; flash: (m: string) => void; onRestore: () => void }) {
  const [snapshots, setSnaps] = useState<Snapshot[]>([]);
  const [pending, setPending] = useState<{ file: BackupFile; conflicts: number } | null>(null);
  useEffect(() => { getSnapshots().then(setSnaps); }, []);

  async function doExport() { downloadBackup(await buildBackup()); patch({ lastBackupAt: Date.now() }); flash(t('opt.backup.toast.exported')); }
  async function doImport(e: Event) {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    input.value = ''; // allow re-importing the same file
    try {
      const data = JSON.parse(await file.text()) as BackupFile;
      const current = await getPrompts();
      const ids = new Set(current.map((p) => p.id));
      const conflicts = (data.prompts ?? []).filter((p) => ids.has(p.id)).length;
      if (conflicts === 0) await runImport(data, 'skip');
      else setPending({ file: data, conflicts });
    } catch (err) { flash(t('opt.backup.toast.importFail', [String(err)])); }
  }
  async function runImport(file: BackupFile, strategy: ImportStrategy) {
    try {
      const res = await importBackup(file, strategy);
      flash(t('opt.backup.toast.imported', [res.added, res.overwritten, res.skipped]));
      onRestore();
    } catch (err) { flash(t('opt.backup.toast.importFail', [String(err)])); }
    setPending(null);
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
      {settings.lastBackupAt != null && Date.now() - settings.lastBackupAt > 30 * 86_400_000 && (
        <div class="op-banner warn" style="gap:10px">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
          <span style="flex:1">{t('opt.backup.staleWarn', [Math.floor((Date.now() - settings.lastBackupAt) / 86_400_000)])}</span>
          <button class="op-btn secondary sm" onClick={doExport}>{t('opt.backup.exportNow')}</button>
        </div>
      )}
      {pending && (
        <div class="op-banner warn" style="gap:10px;flex-wrap:wrap;margin-bottom:16px">
          <span style="flex:1;min-width:200px">{t('opt.backup.importConflict', [pending.conflicts])}</span>
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            <button class="op-btn secondary sm" onClick={() => runImport(pending.file, 'skip')}>{t('opt.backup.skip')}</button>
            <button class="op-btn secondary sm" onClick={() => runImport(pending.file, 'overwrite')}>{t('opt.backup.overwrite')}</button>
            <button class="op-btn secondary sm" onClick={() => runImport(pending.file, 'duplicate')}>{t('opt.backup.dup')}</button>
            <button class="op-btn ghost sm" onClick={() => setPending(null)}>{t('common.cancel')}</button>
          </div>
        </div>
      )}
      <div class="op-card">
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
function Stat({ v, l }: { v: number | string; l: string }) {
  return <div style="text-align:center;padding:16px;background:var(--bg-subtle);border-radius:10px"><div style="font-size:var(--text-2xl);font-weight:700;color:var(--text-accent)">{v}</div><div style="font-size:var(--text-xs);color:var(--text-muted);margin-top:2px">{l}</div></div>;
}

/* ---------- Stats (Phase 3) ---------- */
function Stats({ prompts, folders }: { prompts: Prompt[]; folders: Folder[] }) {
  const totalUses = prompts.reduce((a, p) => a + p.useCount, 0);
  const avg = prompts.length ? totalUses / prompts.length : 0;
  const topUsed = [...prompts].filter((p) => p.useCount > 0).sort((a, b) => b.useCount - a.useCount).slice(0, 8);
  const maxUse = topUsed[0]?.useCount ?? 1;
  const tagCounts = (() => {
    const m = new Map<string, number>();
    for (const p of prompts) for (const tg of p.tags) m.set(tg, (m.get(tg) ?? 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
  })();
  const maxTag = tagCounts[0]?.[1] ?? 1;
  const neverUsed = prompts.filter((p) => p.useCount === 0);

  return (
    <>
      <h2 class="op-panel-title">{t('opt.nav.stats')}</h2>
      <p class="op-panel-desc">{t('opt.stats.desc')}</p>

      <div class="op-card" style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;padding:20px">
        <Stat v={prompts.length} l={t('opt.about.statPrompts')} />
        <Stat v={folders.length} l={t('opt.about.statFolders')} />
        <Stat v={totalUses} l={t('opt.stats.totalUses')} />
        <Stat v={avg.toFixed(1)} l={t('opt.stats.avgUses')} />
      </div>

      <div class="section-head">{t('opt.stats.topUsed')}</div>
      <div class="op-card" style="padding:16px;margin-top:8px">
        {topUsed.length === 0
          ? <div style="color:var(--text-muted);font-size:var(--text-sm)">{t('opt.stats.empty')}</div>
          : topUsed.map((p) => <BarRow key={p.id} label={p.title || t('opt.prompts.untitled')} value={p.useCount} max={maxUse} suffix={t('opt.stats.times', [p.useCount])} />)}
      </div>

      {tagCounts.length > 0 && (
        <>
          <div class="section-head">{t('opt.stats.topTags')}</div>
          <div class="op-card" style="padding:16px;margin-top:8px">
            {tagCounts.map(([tag, cnt]) => <BarRow key={tag} label={'#' + tag} value={cnt} max={maxTag} suffix={String(cnt)} accent />)}
          </div>
        </>
      )}

      {neverUsed.length > 0 && (
        <>
          <div class="section-head">{t('opt.stats.neverUsed')} ({neverUsed.length})</div>
          <div class="op-card" style="margin-top:8px">
            <div class="op-list">
              {neverUsed.slice(0, 10).map((p) => (
                <div class="op-row" key={p.id}><span class="op-row-title" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">{p.title || t('opt.prompts.untitled')}</span></div>
              ))}
              {neverUsed.length > 10 && <div class="op-row"><span class="op-row-sub">{t('opt.stats.more', [neverUsed.length - 10])}</span></div>}
            </div>
          </div>
        </>
      )}
    </>
  );
}

function BarRow({ label, value, max, suffix, accent }: { label: string; value: number; max: number; suffix: string; accent?: boolean }) {
  return (
    <div style="display:flex;align-items:center;gap:10px;padding:5px 0">
      <span style="width:42%;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:var(--text-sm)">{label}</span>
      <div class="op-bar" style="flex:1"><div style={`width:${Math.max(4, (value / max) * 100)}%${accent ? '' : ''}`} /></div>
      <span class="op-row-sub" style="width:52px;text-align:right">{suffix}</span>
    </div>
  );
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
