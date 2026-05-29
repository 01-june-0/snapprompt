import { useState } from 'preact/hooks';
import { setSettings, getPrompts, setPrompts } from '@shared/store';
import { buildSamplePrompts } from '@shared/samples';

const HERO = {
  1: { title: '환영해요 👋', desc: '좋은 프롬프트를 발견하면 스냅, 필요할 때 한 번에 꺼내 쓰세요. 시작하기 전에 딱 세 가지만 설정해요.' },
  2: { title: '거의 다 됐어요', desc: '미리 준비된 샘플로 바로 감을 잡을 수 있어요. 본인 프롬프트로 채워가면 됩니다.' },
  3: { title: '마지막 단계예요 ✨', desc: '이제 끝! 설정을 확인하고 SnapPrompt를 시작하세요.' },
} as const;

export function Onboarding() {
  const [step, setStep] = useState(1);
  const [addSamples, setAddSamples] = useState(true);

  async function finish() {
    if (addSamples) {
      const existing = await getPrompts();
      await setPrompts([...buildSamplePrompts(), ...existing]);
    }
    await setSettings({ onboardingCompletedAt: Date.now() });
    // strip the hash and show the full options page
    location.hash = '';
    location.reload();
  }

  const hero = HERO[step as 1 | 2 | 3];

  return (
    <div class="ob-wrap">
      <div class="ob-window">
        <div class="ob-hero">
          <div class="ob-hero-brand">
            <div class="ob-hero-mark"><Mark /></div>
            <div class="ob-hero-name">SnapPrompt</div>
          </div>
          <div class="ob-hero-content">
            <h2>{hero.title}</h2>
            <p>{hero.desc}</p>
            <div class="ob-dots">
              <Dot n={1} step={step} label="단축키" />
              <Dot n={2} step={step} label="샘플" />
              <Dot n={3} step={step} label="테마·언어" />
            </div>
          </div>
        </div>

        <div class="ob-body">
          <div class="ob-progress"><div style={`width:${(step / 3) * 100}%`} /></div>

          {step === 1 && (
            <>
              <div class="ob-kicker">STEP 1 / 3</div>
              <h3>단축키 설정</h3>
              <p>어떤 사이트에서든 단축키로 프롬프트 피커를 띄울 수 있어요. Chrome 정책상 단축키는 직접 지정해야 해요.</p>
              <div class="ob-content">
                <div class="kbd-display">
                  <span class="kbd-big">⌘</span><span>+</span><span class="kbd-big">⇧</span><span>+</span><span class="kbd-big">L</span>
                  <span style="margin-left:8px;color:var(--text-muted);font-size:var(--text-sm)">추천</span>
                </div>
                <button class="op-btn secondary" onClick={() => chrome.tabs.create({ url: 'chrome://extensions/shortcuts' })}>chrome://extensions/shortcuts 열기</button>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div class="ob-kicker">STEP 2 / 3</div>
              <h3>샘플 프롬프트로 시작</h3>
              <p>처음이라면 자주 쓰이는 프롬프트 몇 개로 시작해보세요. 나중에 자유롭게 수정·삭제할 수 있어요.</p>
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
                  {addSamples ? '3개 샘플이 추가됩니다' : '빈 상태로 시작합니다'} · 카드를 눌러 토글
                </div>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <div class="ob-kicker">STEP 3 / 3</div>
              <h3>테마와 언어 확인</h3>
              <p>시스템 설정을 자동으로 감지했어요. 나중에 설정에서 변경할 수 있어요.</p>
              <div class="ob-content">
                <div class="op-card" style="padding:16px">시스템 테마·언어를 따릅니다. 설정 → 일반에서 언제든 바꿀 수 있어요.</div>
              </div>
            </>
          )}

          <div class="ob-foot">
            <button class="op-btn secondary sm" onClick={finish} style="border:none;color:var(--text-muted)">건너뛰기</button>
            <div style="display:flex;gap:8px">
              {step > 1 && <button class="op-btn secondary" onClick={() => setStep((s) => s - 1)}>이전</button>}
              {step < 3
                ? <button class="op-btn primary" onClick={() => setStep((s) => s + 1)}>다음</button>
                : <button class="op-btn primary" onClick={finish}>SnapPrompt 시작하기</button>}
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
