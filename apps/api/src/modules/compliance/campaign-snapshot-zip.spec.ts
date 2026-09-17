import {
  buildCampaignSnapshotZip,
  escapeCsvCell,
  toCsv,
} from './campaign-snapshot-zip';

describe('campaign-snapshot-zip', () => {
  it('échappe les formules CSV', () => {
    expect(escapeCsvCell('=CMD()')).toBe("'=CMD()");
    expect(escapeCsvCell('ok;x')).toBe('"ok;x"');
  });

  it('génère un ZIP avec les fichiers attendus', async () => {
    const buf = await buildCampaignSnapshotZip({
      label: 'Clôture',
      payload: {
        capturedAt: '2026-09-17T12:00:00.000Z',
        campaign: {
          name: 'Revue NIS2',
          status: 'CLOSED',
          frozenFrameworkName: 'NIS2',
          frozenFrameworkVersion: '1',
        },
        totals: {
          requirementCount: 1,
          compliantCount: 1,
          partiallyCompliantCount: 0,
          nonCompliantCount: 0,
          notApplicableCount: 0,
          notAssessedCount: 0,
          applicableCount: 1,
          compliancePercent: 100,
        },
        requirements: [
          {
            code: 'A.1',
            title: 'Ctrl',
            category: 'Domaine',
            status: 'COMPLIANT',
            comment: 'ok',
            evidenceCount: 1,
          },
        ],
      },
      evidences: [
        {
          code: 'A.1',
          name: 'Obs',
          kind: 'OBSERVATION',
          hasUrl: false,
          hasFile: false,
          isObservation: true,
        },
      ],
    });
    expect(buf.length).toBeGreaterThan(100);
    // Signature ZIP locale
    expect(buf[0]).toBe(0x50);
    expect(buf[1]).toBe(0x4b);
  });

  it('toCsv produit un en-tête', () => {
    expect(toCsv(['a', 'b'], [['1', '2']])).toContain('a;b');
  });
});
