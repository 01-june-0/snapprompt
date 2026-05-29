/** Content-script overlay UI: picker, variable modal, save modal, toast. */
import { useEffect, useRef, useState, useMemo } from 'preact/hooks';
import { signal } from '@preact/signals';
import type { Prompt, Folder, Variable } from '@shared/types';
import { getPrompts, getFolders, upsertPrompt, getSettings } from '@shared/store';
import { search, rankForPicker } from '@shared/search';
import { extractVariables, substitute, mergeVariables } from '@shared/variables';
import { insertText, copyToClipboard, captureActiveElement } from './insertion';
import { sendToBackground } from '@shared/messaging';
import { uuid } from '@shared/id';

/* ---------------- view state (signals) ---------------- */
type View =
  | { kind: 'none' }
  | { kind: 'picker' }
  | { kind: 'variables'; prompt: Prompt; mode: 'insert' | 'copy' }
  | { kind: 'save'; text: string; sourceUrl: string };

export const view = signal<View>({ kind: 'none' });
export const toast = signal<string | null>(null);

/** Floating-button state (Phase 2). Position is viewport-fixed coords. */
export const floatingEnabled = signal<boolean>(false);
export const floatingTarget = signal<{ x: number; y: number } | null>(null);

let toastTimer: ReturnType<typeof setTimeout> | undefined;
function showToast(msg: string) {
  toast.value = msg;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (toast.value = null), 2600);
}

export function openPicker() {
  captureActiveElement();
  view.value = { kind: 'picker' };
}
export function openSave(text: string, sourceUrl: string) {
  view.value = { kind: 'save', text, sourceUrl };
}
function close() {
  view.value = { kind: 'none' };
}

/**
 * Resolve a prompt: if it has variables, open the variable modal; otherwise
 * insert (or copy) immediately. Shared by the picker and the popup's Insert.
 */
export async function applyPrompt(prompt: Prompt, mode: 'insert' | 'copy') {
  const vars = extractVariables(prompt.body);
  if (vars.length > 0) {
    view.value = { kind: 'variables', prompt, mode };
    return;
  }
  if (mode === 'insert') {
    const res = await insertText(prompt.body);
    showToast(res === 'inserted' ? '삽입되었어요' : '클립보드에 복사했어요');
  } else {
    await copyToClipboard(prompt.body);
    showToast('클립보드에 복사했어요');
  }
  await sendToBackground({ type: 'PROMPT_USED', promptId: prompt.id });
  close();
}

/** Entry point used by the popup: insert a specific prompt by id. */
export async function insertPromptById(promptId: string) {
  const prompts = await getPrompts();
  const p = prompts.find((x) => x.id === promptId);
  if (!p) return;
  await applyPrompt(p, 'insert');
}

/* ---------------- icons ---------------- */
const IconSearch = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
);
const IconVars = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" /></svg>
);
const IconClose = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
);
const IconCheck = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
);

/* ---------------- root ---------------- */
export function ContentApp() {
  const v = view.value;
  return (
    <div class="sp-root">
      {v.kind === 'picker' && <Picker />}
      {v.kind === 'variables' && (
        <VariableModal prompt={v.prompt} mode={v.mode} />
      )}
      {v.kind === 'save' && <SaveModal text={v.text} sourceUrl={v.sourceUrl} />}
      {v.kind === 'none' && floatingEnabled.value && floatingTarget.value && (
        <FloatingButton x={floatingTarget.value.x} y={floatingTarget.value.y} />
      )}
      {toast.value && (
        <div class="sp-toast">
          <span class="dot"><IconCheck /></span>
          <span>{toast.value}</span>
        </div>
      )}
    </div>
  );
}

/* ---------------- Floating button ---------------- */
function FloatingButton({ x, y }: { x: number; y: number }) {
  return (
    <button
      class="sp-fab"
      style={`left:${x}px;top:${y}px`}
      title="SnapPrompt — 프롬프트 삽입"
      // prevent the editable from blurring when the button is pressed
      onMouseDown={(e) => e.preventDefault()}
      onClick={() => openPicker()}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3h12l-2 8 4 5-7-2-7 4 2-9-4-4z" /></svg>
    </button>
  );
}

/* ---------------- Picker ---------------- */
function Picker() {
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getPrompts().then((p) => setPrompts(rankForPicker(p)));
    inputRef.current?.focus();
  }, []);

  const results = useMemo(() => {
    if (!query.trim()) return prompts.map((prompt) => ({ prompt }));
    return search(prompts, query);
  }, [prompts, query]);

  useEffect(() => setActive(0), [query]);

  async function choose(prompt: Prompt) {
    await applyPrompt(prompt, 'insert');
  }

  function onKey(e: KeyboardEvent) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(a + 1, results.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); const r = results[active]; if (r) void choose(r.prompt); }
    else if (e.key === 'Escape') { e.preventDefault(); close(); }
  }

  return (
    <Backdrop position="top">
      <div class="sp-picker" onKeyDown={onKey}>
        <div class="sp-search">
          <IconSearch />
          <input
            ref={inputRef}
            value={query}
            placeholder="프롬프트 검색하거나 ↑↓로 탐색..."
            onInput={(e) => setQuery((e.target as HTMLInputElement).value)}
          />
          <span class="sp-kbd">Esc</span>
        </div>
        <div class="sp-meta">
          {query.trim() ? `검색 결과 · ${results.length}개` : '자주 사용 · 최근 사용'}
        </div>
        <div class="sp-list">
          {results.length === 0 && (
            <div class="sp-empty">
              <div class="sp-empty-title">결과가 없어요</div>
              <div>다른 키워드로 검색해보세요.</div>
            </div>
          )}
          {results.map((r, i) => (
            <div
              key={r.prompt.id}
              class={`sp-item${i === active ? ' active' : ''}`}
              onMouseEnter={() => setActive(i)}
              onClick={() => void choose(r.prompt)}
            >
              <div class="sp-item-icon"><IconVars /></div>
              <div class="sp-item-content">
                <div class="sp-item-title">{r.prompt.title}</div>
                <div class="sp-item-preview">{firstLine(r.prompt.body)}</div>
              </div>
              <div class="sp-item-meta">
                {r.prompt.variables.length > 0 && (
                  <span class="sp-vars">{r.prompt.variables.length} vars</span>
                )}
              </div>
            </div>
          ))}
        </div>
        <div class="sp-footer">
          <span>SnapPrompt</span>
          <span class="hints">
            <span><span class="sp-kbd">↑</span><span class="sp-kbd">↓</span> 탐색</span>
            <span><span class="sp-kbd">↵</span> 삽입</span>
            <span><span class="sp-kbd">Esc</span> 닫기</span>
          </span>
        </div>
      </div>
    </Backdrop>
  );
}

/* ---------------- Variable modal ---------------- */
function VariableModal({ prompt, mode }: { prompt: Prompt; mode: 'insert' | 'copy' }) {
  // Merge fresh extraction with the prompt's stored variables to keep lastValue.
  const vars = useMemo(() => mergeVariables(prompt.body, prompt.variables), [prompt]);
  const [remember, setRemember] = useState(false);
  const [values, setValues] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const v of vars) init[v.name] = v.defaultValue ?? '';
    return init;
  });

  useEffect(() => {
    getSettings().then((s) => {
      setRemember(s.rememberVariableValues);
      if (s.rememberVariableValues) {
        setValues((prev) => {
          const next = { ...prev };
          for (const v of vars) {
            if (v.lastValue != null && v.lastValue !== '') next[v.name] = v.lastValue;
          }
          return next;
        });
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function apply() {
    const text = substitute(prompt.body, values, vars);
    if (mode === 'insert') {
      const res = await insertText(text);
      showToast(res === 'inserted' ? '삽입되었어요' : '클립보드에 복사했어요');
    } else {
      await copyToClipboard(text);
      showToast('클립보드에 복사했어요');
    }
    if (remember) {
      const updatedVars = vars.map((v) => ({ ...v, lastValue: values[v.name] ?? v.lastValue ?? null }));
      await upsertPrompt({ ...prompt, variables: updatedVars });
    }
    await sendToBackground({ type: 'PROMPT_USED', promptId: prompt.id });
    close();
  }

  function onKey(e: KeyboardEvent) {
    if (e.key === 'Escape') { e.preventDefault(); close(); }
    else if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); void apply(); }
  }

  return (
    <Backdrop position="center">
      <div class="sp-modal" onKeyDown={onKey}>
        <div class="sp-modal-head">
          <div class="sp-modal-head-icon"><IconVars /></div>
          <div style="flex:1">
            <h3>{prompt.title}</h3>
            <div class="sub">{vars.length}개 변수 채우기</div>
          </div>
          <button class="sp-close" onClick={close}><IconClose /></button>
        </div>
        <div class="sp-modal-body">
          {vars.map((v) => (
            <VarField
              key={v.name}
              variable={v}
              value={values[v.name] ?? ''}
              onChange={(val) => setValues((s) => ({ ...s, [v.name]: val }))}
            />
          ))}
          <div class="sp-field">
            <div class="sp-label">미리보기</div>
            <div class="sp-preview">{renderPreview(prompt.body, values, vars)}</div>
          </div>
        </div>
        <div class="sp-modal-foot">
          <div class="sp-actions">
            <button class="sp-btn ghost" onClick={close}>취소</button>
            <button class="sp-btn primary" onClick={() => void apply()}>
              {mode === 'insert' ? '삽입' : '복사'} <span class="sp-kbd">⌘↵</span>
            </button>
          </div>
        </div>
      </div>
    </Backdrop>
  );
}

function VarField({
  variable, value, onChange,
}: { variable: Variable; value: string; onChange: (v: string) => void }) {
  return (
    <div class="sp-field">
      <div class="sp-label">
        <span class="sp-name-tag">{`{{${variable.name}}}`}</span>
        {variable.defaultValue && <span style="color:var(--text-muted);font-weight:400">기본값: {variable.defaultValue}</span>}
      </div>
      {variable.multiline ? (
        <textarea class="sp-textarea" value={value} onInput={(e) => onChange((e.target as HTMLTextAreaElement).value)} />
      ) : (
        <input class="sp-input" value={value} onInput={(e) => onChange((e.target as HTMLInputElement).value)} />
      )}
    </div>
  );
}

/* ---------------- Save modal ---------------- */
function SaveModal({ text, sourceUrl }: { text: string; sourceUrl: string }) {
  const [title, setTitle] = useState(() => deriveTitle(text));
  const [body, setBody] = useState(text);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [folderId, setFolderId] = useState<string | null>(null);
  const [tagsInput, setTagsInput] = useState('');

  useEffect(() => {
    getFolders().then(setFolders);
    getSettings().then((s) => setFolderId(s.defaultFolderId));
  }, []);

  const vars = useMemo(() => extractVariables(body), [body]);

  async function save() {
    const now = Date.now();
    const prompt: Prompt = {
      id: uuid(),
      title: title.trim() || deriveTitle(body),
      body,
      variables: vars,
      folderId,
      tags: tagsInput.split(',').map((t) => t.trim().replace(/^#/, '')).filter(Boolean),
      memo: null,
      sourceUrl: sourceUrl || null,
      favorite: false,
      createdAt: now,
      updatedAt: now,
      lastUsedAt: null,
      useCount: 0,
    };
    await upsertPrompt(prompt);
    close();
    showToast('저장되었어요');
  }

  function onKey(e: KeyboardEvent) {
    if (e.key === 'Escape') { e.preventDefault(); close(); }
    else if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); void save(); }
  }

  return (
    <Backdrop position="top">
      <div class="sp-modal" onKeyDown={onKey}>
        <div class="sp-modal-head">
          <div class="sp-modal-head-icon"><IconVars /></div>
          <div style="flex:1">
            <h3>프롬프트 저장</h3>
            <div class="sub">선택한 텍스트가 본문에 채워졌어요</div>
          </div>
          <button class="sp-close" onClick={close}><IconClose /></button>
        </div>
        <div class="sp-modal-body">
          <div class="sp-field">
            <div class="sp-label">제목</div>
            <input class="sp-input" value={title} onInput={(e) => setTitle((e.target as HTMLInputElement).value)} />
          </div>
          <div class="sp-field">
            <div class="sp-label">본문</div>
            <textarea class="sp-textarea" value={body} onInput={(e) => setBody((e.target as HTMLTextAreaElement).value)} />
          </div>
          {vars.length > 0 && (
            <div class="sp-field">
              <div class="sp-label">감지된 변수 {vars.length}개</div>
              <div>
                {vars.map((v) => (
                  <span key={v.name} class="sp-section-tag"><span class="sp-name-tag">{`{{${v.name}}}`}</span></span>
                ))}
              </div>
            </div>
          )}
          <div class="sp-field">
            <div class="sp-label">폴더</div>
            <select class="sp-input" value={folderId ?? ''} onChange={(e) => setFolderId((e.target as HTMLSelectElement).value || null)}>
              <option value="">분류 없음</option>
              {folders.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
          </div>
          <div class="sp-field">
            <div class="sp-label">태그 <span style="font-weight:400;color:var(--text-muted)">쉼표로 구분</span></div>
            <input class="sp-input" value={tagsInput} placeholder="코딩, 리뷰" onInput={(e) => setTagsInput((e.target as HTMLInputElement).value)} />
          </div>
          {sourceUrl && (
            <div class="sp-field">
              <div class="sp-label">출처</div>
              <div class="sp-section-tag" style="max-width:100%;overflow:hidden;text-overflow:ellipsis">{sourceUrl}</div>
            </div>
          )}
        </div>
        <div class="sp-modal-foot">
          <span style="font-size:11px;color:var(--text-muted)"><span class="sp-kbd">⌘</span><span class="sp-kbd">↵</span> 저장</span>
          <div class="sp-actions">
            <button class="sp-btn ghost" onClick={close}>취소</button>
            <button class="sp-btn primary" onClick={() => void save()}>저장</button>
          </div>
        </div>
      </div>
    </Backdrop>
  );
}

/* ---------------- shared bits ---------------- */
function Backdrop({ position, children }: { position: 'top' | 'center'; children: preact.ComponentChildren }) {
  // Keep keystrokes inside the overlay. Some sites (e.g. claude.ai) have a
  // document-level "type anywhere → focus composer" handler that would steal
  // focus while the user types in our modal. Our own key handlers (Esc/Enter/
  // arrows) run first during bubbling; we stop the event before it reaches the
  // page's document/window listeners. The character still lands in the input
  // (default action is unaffected by stopPropagation).
  const stopKeys = (e: KeyboardEvent) => e.stopPropagation();
  return (
    <div
      class={`sp-backdrop ${position}`}
      onKeyDown={stopKeys}
      onKeyUp={stopKeys}
      onKeyPress={stopKeys}
      onClick={(e) => { if (e.target === e.currentTarget) close(); }}
    >
      {children}
    </div>
  );
}

function firstLine(body: string): string {
  return body.replace(/\s+/g, ' ').trim().slice(0, 80);
}
function deriveTitle(text: string): string {
  const line = text.split('\n')[0].trim();
  return line.length > 60 ? line.slice(0, 60) + '…' : line || '새 프롬프트';
}
function renderPreview(body: string, values: Record<string, string>, vars: Variable[]) {
  // Render with filled/empty highlight spans
  const parts: preact.ComponentChildren[] = [];
  const re = /\{\{\s*([a-zA-Z0-9_\-가-힣]+)\s*(?:\|([^}]*))?\}\}/g;
  let last = 0;
  let m: RegExpExecArray | null;
  const defaults = new Map(vars.map((v) => [v.name, v.defaultValue]));
  let key = 0;
  while ((m = re.exec(body))) {
    if (m.index > last) parts.push(body.slice(last, m.index));
    const name = m[1];
    const val = values[name] || defaults.get(name) || '';
    if (val) parts.push(<span key={key++} class="filled">{val}</span>);
    else parts.push(<span key={key++} class="filled empty">{`{{${name}}}`}</span>);
    last = re.lastIndex;
  }
  if (last < body.length) parts.push(body.slice(last));
  return parts;
}
