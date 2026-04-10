import { BudgetLineStatus } from '@prisma/client';
import {
  defaultSnapshotIncludedLineStatuses,
  mergeBudgetWorkflowConfig,
  mergeBudgetWorkflowPatch,
  parseStoredBudgetWorkflowConfig,
} from './budget-workflow-config.merge';

describe('budget-workflow-config.merge', () => {
  describe('mergeBudgetWorkflowConfig', () => {
    it('null => défauts applicatifs (dont statuts version figée sans brouillon)', () => {
      expect(mergeBudgetWorkflowConfig(null)).toEqual({
        requireEnvelopesNonDraftForBudgetValidated: true,
        snapshotIncludedBudgetLineStatuses:
          defaultSnapshotIncludedLineStatuses(),
      });
    });

    it('JSON partiel false => resolved false + défaut snapshot', () => {
      expect(
        mergeBudgetWorkflowConfig({
          requireEnvelopesNonDraftForBudgetValidated: false,
        }),
      ).toEqual({
        requireEnvelopesNonDraftForBudgetValidated: false,
        snapshotIncludedBudgetLineStatuses: defaultSnapshotIncludedLineStatuses(),
      });
    });

    it('snapshot personnalisé (ex. inclure brouillon)', () => {
      const custom = [
        ...defaultSnapshotIncludedLineStatuses(),
        BudgetLineStatus.DRAFT,
      ];
      expect(
        mergeBudgetWorkflowConfig({
          snapshotIncludedBudgetLineStatuses: custom,
        }),
      ).toEqual({
        requireEnvelopesNonDraftForBudgetValidated: true,
        snapshotIncludedBudgetLineStatuses: custom,
      });
    });

    it('ignore clés inconnues en base', () => {
      expect(
        mergeBudgetWorkflowConfig({
          unknownKey: 1,
          requireEnvelopesNonDraftForBudgetValidated: false,
        } as unknown as object),
      ).toEqual({
        requireEnvelopesNonDraftForBudgetValidated: false,
        snapshotIncludedBudgetLineStatuses: defaultSnapshotIncludedLineStatuses(),
      });
    });

    it('type invalide pour clé connue => défaut true pour booléen', () => {
      expect(
        mergeBudgetWorkflowConfig({
          requireEnvelopesNonDraftForBudgetValidated: 'oops' as unknown as boolean,
        } as unknown as object),
      ).toEqual({
        requireEnvelopesNonDraftForBudgetValidated: true,
        snapshotIncludedBudgetLineStatuses: defaultSnapshotIncludedLineStatuses(),
      });
    });
  });

  describe('parseStoredBudgetWorkflowConfig', () => {
    it('retourne null si pas de clé valide', () => {
      expect(parseStoredBudgetWorkflowConfig({ foo: 1 })).toBeNull();
    });

    it('parse snapshot si tableau de statuts valides', () => {
      expect(
        parseStoredBudgetWorkflowConfig({
          snapshotIncludedBudgetLineStatuses: ['ACTIVE', 'DRAFT', 'nope'],
        }),
      ).toEqual({
        snapshotIncludedBudgetLineStatuses: [
          BudgetLineStatus.ACTIVE,
          BudgetLineStatus.DRAFT,
        ],
      });
    });
  });

  describe('mergeBudgetWorkflowPatch', () => {
    it('fusionne patch sur stocké null', () => {
      const out = mergeBudgetWorkflowPatch(null, {
        requireEnvelopesNonDraftForBudgetValidated: false,
      });
      expect(out).toEqual({ requireEnvelopesNonDraftForBudgetValidated: false });
    });

    it('repasse à sparse vide si valeur = défaut applicatif', () => {
      const out = mergeBudgetWorkflowPatch(
        { requireEnvelopesNonDraftForBudgetValidated: false },
        { requireEnvelopesNonDraftForBudgetValidated: true },
      );
      expect(out).toBeNull();
    });

    it('persiste snapshot si différent du défaut', () => {
      const out = mergeBudgetWorkflowPatch(null, {
        snapshotIncludedBudgetLineStatuses: [BudgetLineStatus.ACTIVE],
      });
      expect(out).toEqual({
        snapshotIncludedBudgetLineStatuses: [BudgetLineStatus.ACTIVE],
      });
    });

    it('sparse vide si snapshot = défaut explicite', () => {
      const out = mergeBudgetWorkflowPatch(null, {
        snapshotIncludedBudgetLineStatuses: defaultSnapshotIncludedLineStatuses(),
      });
      expect(out).toBeNull();
    });
  });
});
