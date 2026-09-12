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
  reviewTypeToTypeCode,
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
          customBlocks: [],
          templateId: null,
        },
      },
      ['presents'],
    );
    expect(parsed.mode).toBe('sections');
    expect(parsed.selectedBlockIds).toEqual(['presents', 'objectif']);

    const merged = mergeContentPayloadWithPrep(
      { committeeMood: 'GREEN' },
      parsed,
    );
    expect(merged.committeeMood).toBe('GREEN');
    expect(merged.prepWorkspace).toEqual(parsed);
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
