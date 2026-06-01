/** Content-script overlay UI: picker, variable modal, save modal, toast. */
import { useEffect, useRef, useState, useMemo } from 'preact/hooks';
import { signal } from '@preact/signals';
import type { Prompt, Folder, Variable, ImageParam } from '@shared/types';
import { getPrompts, getFolders, upsertPrompt, getSettings } from '@shared/store';
import { search, rankForPicker } from '@shared/search';
import { extractVariables, mergeVariables, applyConditionals } from '@shared/variables';
import { assemblePrompt, variableSource, isGenerative, renderReferences, renderParams } from '@shared/assemble';
import { flattenTree } from '@shared/folders';
import { insertText, copyToClipboard, captureActiveElement } from './insertion';
import { sendToBackground } from '@shared/messaging';
import { t } from '@shared/i18n';
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
  const vars = extractVariables(variableSource(prompt));
  // Open the options modal when there are variables, or always for image/video
  // prompts (so parameters/negative can be toggled before insert).
  if (vars.length > 0 || isGenerative(prompt)) {
    view.value = { kind: 'variables', prompt, mode };
    return;
  }
  const text = assemblePrompt(prompt, {});
  if (mode === 'insert') {
    const res = await insertText(text);
    showToast(res === 'inserted' ? t('content.toast.inserted') : t('content.toast.clipboard'));
  } else {
    await copyToClipboard(text);
    showToast(t('content.toast.clipboard'));
  }
  await sendToBackground({ type: 'PROMPT_USED', promptId: prompt.id, text, values: {}, host: location.host });
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
      title={t('content.fabTitle')}
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
            placeholder={t('content.pickerSearch')}
            onInput={(e) => setQuery((e.target as HTMLInputElement).value)}
          />
          <span class="sp-kbd">Esc</span>
        </div>
        <div class="sp-meta">
          {query.trim() ? t('content.pickerMeta.search', [results.length]) : t('content.pickerMeta.default')}
        </div>
        <div class="sp-list">
          {results.length === 0 && (
            <div class="sp-empty">
              <div class="sp-empty-title">{t('content.pickerEmpty')}</div>
              <div>{t('popup.empty.hintSearch')}</div>
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
                <div class="sp-item-title">
                  {isGenerative(r.prompt) && <span class="sp-kind">{r.prompt.kind === 'video' ? '🎬' : '🖼'}</span>}
                  {r.prompt.title}
                </div>
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
            <span><span class="sp-kbd">↑</span><span class="sp-kbd">↓</span> {t('content.hint.navigate')}</span>
            <span><span class="sp-kbd">↵</span> {t('content.hint.insert')}</span>
            <span><span class="sp-kbd">Esc</span> {t('content.hint.close')}</span>
          </span>
        </div>
      </div>
    </Backdrop>
  );
}

/* ---------------- Variable modal ---------------- */
function VariableModal({ prompt, mode }: { prompt: Prompt; mode: 'insert' | 'copy' }) {
  // Merge fresh extraction with the prompt's stored variables to keep lastValue.
  // Variables come from the body + negative prompt combined.
  const vars = useMemo(() => mergeVariables(variableSource(prompt), prompt.variables), [prompt]);
  const [remember, setRemember] = useState(false);
  const [values, setValues] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const v of vars) init[v.name] = v.defaultValue ?? '';
    return init;
  });
  const [presets, setPresets] = useState(prompt.presets ?? []);
  const [namingPreset, setNamingPreset] = useState(false);
  const [presetName, setPresetName] = useState('');
  // Per-insert parameter toggles (image/video); start from the stored params.
  const [params, setParams] = useState<ImageParam[]>(() => (prompt.params ?? []).map((p) => ({ ...p })));
  const generative = isGenerative(prompt);
  const setParam = (id: string, patch: Partial<ImageParam>) =>
    setParams((ps) => ps.map((p) => (p.id === id ? { ...p, ...patch } : p)));

  function loadPreset(name: string) {
    const p = presets.find((x) => x.name === name);
    if (p) setValues((v) => ({ ...v, ...p.values }));
  }
  async function savePreset() {
    const nm = presetName.trim();
    if (!nm) { setNamingPreset(false); return; }
    const next = [...presets.filter((p) => p.name !== nm), { name: nm, values: { ...values } }];
    setPresets(next);
    await upsertPrompt({ ...prompt, presets: next });
    setNamingPreset(false);
    setPresetName('');
  }

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
    const text = assemblePrompt({ ...prompt, variables: vars, params }, values);
    if (mode === 'insert') {
      const res = await insertText(text);
      showToast(res === 'inserted' ? t('content.toast.inserted') : t('content.toast.clipboard'));
    } else {
      await copyToClipboard(text);
      showToast(t('content.toast.clipboard'));
    }
    if (remember) {
      const updatedVars = vars.map((v) => ({ ...v, lastValue: values[v.name] ?? v.lastValue ?? null }));
      await upsertPrompt({ ...prompt, variables: updatedVars });
    }
    await sendToBackground({ type: 'PROMPT_USED', promptId: prompt.id, text, values, host: location.host });
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
            <div class="sub">{vars.length > 0 ? t('content.varModalSub', [vars.length]) : t('content.optModalSub')}</div>
          </div>
          <button class="sp-close" onClick={close}><IconClose /></button>
        </div>
        <div class="sp-modal-body">
          <div class="sp-presetbar">
            {presets.length > 0 && (
              <select class="sp-input" value="" onChange={(e) => { loadPreset((e.target as HTMLSelectElement).value); (e.target as HTMLSelectElement).value = ''; }}>
                <option value="">{t('content.presetSelect')}</option>
                {presets.map((p) => <option key={p.name} value={p.name}>{p.name}</option>)}
              </select>
            )}
            {namingPreset ? (
              <>
                <input class="sp-input" autoFocus value={presetName} placeholder={t('content.presetName')}
                  onInput={(e) => setPresetName((e.target as HTMLInputElement).value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') void savePreset(); if (e.key === 'Escape') setNamingPreset(false); }} />
                <button class="sp-btn primary" onClick={() => void savePreset()}>{t('common.save')}</button>
              </>
            ) : (
              <button class="sp-btn ghost" onClick={() => setNamingPreset(true)}>★ {t('content.savePreset')}</button>
            )}
          </div>
          {vars.map((v) => (
            <VarField
              key={v.name}
              variable={v}
              value={values[v.name] ?? ''}
              onChange={(val) => setValues((s) => ({ ...s, [v.name]: val }))}
            />
          ))}
          {generative && params.length > 0 && (
            <div class="sp-field">
              <div class="sp-label">{t('opt.params.title')}</div>
              <div class="sp-params">
                {params.map((p) => (
                  <div class={`sp-param-row${p.enabled ? '' : ' off'}`} key={p.id}>
                    <label class="sp-toggle">
                      <input type="checkbox" checked={p.enabled} onChange={(e) => setParam(p.id, { enabled: (e.target as HTMLInputElement).checked })} />
                      <span class="track" />
                    </label>
                    <span class="sp-param-name">{p.label || p.token}</span>
                    {p.control !== 'toggle' && (
                      p.control === 'select' && p.options?.length ? (
                        <select class="sp-input sp-param-val" value={p.value} onChange={(e) => setParam(p.id, { value: (e.target as HTMLSelectElement).value })}>
                          {p.options.map((o) => <option key={o} value={o}>{o}</option>)}
                        </select>
                      ) : (
                        <input class="sp-input sp-param-val" type={p.control === 'number' ? 'number' : 'text'} value={p.value} onInput={(e) => setParam(p.id, { value: (e.target as HTMLInputElement).value })} />
                      )
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          <div class="sp-field">
            <div class="sp-label">{t('common.preview')}</div>
            <div class="sp-preview">{assembledPreview(prompt, values, vars, params, generative)}</div>
          </div>
        </div>
        <div class="sp-modal-foot">
          <div class="sp-actions">
            <button class="sp-btn ghost" onClick={close}>{t('common.cancel')}</button>
            <button class="sp-btn primary" onClick={() => void apply()}>
              {mode === 'insert' ? t('common.insert') : t('common.copy')} <span class="sp-kbd">⌘↵</span>
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
        {variable.defaultValue && <span style="color:var(--text-muted);font-weight:400">{t('content.default', [variable.defaultValue])}</span>}
      </div>
      {variable.type === 'boolean' ? (
        <label class="sp-toggle">
          <input type="checkbox" checked={value === 'true'} onChange={(e) => onChange((e.target as HTMLInputElement).checked ? 'true' : '')} />
          <span class="track" />
        </label>
      ) : variable.type === 'code' ? (
        <textarea class="sp-textarea" value={value} placeholder={variable.options[0] ? variable.options[0] : ''} onInput={(e) => onChange((e.target as HTMLTextAreaElement).value)} />
      ) : variable.type === 'textarea' ? (
        <textarea class="sp-textarea" value={value} onInput={(e) => onChange((e.target as HTMLTextAreaElement).value)} />
      ) : variable.type === 'select' ? (
        <select class="sp-input" value={value} onChange={(e) => onChange((e.target as HTMLSelectElement).value)}>
          {variable.options.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : variable.type === 'date' ? (
        <input class="sp-input" type="date" value={value} onInput={(e) => onChange((e.target as HTMLInputElement).value)} />
      ) : variable.type === 'number' ? (
        <input class="sp-input" type="number" value={value} onInput={(e) => onChange((e.target as HTMLInputElement).value)} />
      ) : variable.type === 'color' ? (
        <div class="sp-color">
          <input type="color" value={value || '#7C3AED'} onInput={(e) => onChange((e.target as HTMLInputElement).value)} />
          <input class="sp-input" value={value} placeholder="#7C3AED" onInput={(e) => onChange((e.target as HTMLInputElement).value)} />
        </div>
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
  const [memo, setMemo] = useState('');
  const [source, setSource] = useState(sourceUrl);
  const [existing, setExisting] = useState<Prompt[]>([]);
  const [tagFocused, setTagFocused] = useState(false);

  useEffect(() => {
    getFolders().then(setFolders);
    getPrompts().then(setExisting);
    getSettings().then((s) => setFolderId(s.defaultFolderId));
  }, []);

  const vars = useMemo(() => extractVariables(body), [body]);

  // F1.7: detect a near-identical existing prompt (whitespace-normalized body).
  const duplicate = useMemo(() => {
    const norm = normalizeBody(body);
    if (!norm) return null;
    return existing.find((p) => normalizeBody(p.body) === norm) ?? null;
  }, [existing, body]);

  // F6.5: tag autocomplete from existing prompts.
  const allTags = useMemo(() => {
    const freq = new Map<string, number>();
    for (const p of existing) for (const t of p.tags) freq.set(t, (freq.get(t) ?? 0) + 1);
    return [...freq.entries()].sort((a, b) => b[1] - a[1]).map(([t]) => t);
  }, [existing]);

  const tagSegments = tagsInput.split(',');
  const tagFragment = (tagSegments[tagSegments.length - 1] ?? '').trim().toLowerCase();
  const typedTags = new Set(tagSegments.map((s) => s.trim()).filter(Boolean));
  const tagSuggestions = tagFocused
    ? allTags.filter((t) => !typedTags.has(t) && (!tagFragment || t.toLowerCase().includes(tagFragment))).slice(0, 6)
    : [];

  function completeTag(tag: string) {
    const segs = tagsInput.split(',');
    segs[segs.length - 1] = ' ' + tag;
    setTagsInput(segs.join(',') + ', ');
  }

  async function save() {
    const now = Date.now();
    const prompt: Prompt = {
      id: uuid(),
      title: title.trim() || deriveTitle(body),
      body,
      variables: vars,
      folderId,
      tags: tagsInput.split(',').map((tg) => tg.trim().replace(/^#/, '')).filter(Boolean),
      memo: memo.trim() || null,
      sourceUrl: source.trim() || null,
      favorite: false,
      createdAt: now,
      updatedAt: now,
      lastUsedAt: null,
      useCount: 0,
    };
    await upsertPrompt(prompt);
    close();
    showToast(t('content.toast.saved'));
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
            <h3>{t('content.savePromptTitle')}</h3>
            <div class="sub">{t('content.savePromptSub')}</div>
          </div>
          <button class="sp-close" onClick={close}><IconClose /></button>
        </div>
        <div class="sp-modal-body">
          {duplicate && (
            <div class="sp-warn">
              <svg class="ico" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
              <div>{t('content.dupWarn', [duplicate.title])}</div>
            </div>
          )}
          <div class="sp-field">
            <div class="sp-label">{t('common.title')}</div>
            <input class="sp-input" value={title} onInput={(e) => setTitle((e.target as HTMLInputElement).value)} />
          </div>
          <div class="sp-field">
            <div class="sp-label">{t('common.body')}</div>
            <textarea class="sp-textarea" value={body} onInput={(e) => setBody((e.target as HTMLTextAreaElement).value)} />
          </div>
          {vars.length > 0 && (
            <div class="sp-field">
              <div class="sp-label">{t('common.detectedVars', [vars.length])}</div>
              <div>
                {vars.map((v) => (
                  <span key={v.name} class="sp-section-tag"><span class="sp-name-tag">{`{{${v.name}}}`}</span></span>
                ))}
              </div>
            </div>
          )}
          <div class="sp-field">
            <div class="sp-label">{t('common.folder')}</div>
            <select class="sp-input" value={folderId ?? ''} onChange={(e) => setFolderId((e.target as HTMLSelectElement).value || null)}>
              <option value="">{t('common.uncategorized')}</option>
              {flattenTree(folders).map((f) => <option key={f.id} value={f.id}>{'  '.repeat(f.depth)}{f.name}</option>)}
            </select>
          </div>
          <div class="sp-field" style="position:relative">
            <div class="sp-label">{t('common.tags')} <span style="font-weight:400;color:var(--text-muted)">{t('common.commaSeparated')}</span></div>
            <input
              class="sp-input"
              value={tagsInput}
              placeholder={t('common.tagsPlaceholder')}
              onInput={(e) => setTagsInput((e.target as HTMLInputElement).value)}
              onFocus={() => setTagFocused(true)}
              onBlur={() => setTimeout(() => setTagFocused(false), 150)}
            />
            {tagSuggestions.length > 0 && (
              <div class="sp-ac">
                {tagSuggestions.map((tag) => (
                  <div
                    key={tag}
                    class="sp-ac-item"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => completeTag(tag)}
                  >
                    <span class="hash">#</span>{tag}
                  </div>
                ))}
              </div>
            )}
          </div>
          <div class="sp-field">
            <div class="sp-label">{t('common.memo')} <span style="font-weight:400;color:var(--text-muted)">{t('common.optional')}</span></div>
            <input class="sp-input" value={memo} placeholder={t('common.memoPlaceholder')} onInput={(e) => setMemo((e.target as HTMLInputElement).value)} />
          </div>
          <div class="sp-field">
            <div class="sp-label">{t('common.source')}</div>
            <input class="sp-input" value={source} onInput={(e) => setSource((e.target as HTMLInputElement).value)} />
          </div>
        </div>
        <div class="sp-modal-foot">
          <span style="font-size:11px;color:var(--text-muted)"><span class="sp-kbd">⌘</span><span class="sp-kbd">↵</span> {t('common.save')}</span>
          <div class="sp-actions">
            <button class="sp-btn ghost" onClick={close}>{t('common.cancel')}</button>
            <button class="sp-btn primary" onClick={() => void save()}>{duplicate ? t('content.saveAnyway') : t('common.save')}</button>
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
function normalizeBody(body: string): string {
  return body.replace(/\s+/g, ' ').trim();
}
function deriveTitle(text: string): string {
  const line = text.split('\n')[0].trim();
  return line.length > 60 ? line.slice(0, 60) + '…' : line || t('common.newPrompt');
}
/** Highlighted preview of the full assembled output (refs + body + params + negative). */
function assembledPreview(
  prompt: Prompt,
  values: Record<string, string>,
  vars: Variable[],
  params: ImageParam[],
  generative: boolean,
) {
  const parts: preact.ComponentChildren[] = [];
  if (generative) {
    const refs = renderReferences(prompt.references);
    if (refs) parts.push(<div class="sp-pre-ref" key="ref">{refs}</div>);
  }
  parts.push(<span key="body">{renderPreview(prompt.body, values, vars)}</span>);
  if (generative) {
    const ptext = renderParams(params);
    if (ptext) parts.push(<span class="sp-pre-params" key="params">{' ' + ptext}</span>);
    const neg = prompt.negativePrompt;
    if (neg && neg.trim()) {
      const body = renderPreview(neg, values, vars);
      parts.push(
        (prompt.negativeStyle ?? 'label') === 'mj'
          ? <span class="sp-pre-neg" key="neg">{' --no '}{body}</span>
          : <div class="sp-pre-neg" key="neg">Negative prompt: {body}</div>,
      );
    }
  }
  return parts;
}

function renderPreview(rawBody: string, values: Record<string, string>, vars: Variable[]) {
  // Resolve {{#if}} blocks first so the preview reflects the toggles.
  const body = applyConditionals(rawBody, values);
  const parts: preact.ComponentChildren[] = [];
  const re = /\{\{\s*([a-zA-Z0-9_\-가-힣]+)\s*(?::\s*[a-zA-Z]+\s*(?:\([^)]*\))?)?\s*(?:\|([^}]*))?\s*\}\}/g;
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
