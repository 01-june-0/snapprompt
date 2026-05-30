/**
 * Variable extraction & substitution.
 * Syntax (backward compatible):
 *   {{name}}                      → text
 *   {{name|default}}              → text with a default
 *   {{name:textarea}}             → multi-line
 *   {{name:number}} {{n:number|0}}→ number
 *   {{name:date}}                 → date (YYYY-MM-DD)
 *   {{name:select(a,b,c)}}        → dropdown; {{...|b}} sets the default
 * See docs/PRD.md §6.3 + Phase 3.
 */
import type { Variable, VariableType } from './types';

// 1=name  2=type  3=select options  4=default
const VAR_RE =
  /\{\{\s*([a-zA-Z0-9_\-가-힣]+)\s*(?::([a-zA-Z]+)(?:\(([^)]*)\))?)?\s*(?:\|([^}]*))?\s*\}\}/g;

const MULTILINE_HINT = /code|content|text|본문|코드|내용/i;

function parseType(raw: string | undefined, name: string): VariableType {
  const t = (raw ?? '').toLowerCase();
  if (t === 'textarea' || t === 'select' || t === 'date' || t === 'number' || t === 'text') {
    return t as VariableType;
  }
  // no explicit type → heuristic: long-form names become textareas
  return MULTILINE_HINT.test(name) ? 'textarea' : 'text';
}

/**
 * Extract unique variables from a prompt body, in order of first appearance.
 * If the same name appears multiple times, the first occurrence wins.
 */
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
    // a select with no explicit default falls back to its first option
    if (type === 'select' && !defaultValue && options.length) defaultValue = options[0];
    seen.set(name, {
      name,
      type,
      defaultValue,
      options,
      lastValue: null,
      multiline: type === 'textarea',
    });
  }
  return [...seen.values()];
}

/**
 * Merge freshly-extracted variables with existing ones, preserving the
 * user-edited lastValue where the name still exists.
 */
export function mergeVariables(body: string, existing: Variable[]): Variable[] {
  const fresh = extractVariables(body);
  const byName = new Map(existing.map((v) => [v.name, v]));
  return fresh.map((v) => {
    const prev = byName.get(v.name);
    return prev ? { ...v, lastValue: prev.lastValue } : v;
  });
}

/**
 * Substitute variable values into the body.
 * Falls back to defaultValue, then leaves the {{token}} intact if neither.
 */
export function substitute(
  body: string,
  values: Record<string, string>,
  variables: Variable[],
): string {
  const defaults = new Map(variables.map((v) => [v.name, v.defaultValue]));
  return body.replace(VAR_RE, (whole, name: string) => {
    const entered = values[name];
    if (entered !== undefined && entered !== '') return entered;
    const def = defaults.get(name);
    if (def) return def;
    return whole; // leave {{name}} as-is for the user to fill in the LLM
  });
}

/** Whether a body contains any variables. */
export function hasVariables(body: string): boolean {
  VAR_RE.lastIndex = 0;
  return VAR_RE.test(body);
}
