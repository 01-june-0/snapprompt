/**
 * Variable extraction & substitution.
 * Syntax (backward compatible):
 *   {{name}}                      → text
 *   {{name|default}}              → text with a default
 *   {{name:textarea}}             → multi-line
 *   {{name:number}} {{n:number|0}}→ number
 *   {{name:date}}                 → date (YYYY-MM-DD)
 *   {{name:color}}                → color picker (#7C3AED default)
 *   {{name:select(a,b,c)}}        → dropdown; {{...|b}} sets the default
 *   {{name:code(python)}}         → multi-line, wrapped in ```python … ``` on insert
 *   {{name:boolean}}              → toggle (also auto-created by {{#if name}})
 *   {{#if name}}…{{/if}}          → block kept only when `name` is truthy
 * Whitespace around `:` and `|` is tolerated.
 * See docs/PRD.md §6.3.
 */
import type { Variable, VariableType } from './types';

// 1=name  2=type  3=type-arg (select options / code lang)  4=default
const VAR_RE =
  /\{\{\s*([a-zA-Z0-9_\-가-힣]+)\s*(?::\s*([a-zA-Z]+)\s*(?:\(([^)]*)\))?)?\s*(?:\|([^}]*))?\s*\}\}/g;

// {{#if name}} … {{/if}}  (non-nested)
const IF_RE =
  /\{\{\s*#if\s+([a-zA-Z0-9_\-가-힣]+)\s*\}\}([\s\S]*?)\{\{\s*\/if\s*\}\}/g;

const MULTILINE_HINT = /code|content|text|본문|코드|내용/i;
const KNOWN_TYPES = ['textarea', 'select', 'date', 'number', 'color', 'code', 'boolean', 'text'];

function parseType(raw: string | undefined, name: string): VariableType {
  const t = (raw ?? '').toLowerCase();
  if (KNOWN_TYPES.includes(t)) return t as VariableType;
  return MULTILINE_HINT.test(name) ? 'textarea' : 'text';
}

function truthy(v: string | undefined): boolean {
  const s = (v ?? '').trim().toLowerCase();
  return s !== '' && s !== 'false' && s !== 'no' && s !== '0' && s !== 'off';
}

/** Extract unique variables (in order of first appearance), including the
 * boolean toggles referenced by {{#if name}} blocks. */
export function extractVariables(body: string): Variable[] {
  const seen = new Map<string, Variable>();
  for (const match of body.matchAll(VAR_RE)) {
    const name = match[1];
    if (seen.has(name)) continue;
    const type = parseType(match[2], name);
    const options = match[3]
      ? match[3].split(',').map((o) => o.trim()).filter(Boolean)
      : [];
    const rawDefault = match[4];
    let defaultValue = rawDefault !== undefined ? rawDefault.trim() || null : null;
    if (type === 'select' && !defaultValue && options.length) defaultValue = options[0];
    if (type === 'color' && !defaultValue) defaultValue = '#7C3AED';
    seen.set(name, {
      name,
      type,
      defaultValue,
      options,
      lastValue: null,
      multiline: type === 'textarea' || type === 'code',
    });
  }
  // boolean toggles from {{#if name}} (only if not already declared)
  for (const m of body.matchAll(IF_RE)) {
    const name = m[1];
    if (!seen.has(name)) {
      seen.set(name, { name, type: 'boolean', defaultValue: null, options: [], lastValue: null, multiline: false });
    }
  }
  return [...seen.values()];
}

/** Merge fresh extraction with existing vars, preserving lastValue. */
export function mergeVariables(body: string, existing: Variable[]): Variable[] {
  const fresh = extractVariables(body);
  const byName = new Map(existing.map((v) => [v.name, v]));
  return fresh.map((v) => {
    const prev = byName.get(v.name);
    return prev ? { ...v, lastValue: prev.lastValue } : v;
  });
}

/** Resolve {{#if name}}…{{/if}} blocks against the given values. */
export function applyConditionals(body: string, values: Record<string, string>): string {
  return body.replace(IF_RE, (_m, name: string, inner: string) => (truthy(values[name]) ? inner : ''));
}

/**
 * Substitute variable values into the body. Conditionals are resolved first,
 * then each {{token}} is replaced. `code` vars are wrapped in a fenced block.
 * Falls back to defaultValue, then leaves the {{token}} intact if neither.
 */
export function substitute(
  body: string,
  values: Record<string, string>,
  variables: Variable[],
): string {
  const meta = new Map(variables.map((v) => [v.name, v]));
  const resolved = applyConditionals(body, values);
  return resolved.replace(VAR_RE, (whole, name: string) => {
    const v = meta.get(name);
    let val = values[name];
    if (val === undefined || val === '') val = v?.defaultValue ?? '';
    if (!val) return whole; // leave {{name}} for the user to fill in the LLM
    if (v?.type === 'code') {
      const lang = v.options[0] ?? '';
      return '```' + lang + '\n' + val + '\n```';
    }
    return val;
  });
}

/** Whether a body contains any variables or conditional blocks. */
export function hasVariables(body: string): boolean {
  VAR_RE.lastIndex = 0;
  IF_RE.lastIndex = 0;
  return VAR_RE.test(body) || IF_RE.test(body);
}
