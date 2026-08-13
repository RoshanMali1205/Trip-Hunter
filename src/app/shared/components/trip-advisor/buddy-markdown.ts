/**
 * Lightweight Markdown → safe HTML for Buddy chat bubbles.
 * Escapes HTML first, then applies a focused subset of Markdown.
 */
export function formatBuddyMarkdown(raw: string): string {
  if (!raw) return '';

  const escaped = escapeHtml(raw.replace(/\r\n/g, '\n').trim());
  const lines = escaped.split('\n');
  const html: string[] = [];
  let inUl = false;
  let inOl = false;
  let paragraph: string[] = [];

  const closeLists = () => {
    if (inUl) {
      html.push('</ul>');
      inUl = false;
    }
    if (inOl) {
      html.push('</ol>');
      inOl = false;
    }
  };

  const flushParagraph = () => {
    if (!paragraph.length) return;
    const text = paragraph.join(' ').trim();
    if (text) html.push(`<p>${inline(text)}</p>`);
    paragraph = [];
  };

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed) {
      flushParagraph();
      closeLists();
      continue;
    }

    if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
      flushParagraph();
      closeLists();
      html.push('<hr />');
      continue;
    }

    const heading = /^(#{1,3})\s+(.+)$/.exec(trimmed);
    if (heading) {
      flushParagraph();
      closeLists();
      const level = heading[1].length;
      html.push(`<h${level}>${inline(heading[2])}</h${level}>`);
      continue;
    }

    const ul = /^[-*•]\s+(.+)$/.exec(trimmed);
    if (ul) {
      flushParagraph();
      if (inOl) {
        html.push('</ol>');
        inOl = false;
      }
      if (!inUl) {
        html.push('<ul>');
        inUl = true;
      }
      html.push(`<li>${inline(ul[1])}</li>`);
      continue;
    }

    const ol = /^(\d+)[.)]\s+(.+)$/.exec(trimmed);
    if (ol) {
      flushParagraph();
      if (inUl) {
        html.push('</ul>');
        inUl = false;
      }
      if (!inOl) {
        html.push('<ol>');
        inOl = true;
      }
      html.push(`<li>${inline(ol[2])}</li>`);
      continue;
    }

    closeLists();
    paragraph.push(trimmed);
  }

  flushParagraph();
  closeLists();
  return html.join('');
}

function escapeHtml(text: string): string {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function inline(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/__(.+?)__/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*(?!\s)(.+?)(?!\s)\*(?!\*)/g, '$1<em>$2</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>');
}
