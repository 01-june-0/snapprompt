import { useEffect, useMemo, useState } from 'preact/hooks';
import type { Prompt, Folder, SortMode } from '@shared/types';
import {
  getPrompts, setPrompts as persistPrompts, getFolders, upsertPrompt, deletePrompt, subscribe,
} from '@shared/store';
import { search, sortPrompts } from '@shared/search';
import { extractVariables, substitute, hasVariables } from '@shared/variables';
import { sendToActiveTab, sendToBackground } from '@shared/messaging';
import { flattenTree, selfAndDescendants, countInFolder } from '@shared/folders';
import { renderMarkdown } from '@shared/markdown';
import { t } from '@shared/i18n';
import { uuid } from '@shared/id';

type Screen = { kind: 'list' } | { kind: 'edit'; prompt: Prompt; isNew: boolean };
type FolderFilter = 'all' | 'none' | string;

const VIEW_MODE = new URLSearchParams(location.search).get('mode'); // null | 'window' | 'panel'

export function App() {
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [query, setQuery] = useState('');
  const [favOnly, setFavOnly] = useState(false);
  const [sort, setSort] = useState<SortMode>('recent-used');
  const [folderFilter, setFolderFilter] = useState<FolderFilter>('all');
  const [showSidebar, setShowSidebar] = useState(false);
  const [screen, setScreen] = useState<Screen>({ kind: 'list' });
  const [toast, setToast] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());

  async function reload() {
    const [p, f] = await Promise.all([getPrompts(), getFolders()]);
    setPrompts(p);
    setFolders(f);
  }
  useEffect(() => {
    reload();
    return subscribe(reload);
  }, []);

  function flash(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2200);
  }

  const visible = useMemo(() => {
    let list = prompts;
    if (folderFilter === 'none') list = list.filter((p) => !p.folderId);
    else if (folderFilter !== 'all') {
      const ids = selfAndDescendants(folders, folderFilter);
      list = list.filter((p) => p.folderId && ids.has(p.folderId));
    }
    if (favOnly) list = list.filter((p) => p.favorite);
    if (selectedTags.size) list = list.filter((p) => [...selectedTags].every((tg) => p.tags.includes(tg)));
    const searched = search(list, query).map((r) => r.prompt);
    return query.trim() ? searched : sortPrompts(searched, sort);
  }, [prompts, folders, query, favOnly, sort, folderFilter, selectedTags]);

  const allTags = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of prompts) for (const tg of p.tags) m.set(tg, (m.get(tg) ?? 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [prompts]);

  function toggleTag(tag: string) {
    setSelectedTags((s) => {
      const n = new Set(s);
      if (n.has(tag)) n.delete(tag);
      else n.add(tag);
      return n;
    });
  }

  const activeFolderLabel = useMemo(() => {
    if (folderFilter === 'all') return t('popup.allFolders');
    if (folderFilter === 'none') return t('common.uncategorized');
    return folders.find((f) => f.id === folderFilter)?.name ?? t('popup.allFolders');
  }, [folderFilter, folders]);

  async function doCopy(p: Prompt) {
    const text = hasVariables(p.body)
      ? substitute(p.body, {}, extractVariables(p.body))
      : p.body;
    await navigator.clipboard.writeText(text);
    await sendToBackground({ type: 'PROMPT_USED', promptId: p.id });
    flash(t('popup.toast.copied'));
  }
  async function doInsert(p: Prompt) {
    // Ask the content script to insert into the page's last-focused editable.
    // Works for textarea/input and contenteditable; on pages without a content
    // script (chrome://, web store, etc.) it falls back to clipboard copy.
    const res = await sendToActiveTab({ type: 'INSERT_PROMPT', promptId: p.id });
    if (!res.ok) {
      await doCopy(p);
      flash(t('popup.toast.insertFallback'));
      return;
    }
    // Toolbar popup is transient → close after insert. Side panel / detached
    // window stay open so the user can keep inserting multiple prompts.
    if (VIEW_MODE === null) window.close();
    else flash(t('popup.toast.inserted'));
  }
  async function toggleFav(p: Prompt) {
    await upsertPrompt({ ...p, favorite: !p.favorite, updatedAt: Date.now() });
  }

  function toggleSelect(id: string) {
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
    if (!showSidebar) setShowSidebar(true);
  }

  /** Move prompts to a folder (or null for uncategorized). Used by drag-and-drop. */
  async function moveToFolder(ids: string[], folderId: string | null) {
    if (ids.length === 0) return;
    const all = await getPrompts();
    const idSet = new Set(ids);
    const now = Date.now();
    await persistPrompts(all.map((p) => (idSet.has(p.id) ? { ...p, folderId, updatedAt: now } : p)));
    setSelected(new Set());
    flash(folderId ? t('popup.toast.movedFolder', [ids.length]) : t('popup.toast.movedNone', [ids.length]));
  }

  function dragIdsFor(p: Prompt): string[] {
    return selected.has(p.id) && selected.size > 0 ? [...selected] : [p.id];
  }

  /** Open the prompt UI in a freely-movable detached window. */
  async function openWindow() {
    await chrome.windows.create({
      url: chrome.runtime.getURL('src/popup/index.html?mode=window'),
      type: 'popup',
      width: 480,
      height: 640,
    });
    window.close();
  }
  /** Open the prompt UI docked in the side panel (Chrome 116+). */
  async function openSidePanel() {
    try {
      const win = await chrome.windows.getCurrent();
      // @ts-ignore — sidePanel.open is newer than some @types/chrome versions
      await chrome.sidePanel.open({ windowId: win.id });
      window.close();
    } catch {
      flash(t('popup.toast.panelFail'));
    }
  }
  function onFolderDrop(e: DragEvent, folderId: string | null) {
    e.preventDefault();
    const ids = (e.dataTransfer?.getData('text/plain') || '').split(',').filter(Boolean);
    void moveToFolder(ids, folderId);
    setDropTarget(null);
  }

  if (screen.kind === 'edit') {
    return (
      <Editor
        prompt={screen.prompt}
        isNew={screen.isNew}
        folders={folders}
        onCancel={() => setScreen({ kind: 'list' })}
        onSaved={() => { setScreen({ kind: 'list' }); flash(t('popup.toast.saved')); }}
        onDeleted={() => { setScreen({ kind: 'list' }); flash(t('popup.toast.deleted')); }}
      />
    );
  }

  return (
    <div class="pp">
      <header class="pp-header">
        <div class="pp-mark"><Mark /></div>
        <div class="pp-name">SnapPrompt</div>
        <div class="pp-header-actions">
          <button class="pp-icon-btn" title={t('common.newPrompt')} onClick={() => setScreen({ kind: 'edit', prompt: blankPrompt(), isNew: true })}><PlusIcon /></button>
          {VIEW_MODE === null && (
            <>
              <button class="pp-icon-btn" title={t('popup.openWindow')} onClick={() => void openWindow()}><WindowIcon /></button>
              <button class="pp-icon-btn" title={t('popup.openPanel')} onClick={() => void openSidePanel()}><PanelIcon /></button>
            </>
          )}
          <button class="pp-icon-btn" title={t('common.settings')} onClick={() => sendToBackground({ type: 'OPEN_OPTIONS' })}><GearIcon /></button>
        </div>
      </header>

      <div class="pp-toolbar">
        <div class="pp-search">
          <SearchIcon />
          <input value={query} placeholder={t('popup.search')} onInput={(e) => setQuery((e.target as HTMLInputElement).value)} />
        </div>
        <div class="pp-chips">
          <button class={`pp-chip${showSidebar || folderFilter !== 'all' ? ' active' : ''}`} onClick={() => setShowSidebar((v) => !v)} title={t('common.folder')}>
            <FolderIcon size={11} /> {activeFolderLabel}
            <ChevDown />
          </button>
          <button class={`pp-chip${favOnly ? ' active' : ''}`} onClick={() => setFavOnly((v) => !v)}>
            <StarIcon size={11} /> {t('popup.favorites')}
          </button>
          <select class="pp-sort" value={sort} onChange={(e) => setSort((e.target as HTMLSelectElement).value as SortMode)}>
            <option value="recent-used">{t('popup.sort.recentUsed')}</option>
            <option value="recent-saved">{t('popup.sort.recentSaved')}</option>
            <option value="most-used">{t('popup.sort.mostUsed')}</option>
            <option value="name">{t('popup.sort.name')}</option>
          </select>
        </div>
      </div>

      {selected.size > 0 && (
        <div class="pp-selbar">
          <span>{t('popup.selected', [selected.size])}</span>
          <button onClick={() => setSelected(new Set())}>{t('popup.clear')}</button>
        </div>
      )}

      <div class="pp-main">
        {showSidebar && (
          <aside class="pp-sidebar">
            <button class={`pp-folder${folderFilter === 'all' ? ' active' : ''}`} onClick={() => setFolderFilter('all')}>
              <FolderIcon size={12} /> {t('popup.all')} <span class="pp-fcount">{prompts.length}</span>
            </button>
            {flattenTree(folders).map((f) => (
              <button
                key={f.id}
                class={`pp-folder${folderFilter === f.id ? ' active' : ''}${dropTarget === f.id ? ' drop' : ''}`}
                style={`padding-left:${8 + f.depth * 14}px`}
                onClick={() => setFolderFilter(f.id)}
                onDragOver={(e) => { e.preventDefault(); if (dropTarget !== f.id) setDropTarget(f.id); }}
                onDragLeave={() => setDropTarget((t) => (t === f.id ? null : t))}
                onDrop={(e) => onFolderDrop(e, f.id)}
              >
                <FolderIcon size={12} /> <span class="pp-fname">{f.name}</span>
                <span class="pp-fcount">{countInFolder(folders, prompts.map((p) => p.folderId), f.id)}</span>
              </button>
            ))}
            <button
              class={`pp-folder${folderFilter === 'none' ? ' active' : ''}${dropTarget === 'none' ? ' drop' : ''}`}
              onClick={() => setFolderFilter('none')}
              onDragOver={(e) => { e.preventDefault(); if (dropTarget !== 'none') setDropTarget('none'); }}
              onDragLeave={() => setDropTarget((t) => (t === 'none' ? null : t))}
              onDrop={(e) => onFolderDrop(e, null)}
            >
              <DashIcon /> {t('common.uncategorized')} <span class="pp-fcount">{prompts.filter((p) => !p.folderId).length}</span>
            </button>

            {allTags.length > 0 && (
              <>
                <div class="pp-side-label">{t('common.tags')}</div>
                {allTags.map(([tag, cnt]) => (
                  <button
                    key={tag}
                    class={`pp-folder${selectedTags.has(tag) ? ' active' : ''}`}
                    onClick={() => toggleTag(tag)}
                  >
                    <span style="color:var(--text-accent)">#</span><span class="pp-fname">{tag}</span>
                    <span class="pp-fcount">{cnt}</span>
                  </button>
                ))}
              </>
            )}
          </aside>
        )}

        <div class="pp-body">
          {folderFilter === 'all' && !favOnly && !query && selectedTags.size === 0 && prompts.some((p) => p.favorite) && (
            <div class="pp-pinbar">
              {prompts.filter((p) => p.favorite).slice(0, 8).map((p) => (
                <button class="pp-pin" key={p.id} title={p.title} onClick={() => void doInsert(p)}>
                  <StarIcon size={11} /> <span>{p.title}</span>
                </button>
              ))}
            </div>
          )}
          {visible.length === 0 ? (
            <div class="pp-empty">
              <div class="ill"><SearchIcon size={28} /></div>
              <h3>{query ? t('popup.empty.search') : folderFilter !== 'all' ? t('popup.empty.folder') : t('popup.empty.none')}</h3>
              <p>{query ? t('popup.empty.hintSearch') : t('popup.empty.hintNone')}</p>
            </div>
          ) : (
            visible.map((p) => (
              <div
                class={`pp-card${selected.has(p.id) ? ' selected' : ''}`}
                key={p.id}
                draggable
                onDragStart={(e) => {
                  const ids = dragIdsFor(p);
                  e.dataTransfer?.setData('text/plain', ids.join(','));
                  if (e.dataTransfer) {
                    e.dataTransfer.effectAllowed = 'move';
                    // small custom drag image so the full-size card doesn't cover the folder tree
                    const ghost = document.createElement('div');
                    ghost.textContent = ids.length > 1 ? t('popup.dragMove', [ids.length]) : p.title;
                    ghost.className = 'pp-drag-ghost';
                    document.body.appendChild(ghost);
                    e.dataTransfer.setDragImage(ghost, 12, 12);
                    setTimeout(() => ghost.remove(), 0);
                  }
                  if (!showSidebar) setShowSidebar(true);
                }}
                onClick={() => setScreen({ kind: 'edit', prompt: p, isNew: false })}
              >
                <div class="pp-card-head">
                  <button class={`pp-check${selected.has(p.id) ? ' on' : ''}`} title={t('popup.select')} onClick={(e) => { e.stopPropagation(); toggleSelect(p.id); }}>
                    {selected.has(p.id) && <CheckIcon />}
                  </button>
                  <button class={`pp-fav${p.favorite ? '' : ' off'}`} onClick={(e) => { e.stopPropagation(); void toggleFav(p); }}>
                    <StarIcon size={13} filled={p.favorite} />
                  </button>
                  <div class="pp-card-title">{p.title}</div>
                  {p.variables.length > 0 && <span class="pp-vars">{p.variables.length} vars</span>}
                </div>
                <div class="pp-card-preview">{firstLine(p.body)}</div>
                <div class="pp-card-meta">
                  {p.tags.slice(0, 3).map((tag) => <span class="pp-tag" key={tag}>{tag}</span>)}
                  <div class="pp-card-actions">
                    <button class="pp-action" onClick={(e) => { e.stopPropagation(); void doCopy(p); }}>{t('common.copy')}</button>
                    <button class="pp-action primary" onClick={(e) => { e.stopPropagation(); void doInsert(p); }}>{t('common.insert')}</button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <footer class="pp-footer">
        <button class="pp-new" onClick={() => setScreen({ kind: 'edit', prompt: blankPrompt(), isNew: true })}>
          <PlusIcon /> {t('common.newPrompt')}
        </button>
        <span class="pp-count">{t('popup.count', [prompts.length])}</span>
      </footer>

      {toast && <div class="pp-toast"><span class="dot"><CheckIcon /></span>{toast}</div>}
    </div>
  );
}

/* ---------------- Editor ---------------- */
function Editor({
  prompt, isNew, folders, onCancel, onSaved, onDeleted,
}: {
  prompt: Prompt; isNew: boolean; folders: Folder[];
  onCancel: () => void; onSaved: () => void; onDeleted: () => void;
}) {
  const [title, setTitle] = useState(prompt.title);
  const [body, setBody] = useState(prompt.body);
  const [folderId, setFolderId] = useState<string | null>(prompt.folderId);
  const [tags, setTags] = useState(prompt.tags.join(', '));
  const [memo, setMemo] = useState(prompt.memo ?? '');
  const [preview, setPreview] = useState(false);
  const vars = useMemo(() => extractVariables(body), [body]);

  async function save() {
    const now = Date.now();
    await upsertPrompt({
      ...prompt,
      title: title.trim() || firstLine(body) || t('common.newPrompt'),
      body,
      folderId,
      tags: tags.split(',').map((tag) => tag.trim().replace(/^#/, '')).filter(Boolean),
      memo: memo.trim() || null,
      variables: vars,
      updatedAt: now,
      createdAt: isNew ? now : prompt.createdAt,
    });
    onSaved();
  }
  async function remove() {
    if (!confirm(t('popup.deleteConfirm'))) return;
    await deletePrompt(prompt.id);
    onDeleted();
  }

  return (
    <div class="pp">
      <header class="pp-header">
        <button class="pp-back" onClick={onCancel}><ChevLeft /> {t('common.back')}</button>
        <div class="pp-header-actions">
          {!isNew && <button class="pp-icon-btn" title={t('common.delete')} onClick={() => void remove()}><TrashIcon /></button>}
        </div>
      </header>
      <div class="pp-detail">
        <div class="pp-field">
          <label class="pp-flabel">{t('common.title')}</label>
          <input class="pp-input" value={title} onInput={(e) => setTitle((e.target as HTMLInputElement).value)} placeholder={t('common.title')} />
        </div>
        <div class="pp-field">
          <div style="display:flex;align-items:center;gap:8px">
            <label class="pp-flabel" style="flex:1">{t('common.body')}</label>
            <div class="pp-seg">
              <button class={preview ? '' : 'on'} onClick={() => setPreview(false)}>{t('common.edit')}</button>
              <button class={preview ? 'on' : ''} onClick={() => setPreview(true)}>{t('common.preview')}</button>
            </div>
          </div>
          {preview
            ? <div class="pp-md" dangerouslySetInnerHTML={{ __html: renderMarkdown(body) }} />
            : <textarea class="pp-textarea" value={body} onInput={(e) => setBody((e.target as HTMLTextAreaElement).value)} placeholder={t('popup.bodyPlaceholder')} />}
        </div>
        {vars.length > 0 && (
          <div class="pp-field">
            <label class="pp-flabel">{t('common.detectedVars', [vars.length])}</label>
            <div>{vars.map((v) => <span class="pp-tag" key={v.name} style="margin:0 4px 4px 0">{`{{${v.name}}}`}</span>)}</div>
          </div>
        )}
        <div class="pp-field">
          <label class="pp-flabel">{t('common.folder')}</label>
          <select class="pp-select" value={folderId ?? ''} onChange={(e) => setFolderId((e.target as HTMLSelectElement).value || null)}>
            <option value="">{t('common.uncategorized')}</option>
            {flattenTree(folders).map((f) => <option key={f.id} value={f.id}>{'  '.repeat(f.depth)}{f.name}</option>)}
          </select>
        </div>
        <div class="pp-field">
          <label class="pp-flabel">{t('common.tags')} <span style="font-weight:400;color:var(--text-muted)">{t('common.commaSeparated')}</span></label>
          <input class="pp-input" value={tags} placeholder={t('common.tagsPlaceholder')} onInput={(e) => setTags((e.target as HTMLInputElement).value)} />
        </div>
        <div class="pp-field">
          <label class="pp-flabel">{t('common.memo')} <span style="font-weight:400;color:var(--text-muted)">{t('common.optional')}</span></label>
          <input class="pp-input" value={memo} placeholder={t('common.memoPlaceholder')} onInput={(e) => setMemo((e.target as HTMLInputElement).value)} />
        </div>
      </div>
      <div class="pp-detail-foot">
        <button class="pp-btn ghost" onClick={onCancel}>{t('common.cancel')}</button>
        <button class="pp-btn primary" onClick={() => void save()}>{t('common.save')}</button>
      </div>
    </div>
  );
}

/* ---------------- helpers & icons ---------------- */
function blankPrompt(): Prompt {
  const now = Date.now();
  return {
    id: uuid(), title: '', body: '', variables: [], folderId: null, tags: [],
    memo: null, sourceUrl: null, favorite: false, createdAt: now, updatedAt: now,
    lastUsedAt: null, useCount: 0,
  };
}
function firstLine(body: string): string {
  return body.replace(/\s+/g, ' ').trim().slice(0, 80);
}

const Mark = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3h12l-2 8 4 5-7-2-7 4 2-9-4-4z" /></svg>;
const SearchIcon = ({ size = 14 }: { size?: number }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>;
const PlusIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>;
const GearIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>;
const StarIcon = ({ size = 13, filled = true }: { size?: number; filled?: boolean }) => <svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>;
const CheckIcon = () => <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12" /></svg>;
const ChevLeft = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><polyline points="15 18 9 12 15 6" /></svg>;
const TrashIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>;
const FolderIcon = ({ size = 12 }: { size?: number }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" /></svg>;
const ChevDown = () => <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polyline points="6 9 12 15 18 9" /></svg>;
const DashIcon = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9" /></svg>;
const WindowIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M3 9h18" /></svg>;
const PanelIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M15 4v16" /></svg>;
