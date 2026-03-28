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
