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

function isSeparatorLine(line: string): boolean {
  const t = line.trim();
  if (!t.includes('-') || !t.includes('|')) return false;
  return /^[\s\-:|]+$/.test(t);
}

export function hasPipeTableContent(text: string): boolean {
  const lines = text.split('\n');
  for (let i = 1; i < lines.length; i++) {
    if (
      isSeparatorLine(lines[i]) &&
      lines[i - 1].includes('|') &&
      !isSeparatorLine(lines[i - 1])
    ) {
      return true;
    }
  }
  return false;
}

export function buildMixedHTML(text: string): string {
  const lines = text.split('\n');
  let html = '';
  let i = 0;

  while (i < lines.length) {
    const trimmed = lines[i].trim();
    const nextTrimmed = i + 1 < lines.length ? lines[i + 1].trim() : '';

    // Detect start of a real markdown pipe table: header row + separator row
    if (
      trimmed.includes('|') &&
      !isSeparatorLine(trimmed) &&
      nextTrimmed &&
      isSeparatorLine(nextTrimmed)
    ) {
      const headerRow = parseTableRow(trimmed);
      const bodyRows: string[][] = [];
      let j = i + 2;
      while (j < lines.length) {
        const l = lines[j].trim();
        if (l === '' || !l.includes('|')) break;
        if (isSeparatorLine(l)) {
          j++;
          continue;
        }
        bodyRows.push(parseTableRow(l));
        j++;
      }
      html += buildTableHTML([headerRow, ...bodyRows]);
      i = j;
      continue;
    }

    if (trimmed === '') {
      i++;
      continue;
    }

    html += `<p>${escapeHTML(trimmed)}</p>`;
    i++;
  }

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
