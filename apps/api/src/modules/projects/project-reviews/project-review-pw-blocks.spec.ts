import {
  dedupeAgendaItemsByPwBlock,
  parsePwBlockIdFromNotes,
  pwBlockNotesMarker,
} from './project-review-pw-blocks';

describe('project-review-pw-blocks', () => {
  it('parse / marker round-trip', () => {
    expect(pwBlockNotesMarker('presents')).toBe('[pw:presents]');
    expect(parsePwBlockIdFromNotes('[pw:presents]')).toBe('presents');
    expect(parsePwBlockIdFromNotes('[pw:presents] note libre')).toBe(
      'presents',
    );
    expect(parsePwBlockIdFromNotes(null)).toBeNull();
  });

  it('dedupeAgendaItemsByPwBlock keeps first occurrence only', () => {
    const items = [
      { id: 'a1', notes: '[pw:presents]' },
      { id: 'a2', notes: '[pw:presents]' },
      { id: 'a3', notes: '[pw:risks]' },
      { id: 'a4', notes: null },
      { id: 'a5', notes: '[pw:risks] extra' },
    ];
    const { unique, duplicateIds } = dedupeAgendaItemsByPwBlock(items);
    expect(unique.map((i) => i.id)).toEqual(['a1', 'a3', 'a4']);
    expect(duplicateIds).toEqual(['a2', 'a5']);
  });
});
