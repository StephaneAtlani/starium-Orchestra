import { renderTemplate } from './email.templates';

describe('email.templates project_review_report', () => {
  it('utilise htmlBody pour le HTML et un texte court', () => {
    const rendered = renderTemplate('project_review_report', {
      title: 'Compte rendu — Projet X',
      message: 'LONG TEXT VERSION THAT SHOULD NOT BE IN TEXT BODY',
      actionUrl: 'http://localhost:3000/projects/p1?openReview=r1',
      htmlBody: '<div><h1>Rapport HTML</h1></div>',
    });

    expect(rendered.html).toContain('<h1>Rapport HTML</h1>');
    expect(rendered.html).toContain('Ouvrir dans Starium');
    expect(rendered.text).not.toContain('LONG TEXT VERSION');
    expect(rendered.text).toContain('http://localhost:3000/projects/p1?openReview=r1');
    expect(rendered.text).toContain('format HTML');
  });
});
