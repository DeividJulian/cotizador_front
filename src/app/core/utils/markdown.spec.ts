import { renderMarkdown } from './markdown';

describe('renderMarkdown', () => {
  it('convierte títulos, negrita y listas', () => {
    const html = renderMarkdown('# Título\n\n## Sección\n\n**Cliente:** Ana\n\n- uno\n- dos');
    expect(html).toContain('<h1>Título</h1>');
    expect(html).toContain('<h2>Sección</h2>');
    expect(html).toContain('<strong>Cliente:</strong>');
    expect(html).toContain('<ul><li>uno</li><li>dos</li></ul>');
  });

  it('convierte tablas ignorando la fila separadora', () => {
    const html = renderMarkdown('| Hito | Semana |\n|---|---|\n| Anticipo | 0 |');
    expect(html).toContain('<th>Hito</th>');
    expect(html).toContain('<td>Anticipo</td>');
    expect(html).not.toContain('---');
  });

  it('escapa el HTML para evitar inyecciones', () => {
    const html = renderMarkdown('<script>alert(1)</script>');
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });
});
