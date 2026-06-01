/** Built-in sample prompts offered during onboarding. */
import type { Prompt, PromptKind, ImageParam, NegativeStyle } from './types';
import { extractVariables } from './variables';
import { uuid } from './id';

type PackParam = Omit<ImageParam, 'id'>;
interface SampleSpec {
  title: string;
  body: string;
  tags: string[];
  kind?: PromptKind;
  params?: PackParam[];
  negativePrompt?: string;
  negativeStyle?: NegativeStyle;
}

const RAW: SampleSpec[] = [
  {
    title: '핵심 요약 & 다음 할 일',
    body: '다음 내용을 읽고 정리해줘.\n1) 핵심 요점 3가지\n2) 놓치기 쉬운 포인트\n3) 바로 실행할 다음 행동(체크리스트)\n\n{{내용:textarea}}',
    tags: ['요약', '업무'],
  },
  {
    title: '코드 리뷰 (우선순위)',
    body: '{{언어:select(TypeScript,JavaScript,Python,Go,Rust,Java)}} 코드를 리뷰해줘. 버그 → 보안 → 성능 → 가독성 순서로, 각 항목에 우선순위(P0/P1/P2)와 수정 예시를 붙여줘.\n\n{{코드:code}}',
    tags: ['코딩', '리뷰'],
  },
  {
    title: '자연스러운 번역',
    body: '다음 텍스트를 {{대상언어:select(English,한국어,日本語,中文)}}로 번역해줘. 직역이 아니라 원어민이 실제로 쓰는 자연스러운 표현으로, 어조는 {{어조:select(중립,격식,친근)}}에 맞춰줘.\n\n{{원문:textarea}}',
    tags: ['번역', '글쓰기'],
  },
  {
    title: '이미지 프롬프트 (영문)',
    body: 'A {{스타일:select(photorealistic,cinematic,watercolor,3D render,anime,line art)}} image of {{주제}}, {{분위기}} mood, detailed lighting.',
    tags: ['이미지'],
    kind: 'image',
    negativePrompt: 'blurry, low quality, text, watermark, extra fingers',
    params: [
      { label: '화면비', token: '--ar {}', control: 'select', value: '16:9', options: ['1:1', '16:9', '9:16', '4:5', '3:2'], enabled: true },
      { label: '버전', token: '--v {}', control: 'select', value: '6.1', options: ['6.1', '6'], enabled: true },
    ],
  },
  {
    title: '무엇이든 쉽게 설명',
    body: '"{{주제}}"를 {{수준:select(초등학생,중고등학생,비전공자,실무자)}} 눈높이로 설명해줘. 핵심을 한 줄로 요약한 뒤, 적절한 비유 1개와 흔한 오해 1가지를 꼭 포함해줘.',
    tags: ['학습'],
  },
];

export function buildSamplePrompts(): Prompt[] {
  const now = Date.now();
  return RAW.map((r, i) => ({
    id: uuid(),
    title: r.title,
    body: r.body,
    variables: extractVariables(r.body + '\n' + (r.negativePrompt ?? '')),
    folderId: null,
    tags: r.tags,
    memo: null,
    sourceUrl: null,
    favorite: false,
    kind: r.kind,
    negativePrompt: r.negativePrompt ?? null,
    negativeStyle: r.negativeStyle ?? 'label',
    params: r.params?.map((p) => ({ ...p, id: uuid() })),
    createdAt: now - i,
    updatedAt: now - i,
    lastUsedAt: null,
    useCount: 0,
  }));
}
