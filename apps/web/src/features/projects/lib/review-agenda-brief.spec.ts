import { describe, expect, it } from 'vitest';
import {
  briefPlaceholderForAgendaNotes,
  resolveAgendaBriefPrepNote,
} from './review-agenda-brief';

describe('resolveAgendaBriefPrepNote', () => {
  it('ne renvoie que le brief saisi (objective)', () => {
    expect(
      resolveAgendaBriefPrepNote({
        objective: '  Mettre à jour les actions  ',
      }),
    ).toBe('Mettre à jour les actions');
    expect(resolveAgendaBriefPrepNote({ objective: null })).toBeNull();
    expect(resolveAgendaBriefPrepNote({ objective: '   ' })).toBeNull();
  });

  it('placeholder d’aide selon le bloc [pw:]', () => {
    expect(briefPlaceholderForAgendaNotes('[pw:planning]')).toMatch(/jalons/i);
    expect(briefPlaceholderForAgendaNotes(null)).toMatch(/préparer/i);
  });
});
