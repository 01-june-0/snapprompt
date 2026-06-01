/**
 * Final-text assembly for a prompt (Round C).
 *
 * One place that turns a stored prompt + variable values into the exact text
 * that gets inserted/copied. For general prompts this is just variable
 * substitution (identical to the old behavior). For image/video prompts it
 * also composes reference images, parameters, and a negative prompt:
 *
 *   [reference urls]  [body(substituted)]  [--params]  [negative]
 *
 * Used by the content picker, the variable modal, and the popup's copy path.
 */
import type { Prompt, PromptKind, NegativeStyle, ImageParam, ReferenceImage } from './types';
import { substitute, mergeVariables } from './variables';

function kindOf(p: Prompt): PromptKind {
  return p.kind ?? 'general';
}

/** Content fields needed to assemble/preview a prompt without a full record. */
export type PromptContent = {
  title?: string;
  body: string;
  kind?: PromptKind;
  negativePrompt?: string | null;
  negativeStyle?: NegativeStyle;
  params?: ImageParam[];
  references?: ReferenceImage[];
};

/** Build a throwaway Prompt from editable content, for assemble/preview. */
export function synthPrompt(c: PromptContent): Prompt {
  return {
    id: '', title: c.title ?? '', body: c.body, variables: [], folderId: null, tags: [],
    memo: null, sourceUrl: null, favorite: false,
    kind: c.kind, negativePrompt: c.negativePrompt, negativeStyle: c.negativeStyle,
    params: c.params, references: c.references,
    createdAt: 0, updatedAt: 0, lastUsedAt: null, useCount: 0,
  };
}

/** image & video prompts get the generation-options pipeline (and always-on modal). */
export function isGenerative(p: Prompt): boolean {
  const k = kindOf(p);
  return k === 'image' || k === 'video';
}

/** Variables are read from the body and the negative prompt combined. */
export function variableSource(p: Prompt): string {
  const neg = p.negativePrompt?.trim();
  return neg ? `${p.body}\n${neg}` : p.body;
}

/** Render one parameter to its token, or '' when it should be omitted. */
export function renderParam(param: ImageParam): string {
  if (!param.enabled) return '';
  const tok = param.token.trim();
  if (!tok) return '';
  if (param.control === 'toggle') {
    return tok.includes('{}') ? tok.replace('{}', '').trim() : tok;
  }
  const val = (param.value ?? '').trim();
  if (!val) return ''; // value-bearing param with no value → skip
  return tok.includes('{}') ? tok.replace('{}', val) : `${tok} ${val}`;
}

/** Space-joined tokens for all enabled, non-empty parameters. */
export function renderParams(params?: ImageParam[]): string {
  if (!params || params.length === 0) return '';
  return params.map(renderParam).filter(Boolean).join(' ');
}

/** Space-joined reference image URLs (prepended to the body). */
export function renderReferences(refs?: ReferenceImage[]): string {
  if (!refs || refs.length === 0) return '';
  return refs.map((r) => r.url.trim()).filter(Boolean).join(' ');
}

/** The negative-prompt chunk, already formatted per style (no leading separator). */
function renderNegative(
  prompt: Prompt,
  values: Record<string, string>,
  vars = mergeVariables(variableSource(prompt), prompt.variables),
): string {
  const raw = prompt.negativePrompt;
  if (!raw || !raw.trim()) return '';
  const resolved = substitute(raw, values, vars).trim();
  if (!resolved) return '';
  return (prompt.negativeStyle ?? 'label') === 'mj'
    ? `--no ${resolved}`
    : `Negative prompt: ${resolved}`;
}

/**
 * Compose the final text to insert/copy.
 * General prompts: plain substitution (byte-identical to the old path).
 */
export function assemblePrompt(prompt: Prompt, values: Record<string, string>): string {
  const vars = mergeVariables(variableSource(prompt), prompt.variables);
  const bodyText = substitute(prompt.body, values, vars);
  if (!isGenerative(prompt)) return bodyText;

  let out = bodyText.trim();
  const refs = renderReferences(prompt.references);
  if (refs) out = out ? `${refs} ${out}` : refs;

  const params = renderParams(prompt.params);
  if (params) out = out ? `${out} ${params}` : params;

  const negative = renderNegative(prompt, values, vars);
  if (negative) {
    const sep = (prompt.negativeStyle ?? 'label') === 'mj' ? ' ' : '\n';
    out = out ? `${out}${sep}${negative}` : negative;
  }
  return out;
}
