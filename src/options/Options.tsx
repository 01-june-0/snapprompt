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
          <div><div class="op-name">SnapPrompt</div><div class="op-sub">설정</div></div>
        </div>
      </header>
      <div class="op-layout">
        <nav class="op-nav">
          <TabBtn id="general" tab={tab} set={setTab} label="일반" />
          <TabBtn id="prompts" tab={tab} set={setTab} label="프롬프트" />
          <TabBtn id="folders" tab={tab} set={setTab} label="폴더" />
          <TabBtn id="tags" tab={tab} set={setTab} label="태그" />
          <TabBtn id="backup" tab={tab} set={setTab} label="백업" />
          <TabBtn id="shortcuts" tab={tab} set={setTab} label="단축키" />
          <div class="op-nav-sep" />
          <TabBtn id="data" tab={tab} set={setTab} label="데이터" />
          <TabBtn id="about" tab={tab} set={setTab} label="정보" />
        </nav>
        <div>
          {tab === 'general' && <General settings={settings} patch={patch} folders={folders} />}
          {tab === 'prompts' && <PromptsManager prompts={prompts} folders={folders} flash={flash} onChange={async (p) => { await setPrompts(p); setLocalPrompts(p); }} />}
          {tab === 'folders' && <Folders folders={folders} onChange={async (f) => { await setFolders(f); setLocalFolders(f); }} />}
          {tab === 'tags' && <Tags prompts={prompts} onChange={async (p) => { await setPrompts(p); setLocalPrompts(p); flash('태그를 정리했어요'); }} />}
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
      <h2 class="op-panel-title">일반</h2>
      <p class="op-panel-desc">테마, 언어, 삽입 동작 등 기본 설정</p>
      <div class="op-card">
        <div class="op-setting">
          <div class="op-setting-info"><div class="op-setting-label">테마</div><div class="op-setting-hint">시스템 설정을 따르거나 직접 선택</div></div>
          <Seg<ThemePref> value={settings.theme} options={[['system', '시스템'], ['light', '라이트'], ['dark', '다크']]} onChange={(v) => patch({ theme: v })} />
        </div>
        <div class="op-setting">
          <div class="op-setting-info"><div class="op-setting-label">언어</div><div class="op-setting-hint">UI 표시 언어</div></div>
          <select class="op-select" value={settings.language} onChange={(e) => patch({ language: (e.target as HTMLSelectElement).value as LanguagePref })}>
            <option value="system">시스템</option><option value="ko">한국어</option><option value="en">English</option>
          </select>
        </div>
      </div>
      <div class="op-card">
        <Toggle label="플로팅 버튼" hint="입력창 포커스 시 빠른 삽입 버튼 표시" checked={settings.floatingButton} onChange={(v) => patch({ floatingButton: v })} />
        <div class="op-setting">
          <div class="op-setting-info"><div class="op-setting-label">삽입 방식</div><div class="op-setting-hint">자동 삽입 실패 시 클립보드 폴백</div></div>
          <Seg value={settings.insertionMode} options={[['auto', '자동 삽입'], ['clipboard-fallback', '클립보드 폴백']]} onChange={(v) => patch({ insertionMode: v })} />
        </div>
        <Toggle label="마지막 변수값 기억" hint="같은 프롬프트 재사용 시 직전 입력값 자동 채움" checked={settings.rememberVariableValues} onChange={(v) => patch({ rememberVariableValues: v })} />
        <div class="op-setting">
          <div class="op-setting-info"><div class="op-setting-label">기본 폴더</div><div class="op-setting-hint">저장 시 폴더 미선택이면 여기에 저장</div></div>
          <select class="op-select" value={settings.defaultFolderId ?? ''} onChange={(e) => patch({ defaultFolderId: (e.target as HTMLSelectElement).value || null })}>
            <option value="">분류 없음</option>
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
      <h2 class="op-panel-title">폴더</h2>
      <p class="op-panel-desc">계층 구조로 프롬프트를 정리하세요 (무제한 깊이)</p>

      <div class="op-card" style="padding:16px;margin-bottom:16px">
        <div style="display:flex;gap:8px;align-items:center">
          <input class="op-input" style="flex:1" value={name} placeholder="새 폴더 이름" onInput={(e) => setName((e.target as HTMLInputElement).value)} onKeyDown={(e) => e.key === 'Enter' && add()} />
          <select class="op-select" value={parentId ?? ''} onChange={(e) => setParentId((e.target as HTMLSelectElement).value || null)}>
            <option value="">최상위</option>
            {flat.map((f) => <option key={f.id} value={f.id}>{indent(f.depth)}{f.name}</option>)}
          </select>
          <button class="op-btn primary sm" onClick={add}>추가</button>
        </div>
        <div style="font-size:11px;color:var(--text-muted);margin-top:8px">상위 폴더를 선택하면 하위 폴더로 만들어져요</div>
      </div>

      <div class="op-card">
        <div class="op-list">
          {flat.length === 0 && <div class="op-row"><span class="op-row-title" style="color:var(--text-muted)">폴더가 없어요</span></div>}
          {flat.map((f) => (
            <div class="op-row" key={f.id}>
              <span style={`width:${f.depth * 16}px;flex-shrink:0`} />
              {f.depth > 0 && <span style="color:var(--text-disabled);flex-shrink:0">└</span>}
              <input class="op-input" style="flex:1" value={f.name} onChange={(e) => rename(f.id, (e.target as HTMLInputElement).value)} />
              <select class="op-select" style="min-width:120px" value={f.parentId ?? ''} onChange={(e) => reparent(f.id, (e.target as HTMLSelectElement).value || null)}>
                <option value="">최상위</option>
                {flat.filter((o) => o.id !== f.id && !wouldCycle(folders, f.id, o.id)).map((o) => (
                  <option key={o.id} value={o.id}>{indent(o.depth)}{o.name}</option>
                ))}
              </select>
              <button class="op-btn secondary sm" onClick={() => remove(f.id)}>삭제</button>
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
    flash(`${selected.size}개를 옮겼어요`);
    setSelected(new Set());
  }
  function addTagToSelected() {
    const tag = tagToAdd.trim().replace(/^#/, '');
    if (!tag) return;
    onChange(prompts.map((p) => (selected.has(p.id) && !p.tags.includes(tag) ? { ...p, tags: [...p.tags, tag], updatedAt: Date.now() } : p)));
    flash(`#${tag} 태그를 추가했어요`);
    setTagToAdd('');
  }
  function deleteSelected() {
    if (!confirm(`선택한 ${selected.size}개 프롬프트를 삭제할까요? 되돌릴 수 없어요.`)) return;
    onChange(prompts.filter((p) => !selected.has(p.id)));
    flash(`${selected.size}개를 삭제했어요`);
    setSelected(new Set());
  }

  return (
    <>
      <h2 class="op-panel-title">프롬프트</h2>
      <p class="op-panel-desc">전체 프롬프트를 검색하고 다중 선택해 한 번에 정리하세요</p>

      <div style="display:flex;gap:8px;margin-bottom:16px;align-items:center">
        <input class="op-input" style="flex:1" placeholder="제목·본문·태그 검색" value={query} onInput={(e) => setQuery((e.target as HTMLInputElement).value)} />
        <label style="display:flex;align-items:center;gap:6px;font-size:var(--text-sm);color:var(--text-secondary);cursor:pointer;white-space:nowrap">
          <input type="checkbox" checked={allVisibleSelected} onChange={toggleAll} /> 전체 선택
        </label>
      </div>

      {selected.size > 0 && (
        <div class="op-banner info" style="gap:10px;flex-wrap:wrap">
          <span style="font-weight:var(--weight-semi)">{selected.size}개 선택됨</span>
          <div style="display:flex;gap:8px;margin-left:auto;align-items:center;flex-wrap:wrap">
            <select class="op-select" value="__" onChange={(e) => { const v = (e.target as HTMLSelectElement).value; if (v !== '__') moveSelected(v === '' ? null : v); }}>
              <option value="__">폴더로 이동…</option>
              <option value="">분류 없음</option>
              {flattenTree(folders).map((f) => <option key={f.id} value={f.id}>{indent(f.depth)}{f.name}</option>)}
            </select>
            <input class="op-input" style="width:120px" placeholder="태그 추가" value={tagToAdd} onInput={(e) => setTagToAdd((e.target as HTMLInputElement).value)} onKeyDown={(e) => e.key === 'Enter' && addTagToSelected()} />
            <button class="op-btn secondary sm" onClick={addTagToSelected}>추가</button>
            <button class="op-btn danger sm" onClick={deleteSelected}>삭제</button>
          </div>
        </div>
      )}

      <div class="op-card">
        <div class="op-list">
          {visible.length === 0 && <div class="op-row"><span class="op-row-title" style="color:var(--text-muted)">{query ? '검색 결과가 없어요' : '프롬프트가 없어요'}</span></div>}
          {visible.map((p) => (
            <label class="op-row" key={p.id} style="cursor:pointer">
              <input type="checkbox" checked={selected.has(p.id)} onChange={() => toggle(p.id)} />
              <div style="flex:1;min-width:0">
                <div class="op-row-title" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">{p.title || '(제목 없음)'}</div>
                <div class="op-row-sub">{folderPath(folders, p.folderId)}{p.tags.length ? ' · ' + p.tags.map((t) => '#' + t).join(' ') : ''}</div>
              </div>
              {p.variables.length > 0 && <span class="op-row-sub" style="flex-shrink:0;color:var(--text-accent)">{p.variables.length} vars</span>}
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
      <h2 class="op-panel-title">태그</h2>
      <p class="op-panel-desc">태그 삭제는 전체 프롬프트에 일괄 반영돼요</p>
      <div class="op-card">
        <div class="op-tagwrap">
          {counts.length === 0 && <span style="color:var(--text-muted);font-size:var(--text-sm)">태그가 없어요</span>}
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

  async function doExport() { downloadBackup(await buildBackup()); flash('JSON으로 내보냈어요'); }
  async function doImport(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      const res = await importBackup(data, 'duplicate');
      flash(`가져오기 완료: +${res.added} / 덮어쓰기 ${res.overwritten} / 건너뜀 ${res.skipped}`);
      onRestore();
    } catch (err) { flash('가져오기 실패: ' + String(err)); }
  }
  async function restore(s: Snapshot) {
    await restoreSnapshot(s.createdAt);
    flash('스냅샷을 복원했어요');
    onRestore();
  }

  return (
    <>
      <h2 class="op-panel-title">백업</h2>
      <p class="op-panel-desc">내부 스냅샷은 항상 자동, 외부 백업은 선택 사항</p>
      <div class="op-card">
        <Toggle label="자동 백업" hint="켜면 다운로드 폴더에 주기적으로 JSON 저장" checked={settings.backupFrequency !== 'off'} onChange={(v) => patch({ backupFrequency: v ? 'weekly' : 'off' })} />
        <div class="op-setting">
          <div class="op-setting-info"><div class="op-setting-label">백업 주기</div><div class="op-setting-hint">자동 백업이 켜진 경우에만 적용</div></div>
          <select class="op-select" value={settings.backupFrequency} disabled={settings.backupFrequency === 'off'} onChange={(e) => patch({ backupFrequency: (e.target as HTMLSelectElement).value as BackupFrequency })}>
            <option value="daily">매일</option><option value="weekly">매주</option><option value="monthly">매월</option>
          </select>
        </div>
        <div class="op-setting">
          <div class="op-setting-info"><div class="op-setting-label">지금 다운로드 백업</div><div class="op-setting-hint">자동 백업과 동일 경로로 즉시 다운로드 폴더(snapprompt/)에 저장</div></div>
          <button class="op-btn secondary sm" onClick={async () => {
            const res = await sendToBackground({ type: 'BACKUP_NOW' });
            flash(res.ok ? '다운로드 폴더에 백업했어요' : (res.error ?? '백업 실패'));
          }}>지금 백업</button>
        </div>
      </div>

      <div class="op-card" style="margin-top:16px">
        <div class="op-setting">
          <div class="op-setting-info"><div class="op-setting-label">수동 백업</div><div class="op-setting-hint">전체 데이터를 JSON으로 내보내거나 가져오기</div></div>
          <div style="display:flex;gap:8px">
            <button class="op-btn secondary sm" onClick={doExport}>내보내기</button>
            <label class="op-btn secondary sm">가져오기<input type="file" accept="application/json" style="display:none" onChange={doImport} /></label>
          </div>
        </div>
      </div>

      <div class="op-card" style="margin-top:16px">
        <div class="op-list">
          <div class="op-row"><span class="op-row-title">내부 스냅샷 (자동)</span></div>
          {snapshots.length === 0 && <div class="op-row"><span class="op-row-sub">아직 스냅샷이 없어요</span></div>}
          {snapshots.map((s) => (
            <div class="op-row" key={s.createdAt}>
              <div style="flex:1">
                <div class="op-row-title">{new Date(s.createdAt).toLocaleString('ko-KR')}</div>
                <div class="op-row-sub">{s.prompts.length} prompts · {s.folders.length} folders</div>
              </div>
              <button class="op-btn secondary sm" onClick={() => restore(s)}>복원</button>
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
      <h2 class="op-panel-title">단축키</h2>
      <p class="op-panel-desc">변경은 Chrome 단축키 설정에서</p>
      <div class="op-card">
        <div class="op-setting"><div class="op-setting-info"><div class="op-setting-label">프롬프트 피커 열기</div><div class="op-setting-hint">입력창에서 검색 가능한 피커 띄우기</div></div></div>
        <div class="op-setting"><div class="op-setting-info"><div class="op-setting-label">선택 텍스트 저장</div><div class="op-setting-hint">드래그한 텍스트로 저장 모달 열기</div></div></div>
      </div>
      <div class="op-banner info" style="margin-top:16px">
        Chrome 정책상 단축키는 확장 프로그램 설정 페이지에서만 변경할 수 있어요.
        <button class="op-btn primary sm" style="margin-left:auto" onClick={() => chrome.tabs.create({ url: 'chrome://extensions/shortcuts' })}>단축키 설정 열기</button>
      </div>
    </>
  );
}

/* ---------- Data ---------- */
function Data({ prompts, folders, flash, onCleared }: { prompts: Prompt[]; folders: Folder[]; flash: (m: string) => void; onCleared: () => void }) {
  const bytes = useMemo(() => new Blob([JSON.stringify({ prompts, folders })]).size, [prompts, folders]);
  async function clearAll() {
    if (!confirm('모든 프롬프트, 폴더, 설정을 영구 삭제할까요? 되돌릴 수 없어요.')) return;
    await Promise.all([setPrompts([]), setFolders([])]);
    flash('모든 데이터를 삭제했어요');
    onCleared();
  }
  return (
    <>
      <h2 class="op-panel-title">데이터</h2>
      <p class="op-panel-desc">저장 용량 현황 및 데이터 관리</p>
      <div class="op-card" style="padding:20px">
        <div style="display:flex;justify-content:space-between;margin-bottom:12px">
          <div class="op-setting-label">저장 용량</div>
          <div class="op-row-sub">{(bytes / 1024).toFixed(1)} KB</div>
        </div>
        <div class="op-bar"><div style={`width:${Math.min(100, bytes / 50000 * 100)}%`} /></div>
        <div style="font-size:11px;color:var(--text-muted);margin-top:8px">unlimitedStorage 권한으로 실질 제한 없음 · {prompts.length}개 프롬프트</div>
      </div>
      <div class="op-card op-danger-zone" style="margin-top:16px">
        <div class="op-setting">
          <div class="op-setting-info"><div class="op-setting-label" style="color:var(--danger-700)">모든 데이터 삭제</div><div class="op-setting-hint">프롬프트·폴더·설정을 영구 삭제. 되돌릴 수 없어요.</div></div>
          <button class="op-btn danger sm" onClick={clearAll}>전체 삭제</button>
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
      <h2 class="op-panel-title">정보</h2>
      <p class="op-panel-desc">SnapPrompt에 대하여</p>
      <div class="op-card" style="padding:40px;text-align:center">
        <div style="width:64px;height:64px;border-radius:16px;background:var(--grad-primary);color:#fff;display:grid;place-items:center;margin:0 auto 16px"><Mark big /></div>
        <div style="font-size:var(--text-2xl);font-weight:700">SnapPrompt</div>
        <div style="color:var(--text-muted);font-size:var(--text-sm)">v1.0.0</div>
        <div style="color:var(--text-secondary);font-size:var(--text-sm);margin-top:12px">웹서핑 중 발견한 LLM 프롬프트를 빠르게 저장하고 꺼내 쓰세요.</div>
      </div>
      <div class="op-card" style="margin-top:16px;display:grid;grid-template-columns:repeat(3,1fr);gap:12px;padding:20px">
        <Stat v={prompts.length} l="프롬프트" />
        <Stat v={folders.length} l="폴더" />
        <Stat v={totalUse} l="총 사용" />
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
