import {
  buildAccessModelExportFilename,
  issuesToCsv,
  sanitizeAccessModelExportFilenamePart,
} from './access-model-export';
import type { AccessModelIssueItem } from './access-model.types';

describe('access-model-export', () => {
  const sampleIssue: AccessModelIssueItem = {
    id: 'PROJECT:proj-uuid-1:USER:u1:WRITE',
    resourceId: 'proj-uuid-1',
    category: 'atypical_acl',
    resourceType: 'PROJECT',
    module: 'projects',
    label: 'Projet Alpha',
    severity: 'warning',
    correctiveAction: {
      kind: 'link',
      href: '/projects/proj-uuid-1',
      label: 'Ouvrir le projet',
    },
  };

  it('sanitizeAccessModelExportFilenamePart nettoie slug dangereux', () => {
    const safe = sanitizeAccessModelExportFilenamePart(
      'Acme/Labs "EU"',
      'client-id-fallback',
    );
    expect(safe).not.toMatch(/[/\s"\\;\r\n]/);
    expect(safe).toBe('Acme-Labs-EU');

    expect(
      sanitizeAccessModelExportFilenamePart('', 'client-id-fallback'),
    ).toBe('client-id-fallback');
  });

  it('buildAccessModelExportFilename avec slug dangereux → filename sécurisé', () => {
    const filename = buildAccessModelExportFilename(
      'Acme/Labs "EU"',
      'client-id-fallback',
      '2026-05-18T12:00:00.000Z',
    );
    expect(filename).toBe('access-model-issues-Acme-Labs-EU-2026-05-18.csv');
    expect(filename).not.toMatch(/[/\s"]/);
    expect(filename).not.toContain('client-id-fallback');
  });

  it('buildAccessModelExportFilename est stable', () => {
    expect(
      buildAccessModelExportFilename('acme-corp', 'c1', '2026-05-18T12:00:00.000Z'),
    ).toBe('access-model-issues-acme-corp-2026-05-18.csv');
  });

  it('issuesToCsv utilise resourceId métier, pas id composite', () => {
    const csv = issuesToCsv([sampleIssue]);
    expect(csv).toContain('proj-uuid-1');
    expect(csv).not.toContain('PROJECT:proj-uuid-1:USER');
    expect(csv.startsWith('\uFEFF')).toBe(true);

    const dataLine = csv.split('\n')[1] ?? '';
    const cells = dataLine.split(',');
    expect(cells[4]).toBe('proj-uuid-1');
    expect(cells[4]).not.toBe(sampleIssue.id);
  });

  it('issuesToCsv refuse item sans resourceId', () => {
    const bad = { ...sampleIssue, resourceId: '' };
    expect(() => issuesToCsv([bad])).toThrow(/resourceId manquant/);
  });

  it('issuesToCsv supporte delimiter point-virgule', () => {
    const csv = issuesToCsv([sampleIssue], ';');
    const dataLine = csv.split('\n')[1];
    expect(dataLine).toContain('atypical_acl');
    expect(dataLine?.split(';').length).toBeGreaterThanOrEqual(8);
  });
});
