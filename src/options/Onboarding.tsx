import { useState } from 'preact/hooks';
import { setSettings, getPrompts, setPrompts } from '@shared/store';
import { buildSamplePrompts } from '@shared/samples';
import { t } from '@shared/i18n';

export function Onboarding() {
  const [step, setStep] = useState(1);
  const [addSamples, setAddSamples] = useState(true);

  async function finish() {
    if (addSamples) {
      const existing = await getPrompts();
      await setPrompts([...buildSamplePrompts(), ...existing]);
    }
    await setSettings({ onboardingCompletedAt: Date.now() });
    location.hash = '';
    location.reload();
  }

  const heroTitle = t(`ob.hero${step}.title`);
  const heroDesc = t(`ob.hero${step}.desc`);

  return (
    <div class="ob-wrap">
      <div class="ob-window">
        <div class="ob-hero">
          <div class="ob-hero-brand">
            <div class="ob-hero-mark"><Mark /></div>
            <div class="ob-hero-name">SnapPrompt</div>
          </div>
          <div class="ob-hero-content">
            <h2>{heroTitle}</h2>
            <p>{heroDesc}</p>
            <div class="ob-dots">
              <Dot n={1} step={step} label={t('ob.dot.shortcut')} />
              <Dot n={2} step={step} label={t('ob.dot.samples')} />
              <Dot n={3} step={step} label={t('ob.dot.features')} />
              <Dot n={4} step={step} label={t('ob.dot.theme')} />
            </div>
          </div>
        </div>

        <div class="ob-body">
          <div class="ob-progress"><div style={`width:${(step / 4) * 100}%`} /></div>

          {step === 1 && (
            <>
              <div class="ob-kicker">STEP 1 / 4</div>
              <h3>{t('ob.step1.title')}</h3>
              <p>{t('ob.step1.desc')}</p>
              <div class="ob-content">
                <div class="kbd-display">
                  <span class="kbd-big">⌘</span><span>+</span><span class="kbd-big">⇧</span><span>+</span><span class="kbd-big">L</span>
                  <span style="margin-left:8px;color:var(--text-muted);font-size:var(--text-sm)">{t('ob.recommended')}</span>
                </div>
                <button class="op-btn secondary" onClick={() => chrome.tabs.create({ url: 'chrome://extensions/shortcuts' })}>{t('ob.openShortcuts')}</button>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div class="ob-kicker">STEP 2 / 4</div>
              <h3>{t('ob.step2.title')}</h3>
              <p>{t('ob.step2.desc')}</p>
              <div class="ob-content">
                {buildSamplePrompts().map((s) => (
                  <div class={`sample-card${addSamples ? ' sel' : ''}`} key={s.id} onClick={() => setAddSamples((v) => !v)}>
                    <div class="sample-check">{addSamples && <Check />}</div>
                    <div style="flex:1;min-width:0">
                      <div class="sample-title">{s.title}</div>
                      <div class="sample-prev">{s.body.replace(/\s+/g, ' ').slice(0, 60)}</div>
                    </div>
                  </div>
                ))}
                <div style="font-size:11px;color:var(--text-muted);text-align:center;margin-top:8px">
                  {addSamples ? t('ob.samplesAdd', [3]) : t('ob.samplesNone')} · {t('ob.samplesToggleHint')}
                </div>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <div class="ob-kicker">STEP 3 / 4</div>
              <h3>{t('ob.step3.title')}</h3>
              <p>{t('ob.step3.desc')}</p>
              <div class="ob-content" style="gap:10px">
                {([
                  ['🧩', t('ob.feat.vars.t'), t('ob.feat.vars.d')],
                  ['🖼', t('ob.feat.image.t'), t('ob.feat.image.d')],
                  ['🕘', t('ob.feat.history.t'), t('ob.feat.history.d')],
                  ['🪟', t('ob.feat.modes.t'), t('ob.feat.modes.d')],
                ] as const).map(([icon, title, desc]) => (
                  <div class="op-card" key={title} style="padding:12px 14px;display:flex;gap:12px;align-items:flex-start">
                    <span style="font-size:20px;line-height:1.2">{icon}</span>
                    <div>
                      <div style="font-weight:var(--weight-semi);font-size:var(--text-sm)">{title}</div>
                      <div style="font-size:var(--text-xs);color:var(--text-muted);margin-top:2px;line-height:1.5">{desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {step === 4 && (
            <>
              <div class="ob-kicker">STEP 4 / 4</div>
              <h3>{t('ob.step4.title')}</h3>
              <p>{t('ob.step4.desc')}</p>
              <div class="ob-content">
                <div class="op-card" style="padding:16px">{t('ob.step4.body')}</div>
              </div>
            </>
          )}

          <div class="ob-foot">
            <button class="op-btn secondary sm" onClick={finish} style="border:none;color:var(--text-muted)">{t('ob.skip')}</button>
            <div style="display:flex;gap:8px">
              {step > 1 && <button class="op-btn secondary" onClick={() => setStep((s) => s - 1)}>{t('ob.prev')}</button>}
              {step < 4
                ? <button class="op-btn primary" onClick={() => setStep((s) => s + 1)}>{t('ob.next')}</button>
                : <button class="op-btn primary" onClick={finish}>{t('ob.start')}</button>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Dot({ n, step, label }: { n: number; step: number; label: string }) {
  return <div class={`ob-dot${n === step ? ' active' : ''}`}><span class="num">{n}</span><span class="lbl">{label}</span></div>;
}
const Mark = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3h12l-2 8 4 5-7-2-7 4 2-9-4-4z" /></svg>;
const Check = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12" /></svg>;
