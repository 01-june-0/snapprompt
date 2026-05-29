import { useEffect, useMemo, useState } from 'preact/hooks';
import type { Prompt, Folder, SortMode } from '@shared/types';
import {
  getPrompts, getFolders, upsertPrompt, deletePrompt, subscribe,
} from '@shared/store';
import { search, sortPrompts } from '@shared/search';
import { extractVariables, substitute, hasVariables } from '@shared/variables';
import { sendToActiveTab, sendToBackground } from '@shared/messaging';
import { uuid } from '@shared/id';

type Screen = { kind: 'list' } | { kind: 'edit'; prompt: Prompt; isNew: boolean };

export function App() {
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [query, setQuery] = useState('');
  const [favOnly, setFavOnly] = useState(false);
  const [sort, setSort] = useState<SortMode>('recent-used');
  const [screen, setScreen] = useState<Screen>({ kind: 'list' });
  const [toast, setToast] = useState<string | null>(null);

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
    let list = favOnly ? prompts.filter((p) => p.favorite) : prompts;
    const searched = search(list, query).map((r) => r.prompt);
    return query.trim() ? searched : sortPrompts(searched, sort);
  }, [prompts, query, favOnly, sort]);

  async function doCopy(p: Prompt) {
    const text = hasVariables(p.body)
      ? substitute(p.body, {}, extractVariables(p.body))
      : p.body;
    await navigator.clipboard.writeText(text);
    await sendToBackground({ type: 'PROMPT_USED', promptId: p.id });
    flash('복사했어요');
  }
  async function doInsert(p: Prompt) {
    // Ask the content script to insert into the page's last-focused editable.
    // Works for textarea/input and contenteditable; on pages without a content
    // script (chrome://, web store, etc.) it falls back to clipboard copy.
    const res = await sendToActiveTab({ type: 'INSERT_PROMPT', promptId: p.id });
    if (!res.ok) {
      await doCopy(p);
      flash('이 페이지엔 삽입할 수 없어 복사했어요');
      return;
    }
    window.close();
  }
  async function toggleFav(p: Prompt) {
    await upsertPrompt({ ...p, favorite: !p.favorite, updatedAt: Date.now() });
  }

  if (screen.kind === 'edit') {
    return (
      <Editor
        prompt={screen.prompt}
        isNew={screen.isNew}
        folders={folders}
        onCancel={() => setScreen({ kind: 'list' })}
        onSaved={() => { setScreen({ kind: 'list' }); flash('저장했어요'); }}
        onDeleted={() => { setScreen({ kind: 'list' }); flash('삭제했어요'); }}
      />
    );
  }

  return (
    <div class="pp">
      <header class="pp-header">
        <div class="pp-mark"><Mark /></div>
        <div class="pp-name">SnapPrompt</div>
        <div class="pp-header-actions">
          <button class="pp-icon-btn" title="새 프롬프트" onClick={() => setScreen({ kind: 'edit', prompt: blankPrompt(), isNew: true })}><PlusIcon /></button>
          <button class="pp-icon-btn" title="설정" onClick={() => sendToBackground({ type: 'OPEN_OPTIONS' })}><GearIcon /></button>
        </div>
      </header>

      <div class="pp-toolbar">
        <div class="pp-search">
          <SearchIcon />
          <input value={query} placeholder="프롬프트 검색..." onInput={(e) => setQuery((e.target as HTMLInputElement).value)} />
        </div>
        <div class="pp-chips">
          <button class={`pp-chip${favOnly ? ' active' : ''}`} onClick={() => setFavOnly((v) => !v)}>
            <StarIcon size={11} /> 즐겨찾기
          </button>
          <select class="pp-sort" value={sort} onChange={(e) => setSort((e.target as HTMLSelectElement).value as SortMode)}>
            <option value="recent-used">최근 사용</option>
            <option value="recent-saved">최근 저장</option>
            <option value="most-used">자주 사용</option>
            <option value="name">이름순</option>
          </select>
        </div>
      </div>

      <div class="pp-body">
        {visible.length === 0 ? (
          <div class="pp-empty">
            <div class="ill"><SearchIcon size={28} /></div>
            <h3>{query ? '검색 결과가 없어요' : '아직 저장된 프롬프트가 없어요'}</h3>
            <p>{query ? '다른 키워드로 검색해보세요.' : '웹에서 텍스트를 선택해 우클릭하거나, 아래 버튼으로 추가하세요.'}</p>
          </div>
        ) : (
          visible.map((p) => (
            <div class="pp-card" key={p.id} onClick={() => setScreen({ kind: 'edit', prompt: p, isNew: false })}>
              <div class="pp-card-head">
                <button class={`pp-fav${p.favorite ? '' : ' off'}`} onClick={(e) => { e.stopPropagation(); void toggleFav(p); }}>
                  <StarIcon size={13} filled={p.favorite} />
                </button>
                <div class="pp-card-title">{p.title}</div>
                {p.variables.length > 0 && <span class="pp-vars">{p.variables.length} vars</span>}
              </div>
              <div class="pp-card-preview">{firstLine(p.body)}</div>
              <div class="pp-card-meta">
                {p.tags.slice(0, 3).map((t) => <span class="pp-tag" key={t}>{t}</span>)}
                <div class="pp-card-actions">
                  <button class="pp-action" onClick={(e) => { e.stopPropagation(); void doCopy(p); }}>복사</button>
                  <button class="pp-action primary" onClick={(e) => { e.stopPropagation(); void doInsert(p); }}>삽입</button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <footer class="pp-footer">
        <button class="pp-new" onClick={() => setScreen({ kind: 'edit', prompt: blankPrompt(), isNew: true })}>
          <PlusIcon /> 새 프롬프트
        </button>
        <span class="pp-count">{prompts.length}개</span>
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
  const vars = useMemo(() => extractVariables(body), [body]);

  async function save() {
    const now = Date.now();
    await upsertPrompt({
      ...prompt,
      title: title.trim() || firstLine(body) || '새 프롬프트',
      body,
      folderId,
      tags: tags.split(',').map((t) => t.trim().replace(/^#/, '')).filter(Boolean),
      variables: vars,
      updatedAt: now,
      createdAt: isNew ? now : prompt.createdAt,
    });
    onSaved();
  }
  async function remove() {
    await deletePrompt(prompt.id);
    onDeleted();
  }

  return (
    <div class="pp">
      <header class="pp-header">
        <button class="pp-back" onClick={onCancel}><ChevLeft /> 뒤로</button>
        <div class="pp-header-actions">
          {!isNew && <button class="pp-icon-btn" title="삭제" onClick={() => void remove()}><TrashIcon /></button>}
        </div>
      </header>
      <div class="pp-detail">
        <div class="pp-field">
          <label class="pp-flabel">제목</label>
          <input class="pp-input" value={title} onInput={(e) => setTitle((e.target as HTMLInputElement).value)} placeholder="제목" />
        </div>
        <div class="pp-field">
          <label class="pp-flabel">본문</label>
          <textarea class="pp-textarea" value={body} onInput={(e) => setBody((e.target as HTMLTextAreaElement).value)} placeholder="프롬프트 본문. 변수는 {{이름}} 또는 {{이름|기본값}}" />
        </div>
        {vars.length > 0 && (
          <div class="pp-field">
            <label class="pp-flabel">감지된 변수 {vars.length}개</label>
            <div>{vars.map((v) => <span class="pp-tag" key={v.name} style="margin:0 4px 4px 0">{`{{${v.name}}}`}</span>)}</div>
          </div>
        )}
        <div class="pp-field">
          <label class="pp-flabel">폴더</label>
          <select class="pp-select" value={folderId ?? ''} onChange={(e) => setFolderId((e.target as HTMLSelectElement).value || null)}>
            <option value="">분류 없음</option>
            {folders.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
        </div>
        <div class="pp-field">
          <label class="pp-flabel">태그 <span style="font-weight:400;color:var(--text-muted)">쉼표로 구분</span></label>
          <input class="pp-input" value={tags} placeholder="코딩, 리뷰" onInput={(e) => setTags((e.target as HTMLInputElement).value)} />
        </div>
      </div>
      <div class="pp-detail-foot">
        <button class="pp-btn ghost" onClick={onCancel}>취소</button>
        <button class="pp-btn primary" onClick={() => void save()}>저장</button>
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
