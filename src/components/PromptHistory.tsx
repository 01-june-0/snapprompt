/**
 * Edit-history panel (Round D, D-1 + D-3).
 * Shows past versions of a prompt with restore, and lets the user pick two
 * entries (including the current draft) to compare side by side. Used by the
 * popup and options editors. Self-styled (dh-* in prompt-options.css).
 */
import { useState } from 'preact/hooks';
import type { PromptVersion, Prompt } from '@shared/types';
import { t, locale } from '@shared/i18n';
import { assemblePrompt, synthPrompt } from '@shared/assemble';
import { firstLine } from '@shared/text';

export interface HistoryContent {
  title: string;
  body: string;
  kind?: Prompt['kind'];
  negativePrompt?: string | null;
  negativeStyle?: Prompt['negativeStyle'];
  params?: Prompt['params'];
  references?: Prompt['references'];
}

const CURRENT = '__current__';

function rel(at: number): string {
  // eslint-disable-next-line no-restricted-globals
  const s = Math.floor((Date.now() - at) / 1000);
  if (s < 60) return t('hist.now');
  const m = Math.floor(s / 60);
  if (m < 60) return t('hist.min', [m]);
  const h = Math.floor(m / 60);
  if (h < 24) return t('hist.hour', [h]);
  const d = Math.floor(h / 24);
  if (d < 30) return t('hist.day', [d]);
  return new Date(at).toLocaleDateString(locale.value === 'ko' ? 'ko-KR' : 'en-US');
}

export function PromptHistory({
  versions, current, onRestore,
}: { versions: PromptVersion[]; current: HistoryContent; onRestore: (v: PromptVersion) => void }) {
  const [sel, setSel] = useState<string[]>([]);
  if (!versions.length) return null;

  const byKey = (k: string): HistoryContent => (k === CURRENT ? current : versions[Number(k)]);
  function toggle(k: string) {
    setSel((cur) => (cur.includes(k) ? cur.filter((x) => x !== k) : [...cur, k].slice(-2)));
  }

  return (
    <div class="dh">
      <div class="dh-head">
        <span class="dh-title">{t('hist.title')}</span>
        <span class="dh-count">{t('hist.versions', [versions.length])}</span>
      </div>

      <div class="dh-list">
        <div class={`dh-row${sel.includes(CURRENT) ? ' sel' : ''}`}>
          <label class="dh-pick"><input type="checkbox" checked={sel.includes(CURRENT)} onChange={() => toggle(CURRENT)} /></label>
          <div class="dh-row-main">
            <div class="dh-row-time">{t('hist.current')}</div>
            <div class="dh-row-prev">{firstLine(current.body) || '—'}</div>
          </div>
        </div>
        {versions.map((v, i) => (
          <div class={`dh-row${sel.includes(String(i)) ? ' sel' : ''}`} key={i}>
            <label class="dh-pick"><input type="checkbox" checked={sel.includes(String(i))} onChange={() => toggle(String(i))} /></label>
            <div class="dh-row-main">
              <div class="dh-row-time">{rel(v.at)}</div>
              <div class="dh-row-prev">{firstLine(v.body) || '—'}</div>
            </div>
            <button type="button" class="dh-restore" onClick={() => onRestore(v)}>{t('hist.restore')}</button>
          </div>
        ))}
      </div>

      {sel.length === 2 && (
        <div class="dh-compare">
          {sel.map((k) => {
            const c = byKey(k);
            return (
              <div class="dh-col" key={k}>
                <div class="dh-col-head">{k === CURRENT ? t('hist.current') : rel(versions[Number(k)].at)}</div>
                <code class="dh-col-body">{assemblePrompt(synthPrompt(c), {}) || '—'}</code>
              </div>
            );
          })}
        </div>
      )}
      {sel.length < 2 && <div class="dh-hint">{t('hist.compareHint')}</div>}
    </div>
  );
}
