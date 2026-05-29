/** Built-in sample prompts offered during onboarding. */
import type { Prompt } from './types';
import { extractVariables } from './variables';
import { uuid } from './id';

const RAW = [
  {
    title: '코드 리뷰 (한국어)',
    body: '{{언어|한국어}}로 다음 코드를 리뷰해줘. 보안, 성능, 가독성 관점에서 개선점을 찾아 우선순위(P0/P1/P2)와 함께 알려줘. 코드:\n{{code}}',
    tags: ['코딩', '리뷰'],
  },
  {
    title: '영어 이메일 답장',
    body: 'Write a professional reply in English to the email below. Keep the tone friendly but concise. Use simple sentences and avoid jargon.',
    tags: ['이메일', '영어'],
  },
  {
    title: '3줄 요약',
    body: '다음 내용을 핵심만 3줄로 요약해줘. 각 줄은 한 문장으로 끝나야 해. 내용:\n{{text}}',
    tags: ['요약', '학습'],
  },
];

export function buildSamplePrompts(): Prompt[] {
  const now = Date.now();
  return RAW.map((r, i) => ({
    id: uuid(),
    title: r.title,
    body: r.body,
    variables: extractVariables(r.body),
    folderId: null,
    tags: r.tags,
    memo: null,
    sourceUrl: null,
    favorite: false,
    createdAt: now - i,
    updatedAt: now - i,
    lastUsedAt: null,
    useCount: 0,
  }));
}
