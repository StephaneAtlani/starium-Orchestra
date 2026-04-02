import { describe, expect, it } from 'vitest';
import {
  collaboratorSkillSourceLabel,
  isLevelBelow,
  skillReferenceLevelLabel,
  skillStatusLabel,
} from './skill-label-mappers';

describe('skill-label-mappers', () => {
  it('skillStatusLabel', () => {
    expect(skillStatusLabel('ACTIVE')).toBe('Actif');
    expect(skillStatusLabel('DRAFT')).toBe('Brouillon');
    expect(skillStatusLabel('ARCHIVED')).toBe('Archivé');
  });

  it('skillReferenceLevelLabel', () => {
    expect(skillReferenceLevelLabel('BEGINNER')).toBe('Débutant');
    expect(skillReferenceLevelLabel('EXPERT')).toBe('Expert');
  });

  it('isLevelBelow', () => {
    expect(isLevelBelow('BEGINNER', 'EXPERT')).toBe(true);
    expect(isLevelBelow('EXPERT', 'BEGINNER')).toBe(false);
  });

  it('collaboratorSkillSourceLabel', () => {
    expect(collaboratorSkillSourceLabel('SELF_DECLARED')).toBe('Auto-déclaré');
    expect(collaboratorSkillSourceLabel('UNKNOWN')).toBe('UNKNOWN');
  });
});
