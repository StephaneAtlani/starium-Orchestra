import {
  contentJsonFromTemplateOutline,
  normalizeProcedureTemplateOutline,
} from '../lib/procedure-template-outline.util';

describe('normalizeProcedureTemplateOutline', () => {
  it('filtre titres vides et niveaux invalides', () => {
    const { items } = normalizeProcedureTemplateOutline([
      { level: 1, title: '  Ok  ' },
      { level: 2, title: '   ' },
      { level: 9, title: 'Nope' },
      { level: '3', title: 'H3' },
    ]);
    expect(items).toEqual([
      { level: 1, title: 'Ok' },
      { level: 3, title: 'H3' },
    ]);
  });

  it('warning si saut de niveau', () => {
    const { hierarchyWarnings } = normalizeProcedureTemplateOutline([
      { level: 1, title: 'A' },
      { level: 3, title: 'B' },
    ]);
    expect(hierarchyWarnings).toHaveLength(1);
    expect(hierarchyWarnings[0]).toContain('B');
  });

  it('pas de warning si progression normale', () => {
    const { hierarchyWarnings } = normalizeProcedureTemplateOutline([
      { level: 1, title: 'A' },
      { level: 2, title: 'B' },
      { level: 3, title: 'C' },
      { level: 1, title: 'D' },
    ]);
    expect(hierarchyWarnings).toEqual([]);
  });
});

describe('contentJsonFromTemplateOutline', () => {
  it('ajoute un paragraphe vide sous chaque titre', () => {
    const doc = contentJsonFromTemplateOutline([
      { level: 1, title: 'Intro' },
      { level: 2, title: 'Suite' },
    ]);
    expect(doc.schemaVersion).toBe(2);
    expect(doc.blocks).toEqual([
      { t: 'h1', html: 'Intro' },
      { t: 'p', html: '' },
      { t: 'h2', html: 'Suite' },
      { t: 'p', html: '' },
    ]);
  });

  it('échappe le HTML des titres', () => {
    const doc = contentJsonFromTemplateOutline([
      { level: 1, title: 'A <b>B</b>' },
    ]);
    expect(doc.blocks[0]?.html).toBe('A &lt;b&gt;B&lt;/b&gt;');
  });
});
