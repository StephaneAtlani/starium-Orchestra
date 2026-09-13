import { describe, expect, it } from 'vitest';
import {
  blocksForTypeCode,
  defaultSelectedBlockIds,
} from './prepare-workspace-blocks';
import {
  mergeContentPayloadWithPrep,
  parsePrepWorkspace,
  parsePwBlockIdFromNotes,
  pwBlockNotesMarker,
  resolveBlockOrderIds,
  reviewTypeToTypeCode,
  selectedIdsInBlockOrder,
} from './prepare-workspace-types';

describe('prepare-workspace-types', () => {
  it('mappe reviewType → typeCode kit', () => {
    expect(reviewTypeToTypeCode('COPIL')).toBe('COPIL');
    expect(reviewTypeToTypeCode('COPRO')).toBe('COPROJ');
    expect(reviewTypeToTypeCode('POST_MORTEM')).toBe('REX');
    expect(reviewTypeToTypeCode('OTHER')).toBe('ADHOC');
  });

  it('parse / merge prepWorkspace sans écraser le payload existant', () => {
    const parsed = parsePrepWorkspace(
      {
        committeeMood: 'GREEN',
        prepWorkspace: {
          mode: 'sections',
          selectedBlockIds: ['presents', 'objectif'],
          blockOrderIds: ['objectif', 'presents', 'tour'],
          customBlocks: [],
          templateId: null,
        },
      },
      ['presents'],
    );
    expect(parsed.mode).toBe('sections');
    expect(parsed.selectedBlockIds).toEqual(['presents', 'objectif']);
    expect(parsed.blockOrderIds).toEqual(['objectif', 'presents', 'tour']);

    const merged = mergeContentPayloadWithPrep(
      { committeeMood: 'GREEN' },
      parsed,
    );
    expect(merged.committeeMood).toBe('GREEN');
    expect(merged.prepWorkspace).toEqual(parsed);
  });

  it('garde la position des blocs retirés (pas selected-first)', () => {
    const catalog = [
      'presents',
      'objectif',
      'tour',
      'actions',
      'avancement',
    ];
    expect(resolveBlockOrderIds(catalog, undefined)).toEqual(catalog);
    expect(
      resolveBlockOrderIds(catalog, ['tour', 'presents', 'objectif']),
    ).toEqual(['tour', 'presents', 'objectif', 'actions', 'avancement']);
    expect(
      selectedIdsInBlockOrder(
        ['presents', 'actions'],
        ['presents', 'objectif', 'tour', 'actions'],
      ),
    ).toEqual(['presents', 'actions']);
  });

  it('marqueurs notes [pw:]', () => {
    expect(pwBlockNotesMarker('presents')).toBe('[pw:presents]');
    expect(parsePwBlockIdFromNotes('[pw:presents]\nnote')).toBe('presents');
    expect(parsePwBlockIdFromNotes(null)).toBeNull();
  });
});

describe('prepare-workspace-blocks', () => {
  it('filtre / défauts par type', () => {
    const blocks = blocksForTypeCode('COPIL');
    expect(blocks.length).toBeGreaterThan(0);
    expect(defaultSelectedBlockIds('COPIL')).toEqual(
      blocks.map((b) => b.id),
    );
  });
});
