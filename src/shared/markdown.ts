/**
 * Minimal, dependency-free Markdown → HTML renderer.
 * Escapes HTML first, then applies a safe subset (headings, bold, italic,
 * inline code, fenced code, links, lists, blockquote, hr, paragraphs).
 * Output is only ever our own tags around escaped text — safe to inject.
 */

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function inline(s: string): string {
  // links [text](url) — url restricted to http(s)/mailto
  s = s.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+|mailto:[^\s)]+)\)/g,
    (_m, text, url) => `<a href="${url}" target="_blank" rel="noopener noreferrer">${text}</a>`);
  // inline code `x`
  s = s.replace(/`([^`]+)`/g, (_m, c) => `<code>${c}</code>`);
  // bold **x**
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  // italic *x* (avoid touching ** already consumed)
  s = s.replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>');
  return s;
}

export function renderMarkdown(src: string): string {
  const escaped = escapeHtml(src.replace(/\r\n/g, '\n'));
  const lines = escaped.split('\n');
  const out: string[] = [];
  let i = 0;
  let inList = false;
  let para: string[] = [];

  const flushPara = () => {
    if (para.length) {
      out.push(`<p>${inline(para.join(' '))}</p>`);
      para = [];
    }
  };
  const closeList = () => {
    if (inList) { out.push('</ul>'); inList = false; }
  };

  while (i < lines.length) {
    const line = lines[i];

    // fenced code block ```
    if (/^```/.test(line)) {
      flushPara(); closeList();
      const buf: string[] = [];
      i++;
      while (i < lines.length && !/^```/.test(lines[i])) { buf.push(lines[i]); i++; }
      i++; // skip closing fence
      out.push(`<pre><code>${buf.join('\n')}</code></pre>`);
      continue;
    }
    // heading
    const h = /^(#{1,4})\s+(.*)$/.exec(line);
    if (h) {
      flushPara(); closeList();
      const lvl = h[1].length;
      out.push(`<h${lvl}>${inline(h[2])}</h${lvl}>`);
      i++; continue;
    }
    // hr
    if (/^(-{3,}|\*{3,})\s*$/.test(line)) {
      flushPara(); closeList();
      out.push('<hr>');
      i++; continue;
    }
    // blockquote
    if (/^>\s?/.test(line)) {
      flushPara(); closeList();
      out.push(`<blockquote>${inline(line.replace(/^>\s?/, ''))}</blockquote>`);
      i++; continue;
    }
    // list item
    if (/^\s*[-*]\s+/.test(line)) {
      flushPara();
      if (!inList) { out.push('<ul>'); inList = true; }
      out.push(`<li>${inline(line.replace(/^\s*[-*]\s+/, ''))}</li>`);
      i++; continue;
    }
    // blank line → paragraph break
    if (/^\s*$/.test(line)) {
      flushPara(); closeList();
      i++; continue;
    }
    // normal text → accumulate paragraph
    closeList();
    para.push(line);
    i++;
  }
  flushPara(); closeList();
  return out.join('\n');
}
