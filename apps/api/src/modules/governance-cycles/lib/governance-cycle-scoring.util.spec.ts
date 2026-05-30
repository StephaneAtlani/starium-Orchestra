import {
  computePriorityScore,
  hasScorePatch,
  mergeItemScores,
  scoresFromDto,
} from './governance-cycle-scoring.util';

describe('governance-cycle-scoring.util', () => {
  describe('computePriorityScore', () => {
    it('null si un score manquant', () => {
      expect(
        computePriorityScore({
          valueScore: 5,
          alignmentScore: 5,
          budgetScore: 4,
          capacityScore: 4,
          riskScore: null,
        }),
      ).toBeNull();
    });

    it('null si tous les scores absents', () => {
      expect(
        computePriorityScore({
          valueScore: null,
          riskScore: null,
          budgetScore: null,
          capacityScore: null,
          alignmentScore: null,
        }),
      ).toBeNull();
    });

    it('formule RFC §4.5 — value=5, alignment=5, budget=4, capacity=4, risk=2 → 42', () => {
      expect(
        computePriorityScore({
          valueScore: 5,
          alignmentScore: 5,
          budgetScore: 4,
          capacityScore: 4,
          riskScore: 2,
        }),
      ).toBe(42);
    });

    it('minimum avec tous les scores à 1', () => {
      expect(
        computePriorityScore({
          valueScore: 1,
          alignmentScore: 1,
          budgetScore: 1,
          capacityScore: 1,
          riskScore: 1,
        }),
      ).toBe(8);
    });
  });

  describe('scoresFromDto', () => {
    it('mappe les champs présents et null sinon', () => {
      expect(scoresFromDto({ valueScore: 3, riskScore: 2 })).toEqual({
        valueScore: 3,
        riskScore: 2,
        budgetScore: null,
        capacityScore: null,
        alignmentScore: null,
      });
    });
  });

  describe('mergeItemScores', () => {
    it('conserve les scores existants si absents du DTO', () => {
      expect(
        mergeItemScores(
          {
            valueScore: 5,
            riskScore: 2,
            budgetScore: 4,
            capacityScore: 4,
            alignmentScore: 5,
          },
          { valueScore: 3 },
        ),
      ).toEqual({
        valueScore: 3,
        riskScore: 2,
        budgetScore: 4,
        capacityScore: 4,
        alignmentScore: 5,
      });
    });

    it('efface un score quand le DTO envoie null', () => {
      expect(
        mergeItemScores(
          {
            valueScore: 5,
            riskScore: 2,
            budgetScore: 4,
            capacityScore: 4,
            alignmentScore: 5,
          },
          { valueScore: null },
        ).valueScore,
      ).toBeNull();
    });
  });

  describe('hasScorePatch', () => {
    it('true si une clé score est présente, y compris null', () => {
      expect(hasScorePatch({ valueScore: null })).toBe(true);
      expect(hasScorePatch({ valueScore: 3 })).toBe(true);
    });

    it('false si aucune clé score dans le body', () => {
      expect(hasScorePatch({ title: 'X' })).toBe(false);
    });

    it('true si valueScore est undefined mais présent comme clé', () => {
      expect(hasScorePatch({ title: 'X', valueScore: undefined })).toBe(true);
    });
  });
});
