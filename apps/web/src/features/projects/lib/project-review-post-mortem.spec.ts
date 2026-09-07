import { describe, expect, it } from 'vitest';
import {
  getReviewTypeOptionsForEditor,
  REVIEW_TYPES_PILOTAGE,
} from './project-review-post-mortem';
import type { ProjectReviewType } from '../types/project.types';

describe('getReviewTypeOptionsForEditor', () => {
  it('projet non clos + POST_MORTEM : type stocké en tête, puis types de pilotage', () => {
    const options = getReviewTypeOptionsForEditor('IN_PROGRESS', 'POST_MORTEM');
    expect(options).toEqual(['POST_MORTEM', ...REVIEW_TYPES_PILOTAGE]);
    expect(options.includes('POST_MORTEM')).toBe(true);
  });

  it('projet non clos + type hors pilotage : type stocké en tête, jamais filtré', () => {
    const options = getReviewTypeOptionsForEditor('IN_PROGRESS', 'PROJECT_REVIEW');
    expect(options[0]).toBe('PROJECT_REVIEW');
    expect(options.slice(1)).toEqual([...REVIEW_TYPES_PILOTAGE]);
    expect(options.includes('PROJECT_REVIEW')).toBe(true);
  });

  it('projet clos + POST_MORTEM : uniquement le retour d’expérience', () => {
    expect(getReviewTypeOptionsForEditor('COMPLETED', 'POST_MORTEM')).toEqual([
      'POST_MORTEM',
    ]);
  });

  it('inclut toujours le type courant, quel que soit le statut projet', () => {
    const cases: Array<[string, ProjectReviewType]> = [
      ['IN_PROGRESS', 'COPIL'],
      ['IN_PROGRESS', 'POST_MORTEM'],
      ['IN_PROGRESS', 'BUDGET_REVIEW'],
      ['COMPLETED', 'POST_MORTEM'],
      ['COMPLETED', 'COPIL'],
      ['ARCHIVED', 'PROJECT_REVIEW'],
    ];
    for (const [status, current] of cases) {
      expect(getReviewTypeOptionsForEditor(status, current).includes(current)).toBe(
        true,
      );
    }
  });
});
