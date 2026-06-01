/**
 * Shared editor for image/video generation options (Round C, C-1..C-4).
 * Used by both the popup editor and the options PromptsManager. Self-styled
 * (io-* classes in prompt-options.css) so it looks identical in both places.
 */
import type { PromptKind, NegativeStyle, ImageParam, ReferenceImage, ParamControl } from '@shared/types';
import { t, locale } from '@shared/i18n';
import { packsForKind, buildParam, blankParam } from '@shared/imageparams';
import { renderParam, assemblePrompt, synthPrompt } from '@shared/assemble';
import { uuid } from '@shared/id';

export interface ImageOptionsValue {
  kind: PromptKind;
  negativePrompt: string;
  negativeStyle: NegativeStyle;
  params: ImageParam[];
  references: ReferenceImage[];
}

const KINDS: PromptKind[] = ['general', 'image', 'video'];
const CONTROLS: ParamControl[] = ['text', 'number', 'select', 'toggle'];

export function PromptOptionsEditor({
  value, onChange, body = '',
}: { value: ImageOptionsValue; onChange: (v: ImageOptionsValue) => void; body?: string }) {
  const lang = locale.value;
  const set = (patch: Partial<ImageOptionsValue>) => onChange({ ...value, ...patch });
  const generative = value.kind === 'image' || value.kind === 'video';

  // parameters
  const setParam = (id: string, patch: Partial<ImageParam>) =>
    set({ params: value.params.map((p) => (p.id === id ? { ...p, ...patch } : p)) });
  const removeParam = (id: string) => set({ params: value.params.filter((p) => p.id !== id) });

  // references
  const setRef = (id: string, patch: Partial<ReferenceImage>) =>
    set({ references: value.references.map((r) => (r.id === id ? { ...r, ...patch } : r)) });
  const removeRef = (id: string) => set({ references: value.references.filter((r) => r.id !== id) });

  const packs = packsForKind(value.kind === 'video' ? 'video' : 'image');

  return (
    <div class="io">
      <div class="io-kind">
        <span class="io-kind-label">{t('opt.kind.label')}</span>
        <div class="io-seg">
          {KINDS.map((k) => (
            <button
              key={k}
              type="button"
              class={`io-seg-btn${value.kind === k ? ' active' : ''}`}
              onClick={() => set({ kind: k })}
            >
              {t(`opt.kind.${k}`)}
            </button>
          ))}
        </div>
      </div>

      {generative && (
        <>
          {/* reference images */}
          <div class="io-section">
            <div class="io-sec-head">
              <span class="io-sec-title">{t('opt.refs.title')}</span>
              <button type="button" class="io-add" onClick={() => set({ references: [...value.references, { id: uuid(), url: '', note: '' }] })}>+ {t('opt.refs.add')}</button>
            </div>
            {value.references.length === 0 && <div class="io-hint">{t('opt.refs.empty')}</div>}
            {value.references.map((r) => (
              <div class="io-ref" key={r.id}>
                <div class="io-thumb">
                  {r.url.trim()
                    ? <img src={r.url} alt="" onError={(e) => ((e.target as HTMLImageElement).style.display = 'none')} onLoad={(e) => ((e.target as HTMLImageElement).style.display = 'block')} />
                    : <span class="io-thumb-ph">🖼</span>}
                </div>
                <div class="io-ref-fields">
                  <input class="io-input" value={r.url} placeholder={t('opt.refs.urlPlaceholder')} onInput={(e) => setRef(r.id, { url: (e.target as HTMLInputElement).value })} />
                  <input class="io-input" value={r.note ?? ''} placeholder={t('opt.refs.notePlaceholder')} onInput={(e) => setRef(r.id, { note: (e.target as HTMLInputElement).value })} />
                </div>
                <button type="button" class="io-del" title={t('common.delete')} onClick={() => removeRef(r.id)}>×</button>
              </div>
            ))}
          </div>

          {/* parameters */}
          <div class="io-section">
            <div class="io-sec-head">
              <span class="io-sec-title">{t('opt.params.title')}</span>
              <div class="io-sec-actions">
                <button type="button" class="io-add" onClick={() => set({ params: [...value.params, blankParam()] })}>+ {t('opt.params.custom')}</button>
              </div>
            </div>

            {packs.length > 0 && (
              <div class="io-presets">
                <div class="io-presets-label">{t('opt.params.fromPreset')}</div>
                {packs.map((pack) => (
                  <div class="io-pack" key={pack.id}>
                    <div class="io-pack-name">{pack.name}</div>
                    <div class="io-pack-chips">
                      {pack.presets.map((ps) => (
                        <button type="button" class="io-chip" key={ps.key} onClick={() => set({ params: [...value.params, buildParam(ps, lang)] })}>+ {ps.label[lang]}</button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {value.params.length === 0 && <div class="io-hint">{t('opt.params.empty')}</div>}
            {value.params.map((p) => (
              <div class={`io-param${p.enabled ? '' : ' off'}`} key={p.id}>
                <div class="io-param-row">
                  <input type="checkbox" checked={p.enabled} title={t('opt.params.enabled')} onChange={(e) => setParam(p.id, { enabled: (e.target as HTMLInputElement).checked })} />
                  <input class="io-input io-grow" value={p.label} placeholder={t('opt.params.labelPlaceholder')} onInput={(e) => setParam(p.id, { label: (e.target as HTMLInputElement).value })} />
                  <button type="button" class="io-del" title={t('common.delete')} onClick={() => removeParam(p.id)}>×</button>
                </div>
                <div class="io-param-row">
                  <select class="io-input io-ctrl" value={p.control} onChange={(e) => setParam(p.id, { control: (e.target as HTMLSelectElement).value as ParamControl })}>
                    {CONTROLS.map((c) => <option key={c} value={c}>{t(`opt.params.ctrl.${c}`)}</option>)}
                  </select>
                  <input class="io-input io-mono io-grow" value={p.token} placeholder={t('opt.params.tokenPlaceholder')} onInput={(e) => setParam(p.id, { token: (e.target as HTMLInputElement).value })} />
                </div>
                {p.control === 'select' && (
                  <div class="io-param-row">
                    <input class="io-input io-grow" value={(p.options ?? []).join(', ')} placeholder={t('opt.params.optionsPlaceholder')} onInput={(e) => setParam(p.id, { options: (e.target as HTMLInputElement).value.split(',').map((o) => o.trim()).filter(Boolean) })} />
                  </div>
                )}
                {p.control !== 'toggle' && (
                  <div class="io-param-row">
                    <span class="io-val-label">{t('opt.params.valueLabel')}</span>
                    {p.control === 'select' && p.options?.length ? (
                      <select class="io-input io-grow" value={p.value} onChange={(e) => setParam(p.id, { value: (e.target as HTMLSelectElement).value })}>
                        {p.options.map((o) => <option key={o} value={o}>{o}</option>)}
                      </select>
                    ) : (
                      <input class="io-input io-grow" type={p.control === 'number' ? 'number' : 'text'} value={p.value} placeholder={t('opt.params.valuePlaceholder')} onInput={(e) => setParam(p.id, { value: (e.target as HTMLInputElement).value })} />
                    )}
                  </div>
                )}
                <code class="io-token-preview">{renderParam({ ...p, enabled: true }) || '—'}</code>
              </div>
            ))}
          </div>

          {/* negative prompt */}
          <div class="io-section">
            <div class="io-sec-head"><span class="io-sec-title">{t('opt.neg.title')}</span></div>
            <textarea class="io-textarea" value={value.negativePrompt} placeholder={t('opt.neg.placeholder')} onInput={(e) => set({ negativePrompt: (e.target as HTMLTextAreaElement).value })} />
            <div class="io-neg-style">
              <label class="io-radio"><input type="radio" name="negstyle" checked={(value.negativeStyle ?? 'label') === 'label'} onChange={() => set({ negativeStyle: 'label' })} /> {t('opt.neg.styleLabel')}</label>
              <label class="io-radio"><input type="radio" name="negstyle" checked={value.negativeStyle === 'mj'} onChange={() => set({ negativeStyle: 'mj' })} /> {t('opt.neg.styleMj')}</label>
            </div>
          </div>

          {/* assembled output preview */}
          <div class="io-section">
            <div class="io-sec-head"><span class="io-sec-title">{t('opt.output.title')}</span></div>
            <code class="io-output">{assemblePrompt(synthPrompt({ body, ...value }), {}) || '—'}</code>
          </div>
        </>
      )}
    </div>
  );
}
