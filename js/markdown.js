/**
 * Zero-dependency, lightweight, XSS-safe Markdown parser for Teleprompter scripts.
 * Supports headings, bold emphasis, italics, stage direction cues, lists, and pause separators.
 */

/**
 * Escapes unsafe HTML characters to prevent XSS injection.
 * @param {string} str 
 * @returns {string}
 */
export function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Strips markdown syntax tokens for accurate word count and WPM calculation.
 * @param {string} md 
 * @returns {string}
 */
export function stripMarkdown(md) {
  if (!md) return '';
  return md
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // links
    .replace(/^#{1,6}\s+/gm, '') // headings
    .replace(/(\*\*|__)(.*?)\1/g, '$2') // bold
    .replace(/(\*|_)(.*?)\1/g, '$2') // italic
    .replace(/~~(.*?)~~/g, '$1') // strikethrough
    .replace(/`([^`]+)`/g, '$1') // inline code
    .replace(/^\s*[-*+]\s+/gm, '') // bullet lists
    .replace(/^\s*\d+\.\s+/gm, '') // ordered lists
    .replace(/^(\s*[-*_]\s*){3,}$/gm, '') // hr
    .replace(/\[(.*?)\]/g, '') // remove stage direction cues from spoken word count!
    .trim();
}

/**
 * Parses inline formatting: Bold, Italic, Strikethrough, Code, and Stage Cues.
 * @param {string} text 
 * @returns {string}
 */
function parseInline(text) {
  return text
    // Stage directions / Cues in brackets: [Pause 2s] or [Look at camera]
    .replace(/\[([^\]]+)\]/g, '<span class="prompter-cue" title="Stage direction &ndash; do not speak">🎬 $1</span>')
    // Bold: **text** or __text__
    .replace(/\*\*(.+?)\*\*/g, '<strong class="prompter-bold">$1</strong>')
    .replace(/__(.+?)__/g, '<strong class="prompter-bold">$1</strong>')
    // Italic: *text* or _text_
    .replace(/\*([^*]+)\*/g, '<em class="prompter-italic">$1</em>')
    .replace(/_([^_]+)_/g, '<em class="prompter-italic">$1</em>')
    // Strikethrough: ~~text~~
    .replace(/~~(.+?)~~/g, '<del class="prompter-del">$1</del>')
    // Inline code: `text`
    .replace(/`([^`]+)`/g, '<code class="prompter-code">$1</code>');
}

/**
 * Renders a Markdown string into safe, styled HTML markup.
 * @param {string} md 
 * @returns {string}
 */
export function renderMarkdown(md) {
  if (!md) return '';

  const escaped = escapeHtml(md);
  const lines = escaped.split(/\r?\n/);
  const htmlOut = [];
  let inList = false;
  let listType = 'ul';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Horizontal rule / Pause bar (--- or *** or ___)
    if (/^(\s*[-*_]\s*){3,}$/.test(line)) {
      if (inList) { htmlOut.push(`</${listType}>`); inList = false; }
      htmlOut.push('<div class="prompter-pause-bar" title="Pause / Break"><span>⏸ PAUSE / BREAK</span></div>');
      continue;
    }

    // Headings (# H1, ## H2, ### H3, #### H4)
    const headingMatch = line.match(/^(#{1,4})\s+(.+)$/);
    if (headingMatch) {
      if (inList) { htmlOut.push(`</${listType}>`); inList = false; }
      const level = headingMatch[1].length;
      const content = parseInline(headingMatch[2]);
      htmlOut.push(`<h${level} class="prompter-heading prompter-h${level}">${content}</h${level}>`);
      continue;
    }

    // Bullet lists (- item or * item)
    const bulletMatch = line.match(/^[\t ]*[-*+]\s+(.+)$/);
    if (bulletMatch) {
      if (!inList || listType !== 'ul') {
        if (inList) htmlOut.push(`</${listType}>`);
        htmlOut.push('<ul class="prompter-list">');
        inList = true;
        listType = 'ul';
      }
      htmlOut.push(`<li>${parseInline(bulletMatch[1])}</li>`);
      continue;
    }

    // Numbered lists (1. item)
    const numListMatch = line.match(/^[\t ]*(\d+)\.\s+(.+)$/);
    if (numListMatch) {
      if (!inList || listType !== 'ol') {
        if (inList) htmlOut.push(`</${listType}>`);
        htmlOut.push('<ol class="prompter-list">');
        inList = true;
        listType = 'ol';
      }
      htmlOut.push(`<li>${parseInline(numListMatch[2])}</li>`);
      continue;
    }

    // Close list if currently open
    if (inList) {
      htmlOut.push(`</${listType}>`);
      inList = false;
    }

    // Empty line / paragraph break
    if (!line.trim()) {
      htmlOut.push('<div class="prompter-line-break"></div>');
      continue;
    }

    // Regular paragraph line
    htmlOut.push(`<p class="prompter-p">${parseInline(line)}</p>`);
  }

  if (inList) {
    htmlOut.push(`</${listType}>`);
  }

  return htmlOut.join('\n');
}
