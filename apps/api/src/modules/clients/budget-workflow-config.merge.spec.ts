import {
  mergeBudgetWorkflowConfig,
  mergeBudgetWorkflowPatch,
  parseStoredBudgetWorkflowConfig,
} from './budget-workflow-config.merge';

describe('budget-workflow-config.merge', () => {
  describe('mergeBudgetWorkflowConfig', () => {
    it('null => défaut requireEnvelopesNonDraftForBudgetValidated true', () => {
      expect(mergeBudgetWorkflowConfig(null)).toEqual({
        requireEnvelopesNonDraftForBudgetValidated: true,
      });
    });

    it('JSON partiel false => resolved false', () => {
      expect(
        mergeBudgetWorkflowConfig({
          requireEnvelopesNonDraftForBudgetValidated: false,
        }),
      ).toEqual({
        requireEnvelopesNonDraftForBudgetValidated: false,
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
      });
    });

    it('type invalide pour clé connue => défaut true', () => {
      expect(
        mergeBudgetWorkflowConfig({
          requireEnvelopesNonDraftForBudgetValidated: 'oops' as unknown as boolean,
        } as unknown as object),
      ).toEqual({
        requireEnvelopesNonDraftForBudgetValidated: true,
      });
    });
  });

  describe('parseStoredBudgetWorkflowConfig', () => {
    it('retourne null si pas de clé valide', () => {
      expect(parseStoredBudgetWorkflowConfig({ foo: 1 })).toBeNull();
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
  });
});
