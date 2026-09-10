import { ProjectTaskStatus } from '@prisma/client';
import {
  actionsEligibleForTaskPush,
  extractRiskNoteTitles,
  isDuplicateRiskTitle,
  nextRiskCodeFromExisting,
} from './project-review-finalize-side-effects';

describe('project-review-finalize-side-effects', () => {
  describe('extractRiskNoteTitles', () => {
    it('extrait et déduplique les lignes Risque', () => {
      expect(
        extractRiskNoteTitles(
          'Note libre\nRisque : Fuite données\nrisque: fuite données\nRisque : Retard fournisseur',
        ),
      ).toEqual(['Fuite données', 'Retard fournisseur']);
    });

    it('retourne [] si vide', () => {
      expect(extractRiskNoteTitles(null)).toEqual([]);
      expect(extractRiskNoteTitles('')).toEqual([]);
    });
  });

  describe('actionsEligibleForTaskPush', () => {
    it('exclut liées, vides, DONE et CANCELLED', () => {
      const eligible = actionsEligibleForTaskPush([
        {
          id: '1',
          title: 'A',
          description: null,
          status: ProjectTaskStatus.TODO,
          priority: null,
          dueDate: null,
          linkedTaskId: null,
          responsibleUserId: null,
        },
        {
          id: '2',
          title: 'B',
          description: null,
          status: ProjectTaskStatus.TODO,
          priority: null,
          dueDate: null,
          linkedTaskId: 't1',
          responsibleUserId: null,
        },
        {
          id: '3',
          title: '  ',
          description: null,
          status: ProjectTaskStatus.TODO,
          priority: null,
          dueDate: null,
          linkedTaskId: null,
          responsibleUserId: null,
        },
        {
          id: '4',
          title: 'D',
          description: null,
          status: ProjectTaskStatus.DONE,
          priority: null,
          dueDate: null,
          linkedTaskId: null,
          responsibleUserId: null,
        },
      ]);
      expect(eligible.map((a) => a.id)).toEqual(['1']);
    });
  });

  describe('nextRiskCodeFromExisting', () => {
    it('incrémente R-xxx', () => {
      expect(nextRiskCodeFromExisting(['R-001', 'R-012', 'X-9'])).toBe('R-013');
      expect(nextRiskCodeFromExisting([])).toBe('R-001');
    });
  });

  describe('isDuplicateRiskTitle', () => {
    it('compare case-insensitive', () => {
      expect(isDuplicateRiskTitle(['Fuite Données'], 'fuite données')).toBe(true);
      expect(isDuplicateRiskTitle(['Autre'], 'Fuite')).toBe(false);
    });
  });
});
