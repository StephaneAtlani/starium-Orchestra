import { deriveComplianceFamilyLabel } from './compliance-family-label';

describe('deriveComplianceFamilyLabel', () => {
  it('détecte NIS2 via le nom', () => {
    expect(
      deriveComplianceFamilyLabel({
        name: 'Directive NIS 2',
        provider: 'EU',
      }),
    ).toBe('NIS2');
  });

  it('détecte via le chemin source', () => {
    expect(
      deriveComplianceFamilyLabel({
        name: 'Annexe technique',
        sourceLibraryPath:
          'backend/library/libraries/annex-nis2-regulation--2024-2690.yaml',
      }),
    ).toBe('NIS2');
  });

  it('détecte ISO 27001', () => {
    expect(
      deriveComplianceFamilyLabel({ name: 'ISO/IEC 27001:2022' }),
    ).toBe('ISO 27001');
  });

  it('fallback métier sans ID', () => {
    expect(deriveComplianceFamilyLabel({ name: 'Cadre interne' })).toBe(
      'Référentiel',
    );
  });
});
