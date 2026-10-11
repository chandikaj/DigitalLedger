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
  return `<table class="article-table"><thead><tr>${headerCells}</tr></thead><tbody>${bodyRowsHTML}</tbody></table>`;
}

function isSeparatorLine(line: string): boolean {
  const t = line.trim();
  if (!t.includes('-') || !t.includes('|')) return false;
  return /^[\s\-:|]+$/.test(t);
}

export function hasPipeTableContent(text: string): boolean {
  const lines = normalizeTableLines(text).split('\n');
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
  const lines = normalizeTableLines(text).split('\n');
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

// Rich-text pastes sometimes collapse the newline between "| ... |" rows.
function normalizeTableLines(text: string): string {
  return text.replace(/\r\n?/g, '\n').split('\n').map(line => {
    // Require a full collapsed header/separator boundary, not an empty cell
    // in an otherwise ordinary multiline table.
    if (!/\|[ \t]*\|[ \t]*:?-{3,}:?[ \t]*\|/.test(line)) return line;
    return line.replace(/\|[ \t]*\|/g, '|\n|');
  }).join('\n');
}

export function convertPipeTablesToHTML(content: string): string {
  if (!/<[a-z][\s\S]*>/i.test(content)) {
    return hasPipeTableContent(content) ? buildMixedHTML(content) : content;
  }
  if (typeof DOMParser === 'undefined') return content;
  const doc = new DOMParser().parseFromString(content, 'text/html');
  // Only replace table-containing paragraphs, never escape the entire article
  // or reinterpret existing tables/code as Markdown.
  for (const paragraph of Array.from(doc.body.querySelectorAll('p'))) {
    if (paragraph.closest('table, pre, code')) continue;
    const text = paragraph.innerHTML
      .replace(/<br\s*\/?>/gi, '\n');
    const holder = doc.createElement('div');
    holder.innerHTML = text.replace(/\n/g, '\u0001');
    const plain = (holder.textContent || '').replace(/\u0001/g, '\n');
    if (!hasPipeTableContent(plain)) continue;
    const replacement = doc.createElement('div');
    replacement.innerHTML = buildMixedHTML(plain);
    paragraph.replaceWith(...Array.from(replacement.childNodes));
  }
  return doc.body.innerHTML;
}

type VisualRow = { label: string; value: string; numericValue: number };
type VisualMatch = { html: string; start?: number; end: number };

const BAR_TOKEN = /([^:[\]]+?)\s*:\s*([$€£]?\s*\d[\d,.]*\s*(?:billion|million|thousand|%|x)?(?:\s*(?:USD|EUR|GBP))?)\s*\[([^\]]*)\]/gi;
const BAR_CHARACTERS = /^[\s█▉▊▋▌▍▎▏▓▒░■□#=|.·•_-]*$/;
const ASCII_DIVIDER = /^[+\-|=\s]{4,}$/;

function parseBarLine(line: string): VisualRow[] | null {
  const rows: VisualRow[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  BAR_TOKEN.lastIndex = 0;
  while ((match = BAR_TOKEN.exec(line)) !== null) {
    if (line.slice(lastIndex, match.index).trim() || !BAR_CHARACTERS.test(match[3])) return null;
    const numericValue = Number(match[2].replace(/[^\d.]/g, ''));
    if (!Number.isFinite(numericValue)) return null;
    rows.push({
      label: match[1].trim(),
      value: match[2].trim(),
      numericValue,
    });
    lastIndex = BAR_TOKEN.lastIndex;
  }
  if (!rows.length || line.slice(lastIndex).trim()) return null;
  return rows;
}

function escapeVisualText(value: string): string {
  return escapeHTML(value);
}

function buildBarVisual(rows: VisualRow[], title: string | null): string {
  const max = Math.max(...rows.map(row => row.numericValue), 1);
  const bars = rows.map(row => {
    const width = Math.max(2, (row.numericValue / max) * 100);
    return `<div class="article-bar-row"><div class="article-bar-label">${escapeVisualText(row.label)}</div><div class="article-bar-value">${escapeVisualText(row.value)}</div><div class="article-bar-track" aria-hidden="true"><span style="width:${width.toFixed(2)}%"></span></div></div>`;
  }).join('');
  const heading = title ? `<figcaption>${escapeVisualText(title)}</figcaption>` : '';
  return `<figure class="article-visual article-bar-visual">${heading}<div class="article-bar-list">${bars}</div></figure>`;
}

function splitDiagramCells(line: string): string[] | null {
  const cells = line.split('|').map(cell => cell.trim());
  return cells.length === 2 && cells.every(Boolean) ? cells : null;
}

function buildFinOpsVisual(lines: string[], start: number): VisualMatch | null {
  if (!/finops\s+architectures/i.test(lines[start])) return null;
  let headerIndex = start + 1;
  while (headerIndex < lines.length && (!lines[headerIndex].trim() || ASCII_DIVIDER.test(lines[headerIndex].trim()))) headerIndex++;
  const headings = lines[headerIndex] ? splitDiagramCells(lines[headerIndex]) : null;
  if (!headings) return null;

  let detailsIndex = headerIndex + 1;
  while (detailsIndex < lines.length && (!lines[detailsIndex].trim() || ASCII_DIVIDER.test(lines[detailsIndex].trim()))) detailsIndex++;
  let details = lines[detailsIndex] ? splitDiagramCells(lines[detailsIndex]) : null;
  let detailsEnd = detailsIndex;
  if (details && !details[1].trim().endsWith(')') && detailsIndex + 1 < lines.length) {
    const continuation = lines[detailsIndex + 1].match(/^\s*\|\s*(.+?)\s*$/);
    if (continuation) {
      details[1] = `${details[1]} ${continuation[1]}`;
      detailsEnd++;
    }
  }
  if (!details || !details.every(cell => /^\(.*\)$/.test(cell.trim()))) return null;

  const featureRows: [string, string][] = [];
  let end = detailsEnd + 1;
  while (end < lines.length) {
    const line = lines[end].trim();
    if (!line) break;
    if (ASCII_DIVIDER.test(line)) {
      end++;
      break;
    }
    const cells = splitDiagramCells(line);
    if (!cells) break;
    featureRows.push(cells.map(cell => cell.replace(/^[•*-]\s*/, '')) as [string, string]);
    end++;
  }
  if (featureRows.length < 2) return null;

  const columns = headings.map((heading, columnIndex) => {
    const features = featureRows.map(row => `<li>${escapeVisualText(row[columnIndex])}</li>`).join('');
    return `<section class="article-comparison-card"><h3>${escapeVisualText(heading)}</h3><p class="article-comparison-detail">${escapeVisualText(details[columnIndex].replace(/^\(|\)$/g, ''))}</p><ul>${features}</ul></section>`;
  }).join('');
  return {
    html: `<section class="article-visual article-comparison-visual"><h2>${escapeVisualText(lines[start].trim())}</h2><div class="article-comparison-columns">${columns}</div></section>`,
    end: end - 1,
  };
}

function buildBarVisualAt(lines: string[], start: number): VisualMatch | null {
  const firstLineRows = parseBarLine(lines[start]);
  if (!firstLineRows) return null;

  let rows = [...firstLineRows];
  let end = start;
  if (firstLineRows.length === 1) {
    while (end + 1 < lines.length) {
      const next = parseBarLine(lines[end + 1]);
      if (!next || next.length !== 1) break;
      rows.push(next[0]);
      end++;
    }
    if (rows.length < 3) return null;
  } else if (
    firstLineRows.length < 2 ||
    !firstLineRows.every(row => /^\d{4}$/.test(row.label) && /[$€£]/.test(row.value))
  ) {
    return null;
  }

  let title: string | null = null;
  let visualStart = start;
  let lookback = start - 1;
  while (lookback >= 0 && !lines[lookback].trim() && start - lookback <= 2) lookback--;
  if (lookback >= 0 && ASCII_DIVIDER.test(lines[lookback].trim())) {
    visualStart = lookback;
    lookback--;
    while (lookback >= 0 && !lines[lookback].trim() && start - lookback <= 4) lookback--;
  }
  if (lookback >= 0 && /(?:spending|forecast|prioritization|workflow|inference)/i.test(lines[lookback])) {
    title = lines[lookback].replace(/[\s-]{3,}$/, '').trim();
    visualStart = lookback;
  }

  return { html: buildBarVisual(rows, title), start: visualStart, end };
}

function findArticleVisual(lines: string[], start: number): VisualMatch | null {
  const finOps = buildFinOpsVisual(lines, start);
  if (finOps) return finOps;
  const directBar = buildBarVisualAt(lines, start);
  if (directBar) return directBar;

  if (!/(?:spending|forecast|prioritization|workflow|inference)/i.test(lines[start])) return null;
  let rowIndex = start + 1;
  while (rowIndex < lines.length && rowIndex <= start + 2 &&
    (!lines[rowIndex].trim() || ASCII_DIVIDER.test(lines[rowIndex].trim()))) rowIndex++;
  const titledBar = rowIndex < lines.length ? buildBarVisualAt(lines, rowIndex) : null;
  return titledBar ? { ...titledBar, start } : null;
}

/**
 * Convert only the article's known text-chart and FinOps ASCII-diagram patterns.
 * Plain text outside a match is left untouched; existing rich HTML is inspected
 * only in simple paragraphs and never inside tables, code, or preformatted blocks.
 */
export function convertArticleVisualsToHTML(content: string): string {
  if (!content) return content;
  if (!/<[a-z][\s\S]*>/i.test(content)) {
    const lines = content.replace(/\r\n?/g, '\n').split('\n');
    const chunks: string[] = [];
    let plainStart = 0;
    for (let i = 0; i < lines.length; i++) {
      const visual = findArticleVisual(lines, i);
      if (!visual) continue;
      const visualStart = visual.start ?? i;
      if (plainStart < visualStart) chunks.push(lines.slice(plainStart, visualStart).join('\n'));
      chunks.push(visual.html);
      i = visual.end;
      plainStart = i + 1;
    }
    if (!chunks.length) return content;
    if (plainStart < lines.length) chunks.push(lines.slice(plainStart).join('\n'));
    return chunks.length === 1 && chunks[0] === content
      ? content
      : chunks.filter(Boolean).join('\n');
  }

  if (typeof DOMParser === 'undefined') return content;
  const doc = new DOMParser().parseFromString(content, 'text/html');
  const paragraphs = Array.from(doc.body.querySelectorAll('p')).filter(paragraph => {
    if (paragraph.closest('table, pre, code')) return false;
    return Array.from(paragraph.childNodes).every(node =>
      node.nodeType === Node.TEXT_NODE ||
      (node.nodeType === Node.ELEMENT_NODE && (node as Element).tagName === 'BR')
    );
  });
  const lines: string[] = [];
  const lineParagraphs: number[] = [];
  paragraphs.forEach((paragraph, paragraphIndex) => {
    const holder = doc.createElement('div');
    holder.innerHTML = paragraph.innerHTML.replace(/<br\s*\/?>/gi, '\n');
    const paragraphLines = (holder.textContent || '').split('\n');
    paragraphLines.forEach(line => {
      lines.push(line);
      lineParagraphs.push(paragraphIndex);
    });
  });

  const replacements: { first: number; last: number; html: string }[] = [];
  for (let i = 0; i < lines.length; i++) {
    const visual = findArticleVisual(lines, i);
    if (!visual) continue;
    const visualStart = visual.start ?? i;
    const first = lineParagraphs[visualStart];
    const last = lineParagraphs[visual.end];
    const firstLineOfParagraph = lineParagraphs.findIndex(index => index === first);
    const lastLineOfParagraph = lineParagraphs.lastIndexOf(last);
    // Do not discard prose sharing a paragraph with the chart.
    if (firstLineOfParagraph !== visualStart || lastLineOfParagraph !== visual.end) continue;
    const affected = paragraphs.slice(first, last + 1);
    if (!affected.length || affected.some(paragraph => paragraph.parentElement !== affected[0].parentElement)) continue;
    replacements.push({ first, last, html: visual.html });
    i = visual.end;
  }

  for (const replacement of replacements.reverse()) {
    const affected = paragraphs.slice(replacement.first, replacement.last + 1);
    const first = affected[0];
    if (!first?.parentNode) continue;
    const holder = doc.createElement('div');
    holder.innerHTML = replacement.html;
    first.replaceWith(...Array.from(holder.childNodes));
    affected.slice(1).forEach(paragraph => paragraph.remove());
  }
  return doc.body.innerHTML;
}

const URL_REGEX = /(?:https?:\/\/|www\.)[^\s<>"'`]+/gi;
const TRAILING_PUNCT = /[.,;:!?)\]>}'"]+$/;

function unwrapRedirectUrl(href: string): string {
  if (!href) return href;
  try {
    const u = new URL(href, 'https://placeholder.local');
    // Google Docs / Search redirect: https://www.google.com/url?q=REAL_URL&...
    if (
      (u.hostname === 'www.google.com' || u.hostname === 'google.com') &&
      u.pathname === '/url'
    ) {
      const real = u.searchParams.get('q') || u.searchParams.get('url');
      if (real && /^https?:\/\//i.test(real)) return real;
    }
  } catch {
    // ignore malformed URLs
  }
  return href;
}

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

    // Unwrap redirect URLs on existing anchors (e.g. Google Docs)
    const anchors = root.querySelectorAll('a[href]');
    anchors.forEach((a) => {
      const href = a.getAttribute('href') || '';
      const real = unwrapRedirectUrl(href);
      if (real !== href) a.setAttribute('href', real);
    });

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
