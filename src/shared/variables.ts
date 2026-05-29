/**
 * Variable extraction & substitution.
 * Syntax: {{name}} or {{name|default value}}
 * See docs/PRD.md §6.3
 */
import type { Variable } from './types';

// {{ name (with letters/digits/_/-/hangul) | optional default }}
const VAR_RE = /\{\{\s*([a-zA-Z0-9_\-가-힣]+)\s*(?:\|([^}]*))?\}\}/g;

/**
 * Extract unique variables from a prompt body, in order of first appearance.
 * If the same name appears multiple times, the first occurrence's default wins.
 */
export function extractVariables(body: string): Variable[] {
  const seen = new Map<string, Variable>();
  for (const match of body.matchAll(VAR_RE)) {
    const name = match[1];
    if (seen.has(name)) continue;
    const rawDefault = match[2];
    const defaultValue =
      rawDefault !== undefined ? rawDefault.trim() || null : null;
    // Heuristic: treat as multiline if the var sits on its own line / large field
    const multiline = /code|content|text|본문|코드|내용/i.test(name);
    seen.set(name, { name, defaultValue, lastValue: null, multiline });
  }
  return [...seen.values()];
}

/**
 * Merge freshly-extracted variables with existing ones, preserving
 * user-edited fields (lastValue, multiline) where the name still exists.
 */
export function mergeVariables(
  body: string,
  existing: Variable[],
): Variable[] {
  const fresh = extractVariables(body);
  const byName = new Map(existing.map((v) => [v.name, v]));
  return fresh.map((v) => {
    const prev = byName.get(v.name);
    if (!prev) return v;
    return {
      ...v,
      lastValue: prev.lastValue,
      multiline: prev.multiline,
      defaultValue: v.defaultValue ?? prev.defaultValue,
    };
  });
}

/**
 * Substitute variable values into the body.
 * `values` maps variable name -> entered value.
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
