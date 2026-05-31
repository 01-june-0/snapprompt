/**
 * Domain starter packs. Each pack becomes a folder + a set of prompts,
 * showcasing the variable features (select, color, code fence, {{#if}}).
 */
import type { Prompt, Folder } from './types';
import { extractVariables } from './variables';
import { uuid } from './id';

export interface StarterPack {
  id: 'image' | 'coding' | 'writing';
  prompts: { title: string; body: string; tags: string[] }[];
}

export const STARTER_PACKS: StarterPack[] = [
  {
    id: 'image',
    prompts: [
      {
        title: '이미지 생성 (스타일 변주)',
        body: '{{주제}}를 {{스타일:select(수채화,유화,3D 렌더,픽셀아트,사진)}} 스타일로 그려줘. 분위기: {{분위기}}. 메인 색: {{색상:color}}.{{#if 와이드}} 가로 와이드 구도.{{/if}}',
        tags: ['이미지'],
      },
      {
        title: 'Midjourney 프롬프트 변환',
        body: '다음 컨셉을 Midjourney용 영문 프롬프트로 바꿔줘. 컨셉: {{컨셉}}\n파라미터: --ar {{비율:select(1:1,16:9,9:16)}} --stylize {{강도:number|250}}',
        tags: ['이미지', 'MJ'],
      },
      {
        title: '네거티브 프롬프트 추천',
        body: '다음 이미지 프롬프트에 어울리는 네거티브 프롬프트(피해야 할 요소)를 추천해줘:\n{{프롬프트}}',
        tags: ['이미지'],
      },
    ],
  },
  {
    id: 'coding',
    prompts: [
      {
        title: '코드 리뷰',
        body: '{{언어:select(JavaScript,TypeScript,Python,Go,Rust)}}로 작성된 다음 코드를 리뷰해줘. 보안·성능·가독성 관점에서 우선순위(P0/P1/P2)와 함께 알려줘.\n{{코드:code}}',
        tags: ['코딩', '리뷰'],
      },
      {
        title: '단위 테스트 작성',
        body: '{{프레임워크}} 형식으로 다음 함수의 단위 테스트를 작성해줘.{{#if 엣지케이스}} 엣지 케이스도 포함해줘.{{/if}}\n{{코드:code}}',
        tags: ['코딩', '테스트'],
      },
      {
        title: '에러 디버깅',
        body: '다음 에러의 원인과 해결책을 단계별로 알려줘.\n에러:\n{{에러:code}}',
        tags: ['코딩', '디버깅'],
      },
    ],
  },
  {
    id: 'writing',
    prompts: [
      {
        title: '글 톤 변환',
        body: '다음 글을 {{톤:select(격식,친근,전문적,캐주얼)}} 톤으로, {{길이:select(짧게,보통,길게)}} 다시 써줘.\n{{내용}}',
        tags: ['글쓰기'],
      },
      {
        title: '이메일 작성',
        body: '{{대상}}에게 보내는 {{목적}} 이메일을 {{톤:select(격식,친근)}} 톤으로 작성해줘.',
        tags: ['글쓰기', '이메일'],
      },
      {
        title: '핵심 요약',
        body: '다음 내용을 핵심만 {{개수:number|3}}줄로 요약해줘. 각 줄은 한 문장으로.\n{{내용}}',
        tags: ['글쓰기', '요약'],
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
    variables: extractVariables(p.body),
    folderId: folder.id,
    tags: p.tags,
    memo: null,
    sourceUrl: null,
    favorite: false,
    presets: [],
    createdAt: now - i,
    updatedAt: now - i,
    lastUsedAt: null,
    useCount: 0,
  }));
  return { folder, prompts };
}
