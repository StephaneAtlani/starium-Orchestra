import {
  formatProcedureVersionLabel,
  previewNextProcedureVersionLabel,
  resolveNextProcedureVersion,
  type ProcedureBumpType,
} from '../lib/procedure-version.util';
import {
  ProcedureVersionBumpType,
  ProcedureVersionLifecycle,
} from '@prisma/client';

describe('procedure-version.util', () => {
  describe('formatProcedureVersionLabel', () => {
    it('formate vX.Y', () => {
      expect(formatProcedureVersionLabel(1, 0)).toBe('v1.0');
      expect(formatProcedureVersionLabel(2, 1)).toBe('v2.1');
    });
    it('retourne null si incomplet', () => {
      expect(formatProcedureVersionLabel(null, 0)).toBeNull();
      expect(formatProcedureVersionLabel(1, null)).toBeNull();
    });
  });

  describe('resolveNextProcedureVersion', () => {
    it('1ʳᵉ publish → 1.0', () => {
      expect(resolveNextProcedureVersion(null, 'MINOR', undefined)).toEqual({
        major: 1,
        minor: 0,
        bumpType: 'MAJOR',
      });
    });

    it('mineure par défaut', () => {
      expect(
        resolveNextProcedureVersion(
          { versionMajor: 1, versionMinor: 0 },
          undefined,
          undefined,
        ),
      ).toEqual({ major: 1, minor: 1, bumpType: 'MINOR' });
    });

    it('majeure avec commentaire', () => {
      expect(
        resolveNextProcedureVersion(
          { versionMajor: 1, versionMinor: 3 },
          'MAJOR',
          'Refonte des rôles',
        ),
      ).toEqual({ major: 2, minor: 0, bumpType: 'MAJOR' });
    });

    it('majeure sans commentaire → erreur', () => {
      expect(() =>
        resolveNextProcedureVersion(
          { versionMajor: 1, versionMinor: 0 },
          'MAJOR',
          '  ',
        ),
      ).toThrow('MAJOR_SUMMARY_REQUIRED');
    });
  });

  describe('previewNextProcedureVersionLabel', () => {
    it('prévisualise', () => {
      expect(previewNextProcedureVersionLabel(null, 'MINOR')).toBe('v1.0');
      expect(
        previewNextProcedureVersionLabel(
          { versionMajor: 2, versionMinor: 1 },
          'MINOR',
        ),
      ).toBe('v2.2');
      expect(
        previewNextProcedureVersionLabel(
          { versionMajor: 2, versionMinor: 1 },
          'MAJOR' as ProcedureBumpType,
        ),
      ).toBe('v3.0');
    });
  });

  it('enum Prisma aligné', () => {
    expect(ProcedureVersionBumpType.MINOR).toBe('MINOR');
    expect(ProcedureVersionBumpType.MAJOR).toBe('MAJOR');
    expect(ProcedureVersionLifecycle.DRAFT).toBe('DRAFT');
  });
});
