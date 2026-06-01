/**
 * Domain starter packs. Each pack becomes a folder + a set of prompts,
 * showcasing the variable features (select/number/color/code/{{#if}}) and the
 * image/video generation options (kind, parameters, negative prompt).
 */
import type { Prompt, Folder, PromptKind, ImageParam, NegativeStyle } from './types';
import { extractVariables } from './variables';
import { uuid } from './id';

type PackParam = Omit<ImageParam, 'id'>;
interface PackPrompt {
  title: string;
  body: string;
  tags: string[];
  kind?: PromptKind;
  params?: PackParam[];
  negativePrompt?: string;
  negativeStyle?: NegativeStyle;
}

export interface StarterPack {
  id: 'image' | 'video' | 'coding' | 'writing' | 'marketing' | 'work';
  prompts: PackPrompt[];
}

// shared parameter presets (no id; ids are assigned per built prompt)
const AR = (value: string, options: string[]): PackParam =>
  ({ label: '화면비', token: '--ar {}', control: 'select', value, options, enabled: true });
const MJ_V: PackParam = { label: '버전', token: '--v {}', control: 'select', value: '6.1', options: ['6.1', '6'], enabled: true };
const PIKA_AR = (value: string): PackParam =>
  ({ label: '화면비', token: '-ar {}', control: 'select', value, options: ['16:9', '9:16', '1:1', '4:5'], enabled: true });
const PIKA_CAM = (value: string): PackParam =>
  ({ label: '카메라', token: '-camera {}', control: 'select', value, options: ['zoom in', 'zoom out', 'pan left', 'pan right', 'pan up', 'pan down', 'rotate cw', 'rotate ccw'], enabled: true });

export const STARTER_PACKS: StarterPack[] = [
  {
    id: 'image',
    prompts: [
      {
        title: '사진풍 인물',
        body: 'A {{샷:select(close-up portrait,half body,full body)}} photo of {{대상}}, {{조명:select(soft natural light,golden hour,studio lighting,cinematic)}}, shot on 85mm, shallow depth of field.',
        tags: ['이미지', '인물'], kind: 'image',
        negativePrompt: 'deformed hands, extra fingers, blurry, plastic skin, text, watermark',
        params: [AR('4:5', ['1:1', '4:5', '3:4', '16:9']), MJ_V],
      },
      {
        title: '제품 목업 / 광고컷',
        body: 'Product shot of {{제품}} on a {{배경:select(clean white,marble,wooden table,gradient studio)}} background, professional commercial photography, high detail, soft shadows.',
        tags: ['이미지', '제품'], kind: 'image',
        negativePrompt: 'low quality, distorted logo, text, watermark',
        params: [AR('1:1', ['1:1', '4:5', '16:9'])],
      },
      {
        title: '컨셉 아트 / 일러스트',
        body: '{{주제}} concept art, {{스타일:select(digital painting,studio ghibli,cyberpunk,watercolor,low poly)}} style, {{분위기}} atmosphere, dramatic lighting, highly detailed.',
        tags: ['이미지', '아트'], kind: 'image',
        params: [AR('16:9', ['16:9', '21:9', '1:1']), { label: '스타일화', token: '--stylize {}', control: 'number', value: '300', enabled: true }],
      },
      {
        title: 'Midjourney 프롬프트 변환',
        body: '다음 한글 컨셉을 Midjourney용 영문 프롬프트로 바꿔줘. 구체적인 피사체·스타일·조명·구도 키워드를 풍부하게 포함하되 한 문단으로.\n\n컨셉: {{컨셉}}',
        tags: ['이미지', 'MJ'],
      },
    ],
  },
  {
    id: 'video',
    prompts: [
      {
        title: '시네마틱 B-roll',
        body: 'Cinematic b-roll of {{장면}}, {{시간대:select(golden hour,blue hour,night,overcast)}}, slow camera movement, shallow depth of field, film grain.',
        tags: ['영상', 'b-roll'], kind: 'video',
        params: [PIKA_AR('16:9'), PIKA_CAM('pan right'), { label: 'FPS', token: '-fps {}', control: 'number', value: '24', enabled: true }],
      },
      {
        title: '제품 회전 쇼케이스',
        body: '{{제품}} rotating slowly on a turntable, studio lighting, seamless background, product showcase.',
        tags: ['영상', '제품'], kind: 'video',
        params: [PIKA_AR('1:1'), PIKA_CAM('rotate cw')],
      },
      {
        title: '풍경 타임랩스',
        body: 'Timelapse of {{풍경}}, moving clouds, changing light, wide establishing shot.',
        tags: ['영상', '풍경'], kind: 'video',
        params: [PIKA_AR('16:9'), { label: '모션 강도', token: '-motion {}', control: 'select', value: '3', options: ['0', '1', '2', '3', '4'], enabled: true }],
      },
      {
        title: '영상 스토리보드 짜기',
        body: '"{{컨셉}}" 아이디어로 {{길이:number|15}}초짜리 영상을 만들려고 해. 샷 단위로 스토리보드를 표로 정리해줘 (샷 번호 / 화면 설명 / 카메라 움직임 / 길이).',
        tags: ['영상', '기획'],
      },
    ],
  },
  {
    id: 'coding',
    prompts: [
      {
        title: '코드 리뷰',
        body: '{{언어:select(TypeScript,JavaScript,Python,Go,Rust,Java,C++)}} 코드를 리뷰해줘. 버그 → 보안 → 성능 → 가독성 순으로, 우선순위(P0/P1/P2)와 수정 예시를 붙여줘.\n\n{{코드:code}}',
        tags: ['코딩', '리뷰'],
      },
      {
        title: '단위 테스트 작성',
        body: '{{프레임워크:select(Jest,Vitest,Pytest,Go test,JUnit)}}로 다음 함수의 단위 테스트를 작성해줘.{{#if 엣지케이스}} 경계값·예외 등 엣지 케이스도 포함해줘.{{/if}}\n\n{{코드:code}}',
        tags: ['코딩', '테스트'],
      },
      {
        title: '에러 / 스택트레이스 분석',
        body: '다음 에러의 원인을 추정하고, 가장 가능성 높은 순서로 해결 방법을 단계별로 알려줘.\n\n{{에러:code}}',
        tags: ['코딩', '디버깅'],
      },
      {
        title: '리팩터링 제안',
        body: '다음 코드를 {{목표:select(가독성,성능,테스트 용이성,타입 안정성)}} 관점에서 리팩터링해줘. 변경 이유를 주석이 아닌 설명으로 정리하고, 동작은 유지해줘.\n\n{{코드:code}}',
        tags: ['코딩', '리팩터링'],
      },
      {
        title: 'SQL / 정규식 생성',
        body: '다음 요구사항을 만족하는 {{종류:select(SQL 쿼리,정규식,셸 명령)}}을 만들어줘. 동작 설명과 주의점도 함께.\n\n요구사항: {{요구사항}}',
        tags: ['코딩'],
      },
    ],
  },
  {
    id: 'writing',
    prompts: [
      {
        title: '톤 변환',
        body: '다음 글을 {{톤:select(격식,친근,전문적,캐주얼,설득적)}} 톤으로, {{길이:select(더 짧게,비슷하게,더 길게)}} 다시 써줘. 의미는 유지해줘.\n\n{{내용:textarea}}',
        tags: ['글쓰기'],
      },
      {
        title: '이메일 작성',
        body: '{{대상}}에게 보내는 "{{목적}}" 이메일을 {{톤:select(격식,친근,정중한 거절,협상)}} 톤으로 작성해줘. 제목 후보 2개와 본문을 제시해줘.',
        tags: ['글쓰기', '이메일'],
      },
      {
        title: '교정 & 윤문',
        body: '다음 글의 맞춤법·문법을 교정하고 더 자연스럽게 다듬어줘. {{설명:select(결과만,수정 내역 표시)}}로 보여줘.\n\n{{내용:textarea}}',
        tags: ['글쓰기', '교정'],
      },
      {
        title: '제목 / 헤드라인 5개',
        body: '"{{주제}}"에 대한 {{매체:select(블로그,유튜브,뉴스레터,보고서)}} 제목 5개를 제안해줘. 클릭을 부르되 과장 없이.',
        tags: ['글쓰기', '아이디어'],
      },
    ],
  },
  {
    id: 'marketing',
    prompts: [
      {
        title: 'SNS 게시물',
        body: '{{플랫폼:select(Instagram,X,LinkedIn,Threads,Facebook)}}에 올릴 "{{주제}}" 게시물을 써줘. 후킹 첫 문장 + 본문 + CTA 구성으로, 적절한 길이와 줄바꿈으로.',
        tags: ['마케팅', 'SNS'],
      },
      {
        title: '제품 카피라이팅',
        body: '{{제품}}의 카피를 써줘. 타깃: {{타깃}}, 핵심 가치: {{가치}}, 톤: {{톤:select(전문적,위트있는,감성적,미니멀)}}. 헤드라인 + 서브카피 + 불릿 3개로.',
        tags: ['마케팅', '카피'],
      },
      {
        title: '광고 후킹 문구 5개',
        body: '{{제품}}을(를) 위한 짧고 강력한 광고 후킹 문구 5개를 만들어줘. 각기 다른 앵글(혜택/공포/호기심/사회적증거/긴급성)로.',
        tags: ['마케팅', '광고'],
      },
      {
        title: '해시태그 추천',
        body: '"{{주제}}" {{플랫폼:select(Instagram,X,LinkedIn,YouTube)}} 게시물에 어울리는 해시태그를 대형·중형·니치로 나눠 추천해줘.',
        tags: ['마케팅', 'SNS'],
      },
    ],
  },
  {
    id: 'work',
    prompts: [
      {
        title: '회의록 → 액션 아이템',
        body: '다음 회의 내용을 정리해줘. (1) 결정 사항 (2) 액션 아이템(담당·기한 추정 포함) (3) 미해결 이슈로 나눠서.\n\n{{회의내용:textarea}}',
        tags: ['업무', '회의'],
      },
      {
        title: '장문 문서 요약 + 시사점',
        body: '다음 문서를 요약해줘. 핵심 3줄 요약 → 중요한 디테일 → 나에게 주는 시사점/리스크 순으로.\n\n{{문서:textarea}}',
        tags: ['업무', '요약'],
      },
      {
        title: '정중한 거절 / 협상 답장',
        body: '다음 요청에 대해 관계를 해치지 않으면서 {{입장:select(정중히 거절,일정 조정 제안,조건부 수락)}}하는 답장을 써줘.\n\n받은 메시지: {{메시지:textarea}}',
        tags: ['업무', '커뮤니케이션'],
      },
      {
        title: '주간 업무 보고',
        body: '다음 메모를 바탕으로 주간 업무 보고를 작성해줘. (이번 주 완료 / 진행 중 / 다음 주 계획 / 이슈) 구조로 간결하게.\n\n{{메모:textarea}}',
        tags: ['업무', '보고'],
      },
    ],
  },
];

/** Build a folder + prompts for a pack, ready to append to storage. */
export function buildPack(pack: StarterPack, folderName: string): { folder: Folder; prompts: Prompt[] } {
  const now = Date.now();
  const folder: Folder = { id: uuid(), name: folderName, parentId: null, createdAt: now, order: 0 };
  const prompts: Prompt[] = pack.prompts.map((p, i) => ({
    id: uuid(),
    title: p.title,
    body: p.body,
    variables: extractVariables(p.body + '\n' + (p.negativePrompt ?? '')),
    folderId: folder.id,
    tags: p.tags,
    memo: null,
    sourceUrl: null,
    favorite: false,
    presets: [],
    kind: p.kind,
    negativePrompt: p.negativePrompt ?? null,
    negativeStyle: p.negativeStyle ?? 'label',
    params: p.params?.map((x) => ({ ...x, id: uuid() })),
    createdAt: now - i,
    updatedAt: now - i,
    lastUsedAt: null,
    useCount: 0,
  }));
  return { folder, prompts };
}
