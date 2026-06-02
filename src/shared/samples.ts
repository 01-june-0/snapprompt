/** Built-in sample prompts offered during onboarding (localized ko/en/ja/zh). */
import type { Prompt, PromptKind, ImageParam, NegativeStyle } from './types';
import { extractVariables } from './variables';
import { uuid } from './id';
import { locale } from './i18n';

type Loc = { ko: string; en: string; ja: string; zh: string };
type LocList = { ko: string[]; en: string[]; ja: string[]; zh: string[] };
type PackParam = { label: Loc; token: string; control: ImageParam['control']; value?: string; options?: string[]; enabled?: boolean };
const PL = {
  ar: { ko: '화면비', en: 'Aspect ratio', ja: 'アスペクト比', zh: '画面比例' },
  ver: { ko: '버전', en: 'Version', ja: 'バージョン', zh: '版本' },
};
interface SampleSpec {
  title: Loc;
  body: Loc;
  tags: LocList;
  kind?: PromptKind;
  params?: PackParam[];
  negativePrompt?: string;
  negativeStyle?: NegativeStyle;
}

const L = (o: Loc): string => o[locale.value] ?? o.en;
const LT = (o: LocList): string[] => o[locale.value] ?? o.en;

const RAW: SampleSpec[] = [
  {
    title: { ko: '핵심 요약 & 다음 할 일', en: 'Key summary & next actions', ja: '要点まとめ & 次のアクション', zh: '要点总结 & 下一步' },
    body: {
      ko: '다음 내용을 읽고 정리해줘.\n1) 핵심 요점 3가지\n2) 놓치기 쉬운 포인트\n3) 바로 실행할 다음 행동(체크리스트)\n\n{{내용:textarea}}',
      en: 'Read the following and organize it.\n1) 3 key points\n2) Easy-to-miss points\n3) Next actions to take now (checklist)\n\n{{content:textarea}}',
      ja: '次の内容を読んで整理して。\n1) 要点3つ\n2) 見落としやすい点\n3) すぐ実行する次のアクション（チェックリスト）\n\n{{内容:textarea}}',
      zh: '阅读以下内容并整理。\n1) 三个要点\n2) 容易忽略的点\n3) 可立即执行的下一步（清单）\n\n{{内容:textarea}}',
    },
    tags: { ko: ['요약', '업무'], en: ['summary', 'work'], ja: ['要約', '仕事'], zh: ['总结', '工作'] },
  },
  {
    title: { ko: '코드 리뷰 (우선순위)', en: 'Code review (prioritized)', ja: 'コードレビュー（優先度）', zh: '代码评审（按优先级）' },
    body: {
      ko: '{{언어:select(TypeScript,JavaScript,Python,Go,Rust,Java)}} 코드를 리뷰해줘. 버그 → 보안 → 성능 → 가독성 순서로, 각 항목에 우선순위(P0/P1/P2)와 수정 예시를 붙여줘.\n\n{{코드:code}}',
      en: 'Review this {{language:select(TypeScript,JavaScript,Python,Go,Rust,Java)}} code. In order of bugs → security → performance → readability, add a priority (P0/P1/P2) and a fix example to each.\n\n{{code:code}}',
      ja: '{{言語:select(TypeScript,JavaScript,Python,Go,Rust,Java)}} のコードをレビューして。バグ → セキュリティ → パフォーマンス → 可読性 の順に、各項目へ優先度(P0/P1/P2)と修正例を付けて。\n\n{{コード:code}}',
      zh: '评审这段 {{语言:select(TypeScript,JavaScript,Python,Go,Rust,Java)}} 代码。按 缺陷 → 安全 → 性能 → 可读性 的顺序，为每项标注优先级(P0/P1/P2)并给出修改示例。\n\n{{代码:code}}',
    },
    tags: { ko: ['코딩', '리뷰'], en: ['coding', 'review'], ja: ['コーディング', 'レビュー'], zh: ['编程', '评审'] },
  },
  {
    title: { ko: '자연스러운 번역', en: 'Natural translation', ja: '自然な翻訳', zh: '自然翻译' },
    body: {
      ko: '다음 텍스트를 {{대상언어:select(English,한국어,日本語,中文)}}로 번역해줘. 직역이 아니라 원어민이 실제로 쓰는 자연스러운 표현으로, 어조는 {{어조:select(중립,격식,친근)}}에 맞춰줘.\n\n{{원문:textarea}}',
      en: 'Translate the text into {{target:select(English,Korean,Japanese,Chinese)}}. Not literal — use natural, native phrasing, with a {{tone:select(neutral,formal,friendly)}} tone.\n\n{{source:textarea}}',
      ja: '次のテキストを {{対象言語:select(English,한국어,日本語,中文)}} に翻訳して。直訳ではなくネイティブが実際に使う自然な表現で、トーンは {{トーン:select(中立,フォーマル,フレンドリー)}} に合わせて。\n\n{{原文:textarea}}',
      zh: '将下面的文本翻译成 {{目标语言:select(English,한국어,日本語,中文)}}。不要直译，用母语者实际使用的自然表达，语气保持 {{语气:select(中立,正式,亲切)}}。\n\n{{原文:textarea}}',
    },
    tags: { ko: ['번역', '글쓰기'], en: ['translation', 'writing'], ja: ['翻訳', 'ライティング'], zh: ['翻译', '写作'] },
  },
  {
    title: { ko: '이미지 프롬프트 (영문)', en: 'Image prompt (English)', ja: '画像プロンプト（英語）', zh: '图像提示词（英文）' },
    body: {
      ko: 'A {{스타일:select(photorealistic,cinematic,watercolor,3D render,anime,line art)}} image of {{주제}}, {{분위기}} mood, detailed lighting.',
      en: 'A {{style:select(photorealistic,cinematic,watercolor,3D render,anime,line art)}} image of {{subject}}, {{mood}} mood, detailed lighting.',
      ja: 'A {{スタイル:select(photorealistic,cinematic,watercolor,3D render,anime,line art)}} image of {{被写体}}, {{雰囲気}} mood, detailed lighting.',
      zh: 'A {{风格:select(photorealistic,cinematic,watercolor,3D render,anime,line art)}} image of {{主体}}, {{氛围}} mood, detailed lighting.',
    },
    tags: { ko: ['이미지'], en: ['image'], ja: ['画像'], zh: ['图像'] },
    kind: 'image',
    negativePrompt: 'blurry, low quality, text, watermark, extra fingers',
    params: [
      { label: PL.ar, token: '--ar {}', control: 'select', value: '16:9', options: ['1:1', '16:9', '9:16', '4:5', '3:2'], enabled: true },
      { label: PL.ver, token: '--v {}', control: 'select', value: '6.1', options: ['6.1', '6'], enabled: true },
    ],
  },
  {
    title: { ko: '무엇이든 쉽게 설명', en: 'Explain anything simply', ja: 'なんでも分かりやすく説明', zh: '把任何东西讲简单' },
    body: {
      ko: '"{{주제}}"를 {{수준:select(초등학생,중고등학생,비전공자,실무자)}} 눈높이로 설명해줘. 핵심을 한 줄로 요약한 뒤, 적절한 비유 1개와 흔한 오해 1가지를 꼭 포함해줘.',
      en: 'Explain "{{topic}}" at a {{level:select(elementary,high school,non-expert,practitioner)}} level. Summarize the core in one line, then include one good analogy and one common misconception.',
      ja: '「{{トピック}}」を {{レベル:select(小学生,中高生,初心者,実務者)}} の目線で説明して。要点を一行でまとめてから、適切な例え1つとよくある誤解1つを必ず含めて。',
      zh: '用 {{水平:select(小学生,中学生,非专业,从业者)}} 的视角解释“{{主题}}”。先用一句话概括核心，再务必包含一个恰当的类比和一个常见误解。',
    },
    tags: { ko: ['학습'], en: ['learning'], ja: ['学習'], zh: ['学习'] },
  },
];

export function buildSamplePrompts(): Prompt[] {
  const now = Date.now();
  return RAW.map((r, i) => {
    const body = L(r.body);
    return {
      id: uuid(),
      title: L(r.title),
      body,
      variables: extractVariables(body + '\n' + (r.negativePrompt ?? '')),
      folderId: null,
      tags: LT(r.tags),
      memo: null,
      sourceUrl: null,
      favorite: false,
      kind: r.kind,
      negativePrompt: r.negativePrompt ?? null,
      negativeStyle: r.negativeStyle ?? 'label',
      params: r.params?.map((p) => ({
        id: uuid(), label: L(p.label), token: p.token, control: p.control,
        value: p.value ?? '', options: p.options, enabled: p.enabled ?? true,
      })),
      createdAt: now - i,
      updatedAt: now - i,
      lastUsedAt: null,
      useCount: 0,
    };
  });
}
