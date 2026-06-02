/**
 * Domain starter packs (localized ko/en/ja/zh). Each pack becomes a folder +
 * a set of prompts, showcasing variables and image/video generation options.
 * Title/body/tags resolve to the active locale at build time (en fallback).
 */
import type { Prompt, Folder, PromptKind, NegativeStyle, ParamControl } from './types';
import { extractVariables } from './variables';
import { uuid } from './id';
import { locale } from './i18n';

type Loc = { ko: string; en: string; ja: string; zh: string };
type LocList = { ko: string[]; en: string[]; ja: string[]; zh: string[] };
type PackParam = { label: Loc; token: string; control: ParamControl; value?: string; options?: string[]; enabled?: boolean };
interface PackPrompt {
  title: Loc;
  body: Loc;
  tags: LocList;
  kind?: PromptKind;
  params?: PackParam[];
  negativePrompt?: string;
  negativeStyle?: NegativeStyle;
}

export interface StarterPack {
  id: 'image' | 'video' | 'coding' | 'writing' | 'marketing' | 'work';
  prompts: PackPrompt[];
}

const L = (o: Loc): string => o[locale.value] ?? o.en;
const LT = (o: LocList): string[] => o[locale.value] ?? o.en;

// localized parameter labels (resolved at build time, not module load)
const PL = {
  ar: { ko: '화면비', en: 'Aspect ratio', ja: 'アスペクト比', zh: '画面比例' },
  ver: { ko: '버전', en: 'Version', ja: 'バージョン', zh: '版本' },
  sty: { ko: '스타일화', en: 'Stylize', ja: 'スタイライズ', zh: '风格化' },
  cam: { ko: '카메라', en: 'Camera', ja: 'カメラ', zh: '镜头' },
  fps: { ko: 'FPS', en: 'FPS', ja: 'FPS', zh: '帧率' },
  mot: { ko: '모션 강도', en: 'Motion', ja: 'モーション強度', zh: '运动强度' },
};
const AR = (value: string, options: string[]): PackParam => ({ label: PL.ar, token: '--ar {}', control: 'select', value, options, enabled: true });
const MJ_V: PackParam = { label: PL.ver, token: '--v {}', control: 'select', value: '6.1', options: ['6.1', '6'], enabled: true };
const PIKA_AR = (value: string): PackParam => ({ label: PL.ar, token: '-ar {}', control: 'select', value, options: ['16:9', '9:16', '1:1', '4:5'], enabled: true });
const PIKA_CAM = (value: string): PackParam => ({ label: PL.cam, token: '-camera {}', control: 'select', value, options: ['zoom in', 'zoom out', 'pan left', 'pan right', 'pan up', 'pan down', 'rotate cw', 'rotate ccw'], enabled: true });

export const STARTER_PACKS: StarterPack[] = [
  {
    id: 'image',
    prompts: [
      {
        title: { ko: '사진풍 인물', en: 'Portrait photo', ja: 'ポートレート写真', zh: '人像照片' },
        body: {
          ko: 'A {{샷:select(close-up portrait,half body,full body)}} photo of {{대상}}, {{조명:select(soft natural light,golden hour,studio lighting,cinematic)}}, shot on 85mm, shallow depth of field.',
          en: 'A {{shot:select(close-up portrait,half body,full body)}} photo of {{subject}}, {{lighting:select(soft natural light,golden hour,studio lighting,cinematic)}}, shot on 85mm, shallow depth of field.',
          ja: 'A {{ショット:select(close-up portrait,half body,full body)}} photo of {{被写体}}, {{ライティング:select(soft natural light,golden hour,studio lighting,cinematic)}}, shot on 85mm, shallow depth of field.',
          zh: 'A {{镜头:select(close-up portrait,half body,full body)}} photo of {{主体}}, {{光线:select(soft natural light,golden hour,studio lighting,cinematic)}}, shot on 85mm, shallow depth of field.',
        },
        tags: { ko: ['이미지', '인물'], en: ['image', 'portrait'], ja: ['画像', '人物'], zh: ['图像', '人像'] },
        kind: 'image', negativePrompt: 'deformed hands, extra fingers, blurry, plastic skin, text, watermark',
        params: [AR('4:5', ['1:1', '4:5', '3:4', '16:9']), MJ_V],
      },
      {
        title: { ko: '제품 목업 / 광고컷', en: 'Product mockup / ad shot', ja: '製品モックアップ / 広告写真', zh: '产品样机 / 广告图' },
        body: {
          ko: 'Product shot of {{제품}} on a {{배경:select(clean white,marble,wooden table,gradient studio)}} background, professional commercial photography, high detail, soft shadows.',
          en: 'Product shot of {{product}} on a {{background:select(clean white,marble,wooden table,gradient studio)}} background, professional commercial photography, high detail, soft shadows.',
          ja: 'Product shot of {{製品}} on a {{背景:select(clean white,marble,wooden table,gradient studio)}} background, professional commercial photography, high detail, soft shadows.',
          zh: 'Product shot of {{产品}} on a {{背景:select(clean white,marble,wooden table,gradient studio)}} background, professional commercial photography, high detail, soft shadows.',
        },
        tags: { ko: ['이미지', '제품'], en: ['image', 'product'], ja: ['画像', '製品'], zh: ['图像', '产品'] },
        kind: 'image', negativePrompt: 'low quality, distorted logo, text, watermark',
        params: [AR('1:1', ['1:1', '4:5', '16:9'])],
      },
      {
        title: { ko: '컨셉 아트 / 일러스트', en: 'Concept art / illustration', ja: 'コンセプトアート / イラスト', zh: '概念艺术 / 插画' },
        body: {
          ko: '{{주제}} concept art, {{스타일:select(digital painting,studio ghibli,cyberpunk,watercolor,low poly)}} style, {{분위기}} atmosphere, dramatic lighting, highly detailed.',
          en: '{{subject}} concept art, {{style:select(digital painting,studio ghibli,cyberpunk,watercolor,low poly)}} style, {{mood}} atmosphere, dramatic lighting, highly detailed.',
          ja: '{{被写体}} concept art, {{スタイル:select(digital painting,studio ghibli,cyberpunk,watercolor,low poly)}} style, {{雰囲気}} atmosphere, dramatic lighting, highly detailed.',
          zh: '{{主体}} concept art, {{风格:select(digital painting,studio ghibli,cyberpunk,watercolor,low poly)}} style, {{氛围}} atmosphere, dramatic lighting, highly detailed.',
        },
        tags: { ko: ['이미지', '아트'], en: ['image', 'art'], ja: ['画像', 'アート'], zh: ['图像', '艺术'] },
        kind: 'image', params: [AR('16:9', ['16:9', '21:9', '1:1']), { label: PL.sty, token: '--stylize {}', control: 'number', value: '300', enabled: true }],
      },
      {
        title: { ko: 'Midjourney 프롬프트 변환', en: 'Midjourney prompt conversion', ja: 'Midjourneyプロンプト変換', zh: 'Midjourney 提示词转换' },
        body: {
          ko: '다음 한글 컨셉을 Midjourney용 영문 프롬프트로 바꿔줘. 구체적인 피사체·스타일·조명·구도 키워드를 풍부하게 포함하되 한 문단으로.\n\n컨셉: {{컨셉}}',
          en: 'Convert this concept into a rich English Midjourney prompt — include concrete subject, style, lighting, and composition keywords, in one paragraph.\n\nConcept: {{concept}}',
          ja: '次のコンセプトを Midjourney 用の英語プロンプトに変換して。被写体・スタイル・照明・構図のキーワードを具体的に盛り込み、一段落で。\n\nコンセプト: {{コンセプト}}',
          zh: '把下面的创意转换为用于 Midjourney 的英文提示词，丰富地包含具体的主体、风格、光照、构图关键词，用一段呈现。\n\n创意: {{创意}}',
        },
        tags: { ko: ['이미지', 'MJ'], en: ['image', 'MJ'], ja: ['画像', 'MJ'], zh: ['图像', 'MJ'] },
      },
    ],
  },
  {
    id: 'video',
    prompts: [
      {
        title: { ko: '시네마틱 B-roll', en: 'Cinematic b-roll', ja: 'シネマティックB-roll', zh: '电影感空镜' },
        body: {
          ko: 'Cinematic b-roll of {{장면}}, {{시간대:select(golden hour,blue hour,night,overcast)}}, slow camera movement, shallow depth of field, film grain.',
          en: 'Cinematic b-roll of {{scene}}, {{timeOfDay:select(golden hour,blue hour,night,overcast)}}, slow camera movement, shallow depth of field, film grain.',
          ja: 'Cinematic b-roll of {{シーン}}, {{時間帯:select(golden hour,blue hour,night,overcast)}}, slow camera movement, shallow depth of field, film grain.',
          zh: 'Cinematic b-roll of {{场景}}, {{时段:select(golden hour,blue hour,night,overcast)}}, slow camera movement, shallow depth of field, film grain.',
        },
        tags: { ko: ['영상', 'b-roll'], en: ['video', 'b-roll'], ja: ['動画', 'b-roll'], zh: ['视频', '空镜'] },
        kind: 'video', params: [PIKA_AR('16:9'), PIKA_CAM('pan right'), { label: PL.fps, token: '-fps {}', control: 'number', value: '24', enabled: true }],
      },
      {
        title: { ko: '제품 회전 쇼케이스', en: 'Product rotation showcase', ja: '製品回転ショーケース', zh: '产品旋转展示' },
        body: {
          ko: '{{제품}} rotating slowly on a turntable, studio lighting, seamless background, product showcase.',
          en: '{{product}} rotating slowly on a turntable, studio lighting, seamless background, product showcase.',
          ja: '{{製品}} rotating slowly on a turntable, studio lighting, seamless background, product showcase.',
          zh: '{{产品}} rotating slowly on a turntable, studio lighting, seamless background, product showcase.',
        },
        tags: { ko: ['영상', '제품'], en: ['video', 'product'], ja: ['動画', '製品'], zh: ['视频', '产品'] },
        kind: 'video', params: [PIKA_AR('1:1'), PIKA_CAM('rotate cw')],
      },
      {
        title: { ko: '풍경 타임랩스', en: 'Landscape timelapse', ja: '風景タイムラプス', zh: '风景延时' },
        body: {
          ko: 'Timelapse of {{풍경}}, moving clouds, changing light, wide establishing shot.',
          en: 'Timelapse of {{landscape}}, moving clouds, changing light, wide establishing shot.',
          ja: 'Timelapse of {{風景}}, moving clouds, changing light, wide establishing shot.',
          zh: 'Timelapse of {{风景}}, moving clouds, changing light, wide establishing shot.',
        },
        tags: { ko: ['영상', '풍경'], en: ['video', 'landscape'], ja: ['動画', '風景'], zh: ['视频', '风景'] },
        kind: 'video', params: [PIKA_AR('16:9'), { label: PL.mot, token: '-motion {}', control: 'select', value: '3', options: ['0', '1', '2', '3', '4'], enabled: true }],
      },
      {
        title: { ko: '영상 스토리보드 짜기', en: 'Video storyboard', ja: '動画絵コンテ作成', zh: '视频分镜脚本' },
        body: {
          ko: '"{{컨셉}}" 아이디어로 {{길이:number|15}}초짜리 영상을 만들려고 해. 샷 단위로 스토리보드를 표로 정리해줘 (샷 번호 / 화면 설명 / 카메라 움직임 / 길이).',
          en: 'I want to make a {{seconds:number|15}}-second video from the idea "{{concept}}". Lay out a shot-by-shot storyboard as a table (shot # / description / camera move / duration).',
          ja: 'アイデア「{{コンセプト}}」で {{秒数:number|15}} 秒の動画を作りたい。ショットごとに絵コンテを表で整理して（ショット番号 / 画面説明 / カメラの動き / 長さ）。',
          zh: '想用创意“{{概念}}”做一个 {{秒数:number|15}} 秒的视频。请按镜头整理分镜表（镜头号 / 画面说明 / 运镜 / 时长）。',
        },
        tags: { ko: ['영상', '기획'], en: ['video', 'planning'], ja: ['動画', '企画'], zh: ['视频', '策划'] },
      },
    ],
  },
  {
    id: 'coding',
    prompts: [
      {
        title: { ko: '코드 리뷰', en: 'Code review', ja: 'コードレビュー', zh: '代码评审' },
        body: {
          ko: '{{언어:select(TypeScript,JavaScript,Python,Go,Rust,Java,C++)}} 코드를 리뷰해줘. 버그 → 보안 → 성능 → 가독성 순으로, 우선순위(P0/P1/P2)와 수정 예시를 붙여줘.\n\n{{코드:code}}',
          en: 'Review this {{language:select(TypeScript,JavaScript,Python,Go,Rust,Java,C++)}} code. In order of bugs → security → performance → readability, add priority (P0/P1/P2) and a fix example.\n\n{{code:code}}',
          ja: '{{言語:select(TypeScript,JavaScript,Python,Go,Rust,Java,C++)}} のコードをレビューして。バグ → セキュリティ → パフォーマンス → 可読性 の順に、優先度(P0/P1/P2)と修正例を付けて。\n\n{{コード:code}}',
          zh: '评审这段 {{语言:select(TypeScript,JavaScript,Python,Go,Rust,Java,C++)}} 代码。按 缺陷 → 安全 → 性能 → 可读性 的顺序，标注优先级(P0/P1/P2)并给出修改示例。\n\n{{代码:code}}',
        },
        tags: { ko: ['코딩', '리뷰'], en: ['coding', 'review'], ja: ['コーディング', 'レビュー'], zh: ['编程', '评审'] },
      },
      {
        title: { ko: '단위 테스트 작성', en: 'Write unit tests', ja: 'ユニットテスト作成', zh: '编写单元测试' },
        body: {
          ko: '{{프레임워크:select(Jest,Vitest,Pytest,Go test,JUnit)}}로 다음 함수의 단위 테스트를 작성해줘.{{#if 엣지케이스}} 경계값·예외 등 엣지 케이스도 포함해줘.{{/if}}\n\n{{코드:code}}',
          en: 'Write unit tests for this function using {{framework:select(Jest,Vitest,Pytest,Go test,JUnit)}}.{{#if edgeCases}} Include edge cases like boundaries and exceptions.{{/if}}\n\n{{code:code}}',
          ja: '{{フレームワーク:select(Jest,Vitest,Pytest,Go test,JUnit)}} で次の関数のユニットテストを書いて。{{#if エッジケース}} 境界値や例外などエッジケースも含めて。{{/if}}\n\n{{コード:code}}',
          zh: '用 {{框架:select(Jest,Vitest,Pytest,Go test,JUnit)}} 为下面的函数编写单元测试。{{#if 边界情况}} 包含边界值、异常等边界情况。{{/if}}\n\n{{代码:code}}',
        },
        tags: { ko: ['코딩', '테스트'], en: ['coding', 'testing'], ja: ['コーディング', 'テスト'], zh: ['编程', '测试'] },
      },
      {
        title: { ko: '에러 / 스택트레이스 분석', en: 'Error / stack trace analysis', ja: 'エラー / スタックトレース解析', zh: '错误 / 堆栈分析' },
        body: {
          ko: '다음 에러의 원인을 추정하고, 가장 가능성 높은 순서로 해결 방법을 단계별로 알려줘.\n\n{{에러:code}}',
          en: 'Infer the cause of this error and give step-by-step fixes in order of likelihood.\n\n{{error:code}}',
          ja: '次のエラーの原因を推定し、可能性の高い順に解決方法を段階的に教えて。\n\n{{エラー:code}}',
          zh: '推断下面错误的原因，并按可能性从高到低给出分步解决方法。\n\n{{错误:code}}',
        },
        tags: { ko: ['코딩', '디버깅'], en: ['coding', 'debugging'], ja: ['コーディング', 'デバッグ'], zh: ['编程', '调试'] },
      },
      {
        title: { ko: '리팩터링 제안', en: 'Refactoring suggestions', ja: 'リファクタリング提案', zh: '重构建议' },
        body: {
          ko: '다음 코드를 {{목표:select(가독성,성능,테스트 용이성,타입 안정성)}} 관점에서 리팩터링해줘. 변경 이유를 설명으로 정리하고, 동작은 유지해줘.\n\n{{코드:code}}',
          en: 'Refactor this code for {{goal:select(readability,performance,testability,type safety)}}. Explain why each change, and keep behavior unchanged.\n\n{{code:code}}',
          ja: '次のコードを {{目標:select(可読性,パフォーマンス,テスト容易性,型安全性)}} の観点でリファクタリングして。変更理由を説明としてまとめ、動作は維持して。\n\n{{コード:code}}',
          zh: '从 {{目标:select(可读性,性能,可测试性,类型安全)}} 角度重构下面的代码。说明每处改动的原因，并保持行为不变。\n\n{{代码:code}}',
        },
        tags: { ko: ['코딩', '리팩터링'], en: ['coding', 'refactor'], ja: ['コーディング', 'リファクタ'], zh: ['编程', '重构'] },
      },
      {
        title: { ko: 'SQL / 정규식 생성', en: 'SQL / regex generator', ja: 'SQL / 正規表現 生成', zh: 'SQL / 正则 生成' },
        body: {
          ko: '다음 요구사항을 만족하는 {{종류:select(SQL 쿼리,정규식,셸 명령)}}을 만들어줘. 동작 설명과 주의점도 함께.\n\n요구사항: {{요구사항}}',
          en: 'Create a {{kind:select(SQL query,regex,shell command)}} that meets the requirement below, with an explanation and caveats.\n\nRequirement: {{requirement}}',
          ja: '次の要件を満たす {{種類:select(SQLクエリ,正規表現,シェルコマンド)}} を作って。動作の説明と注意点も添えて。\n\n要件: {{要件}}',
          zh: '生成满足下述需求的 {{类型:select(SQL 查询,正则表达式,Shell 命令)}}，并附上说明与注意事项。\n\n需求: {{需求}}',
        },
        tags: { ko: ['코딩'], en: ['coding'], ja: ['コーディング'], zh: ['编程'] },
      },
    ],
  },
  {
    id: 'writing',
    prompts: [
      {
        title: { ko: '톤 변환', en: 'Tone shift', ja: 'トーン変換', zh: '语气转换' },
        body: {
          ko: '다음 글을 {{톤:select(격식,친근,전문적,캐주얼,설득적)}} 톤으로, {{길이:select(더 짧게,비슷하게,더 길게)}} 다시 써줘. 의미는 유지해줘.\n\n{{내용:textarea}}',
          en: 'Rewrite this in a {{tone:select(formal,friendly,professional,casual,persuasive)}} tone, {{length:select(shorter,similar,longer)}}. Keep the meaning.\n\n{{content:textarea}}',
          ja: '次の文章を {{トーン:select(フォーマル,フレンドリー,プロフェッショナル,カジュアル,説得的)}} なトーンで、{{長さ:select(短く,同程度,長く)}} 書き直して。意味は保って。\n\n{{内容:textarea}}',
          zh: '把下面的文字改写为 {{语气:select(正式,亲切,专业,随意,有说服力)}} 的语气，{{长度:select(更短,差不多,更长)}}。保持原意。\n\n{{内容:textarea}}',
        },
        tags: { ko: ['글쓰기'], en: ['writing'], ja: ['ライティング'], zh: ['写作'] },
      },
      {
        title: { ko: '이메일 작성', en: 'Write an email', ja: 'メール作成', zh: '撰写邮件' },
        body: {
          ko: '{{대상}}에게 보내는 "{{목적}}" 이메일을 {{톤:select(격식,친근,정중한 거절,협상)}} 톤으로 작성해줘. 제목 후보 2개와 본문을 제시해줘.',
          en: 'Write a "{{purpose}}" email to {{recipient}} in a {{tone:select(formal,friendly,polite decline,negotiation)}} tone. Give 2 subject options and the body.',
          ja: '{{宛先}} 宛ての「{{目的}}」メールを {{トーン:select(フォーマル,フレンドリー,丁寧な辞退,交渉)}} なトーンで書いて。件名候補2つと本文を提示して。',
          zh: '给 {{收件人}} 写一封“{{目的}}”邮件，语气为 {{语气:select(正式,亲切,礼貌拒绝,协商)}}。给出2个标题备选和正文。',
        },
        tags: { ko: ['글쓰기', '이메일'], en: ['writing', 'email'], ja: ['ライティング', 'メール'], zh: ['写作', '邮件'] },
      },
      {
        title: { ko: '교정 & 윤문', en: 'Proofread & polish', ja: '校正 & 推敲', zh: '校对 & 润色' },
        body: {
          ko: '다음 글의 맞춤법·문법을 교정하고 더 자연스럽게 다듬어줘. {{설명:select(결과만,수정 내역 표시)}}로 보여줘.\n\n{{내용:textarea}}',
          en: 'Fix spelling and grammar and make this read more naturally. Show {{detail:select(result only,with changes marked)}}.\n\n{{content:textarea}}',
          ja: '次の文章の誤字・文法を直し、より自然に整えて。{{表示:select(結果のみ,修正箇所を表示)}} で見せて。\n\n{{内容:textarea}}',
          zh: '修正下面文字的拼写和语法，并润色得更自然。以 {{方式:select(仅结果,标注修改)}} 展示。\n\n{{内容:textarea}}',
        },
        tags: { ko: ['글쓰기', '교정'], en: ['writing', 'editing'], ja: ['ライティング', '校正'], zh: ['写作', '校对'] },
      },
      {
        title: { ko: '제목 / 헤드라인 5개', en: 'Titles / headlines (5)', ja: 'タイトル / 見出し 5案', zh: '标题 / 头条 5个' },
        body: {
          ko: '"{{주제}}"에 대한 {{매체:select(블로그,유튜브,뉴스레터,보고서)}} 제목 5개를 제안해줘. 클릭을 부르되 과장 없이.',
          en: 'Suggest 5 {{medium:select(blog,YouTube,newsletter,report)}} titles for "{{topic}}". Click-worthy but not clickbait.',
          ja: '「{{主題}}」の {{媒体:select(ブログ,YouTube,ニュースレター,レポート)}} 用タイトルを5つ提案して。クリックを誘うが誇張はなしで。',
          zh: '为“{{主题}}”提议 5 个 {{媒介:select(博客,YouTube,新闻邮件,报告)}} 标题。有吸引力但不夸张。',
        },
        tags: { ko: ['글쓰기', '아이디어'], en: ['writing', 'ideas'], ja: ['ライティング', 'アイデア'], zh: ['写作', '创意'] },
      },
    ],
  },
  {
    id: 'marketing',
    prompts: [
      {
        title: { ko: 'SNS 게시물', en: 'Social post', ja: 'SNS投稿', zh: '社媒帖子' },
        body: {
          ko: '{{플랫폼:select(Instagram,X,LinkedIn,Threads,Facebook)}}에 올릴 "{{주제}}" 게시물을 써줘. 후킹 첫 문장 + 본문 + CTA 구성으로, 적절한 길이와 줄바꿈으로.',
          en: 'Write a "{{topic}}" post for {{platform:select(Instagram,X,LinkedIn,Threads,Facebook)}}. Hook line + body + CTA, with good length and line breaks.',
          ja: '{{プラットフォーム:select(Instagram,X,LinkedIn,Threads,Facebook)}} 用に「{{テーマ}}」の投稿を書いて。フック一文 + 本文 + CTA の構成で、適切な長さと改行で。',
          zh: '为 {{平台:select(Instagram,X,LinkedIn,Threads,Facebook)}} 写一篇“{{主题}}”帖子。钩子首句 + 正文 + 行动号召，长度与换行得当。',
        },
        tags: { ko: ['마케팅', 'SNS'], en: ['marketing', 'social'], ja: ['マーケティング', 'SNS'], zh: ['营销', '社媒'] },
      },
      {
        title: { ko: '제품 카피라이팅', en: 'Product copywriting', ja: '商品コピーライティング', zh: '产品文案' },
        body: {
          ko: '{{제품}}의 카피를 써줘. 타깃: {{타깃}}, 핵심 가치: {{가치}}, 톤: {{톤:select(전문적,위트있는,감성적,미니멀)}}. 헤드라인 + 서브카피 + 불릿 3개로.',
          en: 'Write copy for {{product}}. Target: {{target}}, key value: {{value}}, tone: {{tone:select(professional,witty,emotional,minimal)}}. Headline + subcopy + 3 bullets.',
          ja: '{{製品}} のコピーを書いて。ターゲット: {{ターゲット}}、提供価値: {{価値}}、トーン: {{トーン:select(プロフェッショナル,ウィットに富む,感情的,ミニマル)}}。見出し + サブコピー + 箇条書き3つで。',
          zh: '为 {{产品}} 写文案。目标人群: {{目标}}，核心价值: {{价值}}，语气: {{语气:select(专业,机智,感性,极简)}}。主标题 + 副文案 + 3条要点。',
        },
        tags: { ko: ['마케팅', '카피'], en: ['marketing', 'copy'], ja: ['マーケティング', 'コピー'], zh: ['营销', '文案'] },
      },
      {
        title: { ko: '광고 후킹 문구 5개', en: 'Ad hooks (5)', ja: '広告フック5案', zh: '广告钩子 5条' },
        body: {
          ko: '{{제품}}을(를) 위한 짧고 강력한 광고 후킹 문구 5개를 만들어줘. 각기 다른 앵글(혜택/공포/호기심/사회적증거/긴급성)로.',
          en: 'Create 5 short, punchy ad hooks for {{product}}, each from a different angle (benefit/fear/curiosity/social proof/urgency).',
          ja: '{{製品}} 向けの短く強い広告フックを5つ作って。それぞれ違う切り口（メリット/不安/好奇心/社会的証明/緊急性）で。',
          zh: '为 {{产品}} 创作 5 条简短有力的广告钩子，分别从不同角度（利益/恐惧/好奇/社会证明/紧迫感）。',
        },
        tags: { ko: ['마케팅', '광고'], en: ['marketing', 'ads'], ja: ['マーケティング', '広告'], zh: ['营销', '广告'] },
      },
      {
        title: { ko: '해시태그 추천', en: 'Hashtag suggestions', ja: 'ハッシュタグ提案', zh: '话题标签建议' },
        body: {
          ko: '"{{주제}}" {{플랫폼:select(Instagram,X,LinkedIn,YouTube)}} 게시물에 어울리는 해시태그를 대형·중형·니치로 나눠 추천해줘.',
          en: 'Suggest hashtags for a "{{topic}}" {{platform:select(Instagram,X,LinkedIn,YouTube)}} post, grouped into big / medium / niche.',
          ja: '「{{テーマ}}」の {{プラットフォーム:select(Instagram,X,LinkedIn,YouTube)}} 投稿に合うハッシュタグを 大規模・中規模・ニッチ に分けて提案して。',
          zh: '为“{{主题}}”的 {{平台:select(Instagram,X,LinkedIn,YouTube)}} 帖子推荐话题标签，按 大热 / 中等 / 小众 分组。',
        },
        tags: { ko: ['마케팅', 'SNS'], en: ['marketing', 'social'], ja: ['マーケティング', 'SNS'], zh: ['营销', '社媒'] },
      },
    ],
  },
  {
    id: 'work',
    prompts: [
      {
        title: { ko: '회의록 → 액션 아이템', en: 'Meeting notes → action items', ja: '議事録 → アクション', zh: '会议纪要 → 行动项' },
        body: {
          ko: '다음 회의 내용을 정리해줘. (1) 결정 사항 (2) 액션 아이템(담당·기한 추정 포함) (3) 미해결 이슈로 나눠서.\n\n{{회의내용:textarea}}',
          en: 'Organize these meeting notes into (1) decisions (2) action items (with owner/due guesses) (3) open issues.\n\n{{notes:textarea}}',
          ja: '次の会議内容を整理して。(1) 決定事項 (2) アクション項目（担当・期限の推定込み）(3) 未解決の課題 に分けて。\n\n{{会議内容:textarea}}',
          zh: '把下面的会议内容整理为 (1) 决定事项 (2) 行动项（含负责人/截止日期推测）(3) 未决问题。\n\n{{会议内容:textarea}}',
        },
        tags: { ko: ['업무', '회의'], en: ['work', 'meeting'], ja: ['仕事', '会議'], zh: ['工作', '会议'] },
      },
      {
        title: { ko: '장문 문서 요약 + 시사점', en: 'Summarize a long doc + takeaways', ja: '長文要約 + 示唆', zh: '长文摘要 + 启示' },
        body: {
          ko: '다음 문서를 요약해줘. 핵심 3줄 요약 → 중요한 디테일 → 나에게 주는 시사점/리스크 순으로.\n\n{{문서:textarea}}',
          en: 'Summarize this document: 3-line core summary → key details → implications/risks for me.\n\n{{document:textarea}}',
          ja: '次の文書を要約して。3行の要点 → 重要なディテール → 自分への示唆/リスク の順で。\n\n{{文書:textarea}}',
          zh: '总结下面的文档：三行要点 → 关键细节 → 对我的启示/风险。\n\n{{文档:textarea}}',
        },
        tags: { ko: ['업무', '요약'], en: ['work', 'summary'], ja: ['仕事', '要約'], zh: ['工作', '摘要'] },
      },
      {
        title: { ko: '정중한 거절 / 협상 답장', en: 'Polite decline / negotiation reply', ja: '丁寧な辞退 / 交渉返信', zh: '礼貌拒绝 / 协商回复' },
        body: {
          ko: '다음 요청에 대해 관계를 해치지 않으면서 {{입장:select(정중히 거절,일정 조정 제안,조건부 수락)}}하는 답장을 써줘.\n\n받은 메시지: {{메시지:textarea}}',
          en: 'Write a reply to this request that {{stance:select(politely declines,proposes rescheduling,accepts conditionally)}} without harming the relationship.\n\nReceived: {{message:textarea}}',
          ja: '次の依頼に対し、関係を損なわずに {{スタンス:select(丁寧に辞退,日程調整を提案,条件付きで承諾)}} する返信を書いて。\n\n受信: {{メッセージ:textarea}}',
          zh: '针对下面的请求，写一封在不损害关系的前提下 {{立场:select(礼貌拒绝,提议改期,有条件接受)}} 的回复。\n\n收到: {{消息:textarea}}',
        },
        tags: { ko: ['업무', '커뮤니케이션'], en: ['work', 'communication'], ja: ['仕事', 'コミュニケーション'], zh: ['工作', '沟通'] },
      },
      {
        title: { ko: '주간 업무 보고', en: 'Weekly status report', ja: '週次レポート', zh: '周报' },
        body: {
          ko: '다음 메모를 바탕으로 주간 업무 보고를 작성해줘. (이번 주 완료 / 진행 중 / 다음 주 계획 / 이슈) 구조로 간결하게.\n\n{{메모:textarea}}',
          en: 'Write a weekly status report from these notes, structured as (done this week / in progress / next week / issues), concise.\n\n{{notes:textarea}}',
          ja: '次のメモから週次業務レポートを書いて。(今週完了 / 進行中 / 来週の予定 / 課題) の構成で簡潔に。\n\n{{メモ:textarea}}',
          zh: '根据下面的备注写一份周报，结构为（本周完成 / 进行中 / 下周计划 / 问题），简洁。\n\n{{备注:textarea}}',
        },
        tags: { ko: ['업무', '보고'], en: ['work', 'report'], ja: ['仕事', 'レポート'], zh: ['工作', '汇报'] },
      },
    ],
  },
];

/** Build a folder + prompts for a pack, ready to append to storage. */
export function buildPack(pack: StarterPack, folderName: string): { folder: Folder; prompts: Prompt[] } {
  const now = Date.now();
  const folder: Folder = { id: uuid(), name: folderName, parentId: null, createdAt: now, order: 0 };
  const prompts: Prompt[] = pack.prompts.map((p, i) => {
    const body = L(p.body);
    return {
      id: uuid(),
      title: L(p.title),
      body,
      variables: extractVariables(body + '\n' + (p.negativePrompt ?? '')),
      folderId: folder.id,
      tags: LT(p.tags),
      memo: null,
      sourceUrl: null,
      favorite: false,
      presets: [],
      kind: p.kind,
      negativePrompt: p.negativePrompt ?? null,
      negativeStyle: p.negativeStyle ?? 'label',
      params: p.params?.map((x) => ({
        id: uuid(), label: L(x.label), token: x.token, control: x.control,
        value: x.value ?? '', options: x.options, enabled: x.enabled ?? true,
      })),
      createdAt: now - i,
      updatedAt: now - i,
      lastUsedAt: null,
      useCount: 0,
    };
  });
  return { folder, prompts };
}
