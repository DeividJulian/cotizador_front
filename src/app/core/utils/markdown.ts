/**
 * Convierte el Markdown de la propuesta comercial a HTML.
 * Primero escapa todo el HTML, así que el resultado es seguro para [innerHTML].
 * Soporta: títulos, negrita, citas, listas, tablas y párrafos.
 */
function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function inline(text: string): string {
  return text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
}

function tableRow(line: string, tag: 'th' | 'td'): string {
  const cells = line.trim().replace(/^\||\|$/g, '').split('|');
  return '<tr>' + cells.map((c) => `<${tag}>${inline(c.trim())}</${tag}>`).join('') + '</tr>';
}

export function renderMarkdown(markdown: string): string {
  const lines = escapeHtml(markdown).split('\n');
  const html: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (!line.trim()) {
      i++;
    } else if (line.startsWith('## ')) {
      html.push(`<h2>${inline(line.slice(3))}</h2>`);
      i++;
    } else if (line.startsWith('# ')) {
      html.push(`<h1>${inline(line.slice(2))}</h1>`);
      i++;
    } else if (line.startsWith('&gt; ')) {
      const quote: string[] = [];
      while (i < lines.length && lines[i].startsWith('&gt; ')) quote.push(lines[i++].slice(5));
      html.push(`<blockquote>${inline(quote.join('<br>'))}</blockquote>`);
    } else if (line.startsWith('- ')) {
      const items: string[] = [];
      while (i < lines.length && lines[i].startsWith('- ')) items.push(`<li>${inline(lines[i++].slice(2))}</li>`);
      html.push(`<ul>${items.join('')}</ul>`);
    } else if (line.startsWith('|')) {
      const rows: string[] = [];
      while (i < lines.length && lines[i].startsWith('|')) rows.push(lines[i++]);
      const body = rows.filter((r) => !/^\|[\s:|-]+\|$/.test(r));
      html.push(
        '<div class="table-wrap"><table><thead>' +
          tableRow(body[0], 'th') +
          '</thead><tbody>' +
          body.slice(1).map((r) => tableRow(r, 'td')).join('') +
          '</tbody></table></div>',
      );
    } else {
      html.push(`<p>${inline(line)}</p>`);
      i++;
    }
  }
  return html.join('\n');
}
