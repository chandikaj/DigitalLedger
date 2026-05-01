function escapeHTML(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function parseTableRow(line: string): string[] {
  const parts = line.split('|').map(cell => cell.trim());
  if (parts[0] === '') parts.shift();
  if (parts[parts.length - 1] === '') parts.pop();
  return parts;
}

function buildTableHTML(rows: string[][]): string {
  if (rows.length === 0) return '';
  const [headerRow, ...bodyRows] = rows;
  const headerCells = headerRow.map(cell => `<th>${escapeHTML(cell)}</th>`).join('');
  const bodyRowsHTML = bodyRows
    .map(row => {
      const cells = row
        .map((cell, i) =>
          i === 0
            ? `<td><strong>${escapeHTML(cell)}</strong></td>`
            : `<td>${escapeHTML(cell)}</td>`
        )
        .join('');
      return `<tr>${cells}</tr>`;
    })
    .join('');
  return `<table><thead><tr>${headerCells}</tr></thead><tbody>${bodyRowsHTML}</tbody></table>`;
}

export function hasPipeTableContent(text: string): boolean {
  const lines = text.trim().split('\n').filter(l => l.trim().length > 0);
  if (lines.length < 2) return false;
  let consecutive = 0;
  for (const line of lines) {
    if (line.includes('|')) {
      consecutive++;
      if (consecutive >= 2) return true;
    } else {
      consecutive = 0;
    }
  }
  return false;
}

export function buildMixedHTML(text: string): string {
  const lines = text.split('\n');
  let html = '';
  let tableLines: string[] = [];

  const flushTable = () => {
    if (tableLines.length >= 2) {
      const rows = tableLines.map(parseTableRow);
      html += buildTableHTML(rows);
    } else if (tableLines.length === 1) {
      html += `<p>${escapeHTML(tableLines[0])}</p>`;
    }
    tableLines = [];
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed === '') {
      flushTable();
      continue;
    }
    if (trimmed.includes('|')) {
      tableLines.push(trimmed);
    } else {
      flushTable();
      html += `<p>${escapeHTML(trimmed)}</p>`;
    }
  }
  flushTable();

  return html;
}

export function convertPipeTablesToHTML(content: string): string {
  if (!hasPipeTableContent(content)) return content;
  return buildMixedHTML(content);
}

const URL_REGEX = /(?:https?:\/\/|www\.)[^\s<>"'`]+/gi;
const TRAILING_PUNCT = /[.,;:!?)\]>}'"]+$/;

export function linkifyHTML(html: string): string {
  if (!html || typeof window === 'undefined' || typeof DOMParser === 'undefined') {
    return html;
  }

  try {
    const doc = new DOMParser().parseFromString(
      `<div id="__linkify_root__">${html}</div>`,
      'text/html'
    );
    const root = doc.getElementById('__linkify_root__');
    if (!root) return html;

    const walker = doc.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const textNodes: Text[] = [];
    let current: Node | null = walker.nextNode();
    while (current) {
      let parent: HTMLElement | null = (current as Text).parentElement;
      let skip = false;
      while (parent && parent !== root) {
        const tag = parent.tagName;
        if (tag === 'A' || tag === 'CODE' || tag === 'PRE' || tag === 'SCRIPT' || tag === 'STYLE') {
          skip = true;
          break;
        }
        parent = parent.parentElement;
      }
      const value = current.nodeValue || '';
      URL_REGEX.lastIndex = 0;
      if (!skip && URL_REGEX.test(value)) {
        textNodes.push(current as Text);
      }
      current = walker.nextNode();
    }

    for (const node of textNodes) {
      const text = node.nodeValue || '';
      const fragment = doc.createDocumentFragment();
      let lastIndex = 0;
      let match: RegExpExecArray | null;
      URL_REGEX.lastIndex = 0;

      while ((match = URL_REGEX.exec(text)) !== null) {
        const start = match.index;
        let raw = match[0];

        let trailing = '';
        const trailMatch = raw.match(TRAILING_PUNCT);
        if (trailMatch) {
          trailing = trailMatch[0];
          raw = raw.slice(0, raw.length - trailing.length);
        }

        if (raw.length === 0) {
          if (start > lastIndex) {
            fragment.appendChild(doc.createTextNode(text.slice(lastIndex, start)));
          }
          fragment.appendChild(doc.createTextNode(match[0]));
          lastIndex = start + match[0].length;
          continue;
        }

        if (start > lastIndex) {
          fragment.appendChild(doc.createTextNode(text.slice(lastIndex, start)));
        }

        const href = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
        const anchor = doc.createElement('a');
        anchor.setAttribute('href', href);
        anchor.setAttribute('target', '_blank');
        anchor.setAttribute('rel', 'noopener noreferrer');
        anchor.textContent = raw;
        fragment.appendChild(anchor);

        if (trailing) {
          fragment.appendChild(doc.createTextNode(trailing));
        }

        lastIndex = start + match[0].length;
      }

      if (lastIndex < text.length) {
        fragment.appendChild(doc.createTextNode(text.slice(lastIndex)));
      }

      node.parentNode?.replaceChild(fragment, node);
    }

    return root.innerHTML;
  } catch {
    return html;
  }
}
