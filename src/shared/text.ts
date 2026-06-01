/** Small text helpers shared across popup, content, and options. */

/** Collapse whitespace and cap to `max` chars — used for one-line previews. */
export function firstLine(s: string, max = 80): string {
  return s.replace(/\s+/g, ' ').trim().slice(0, max);
}
