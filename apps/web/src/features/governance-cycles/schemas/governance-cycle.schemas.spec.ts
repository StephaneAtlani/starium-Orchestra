import { describe, expect, it } from 'vitest';
import {
  ARBITRATION_PATCH_KEYS,
  EDITION_PATCH_KEYS,
  patchGovernanceCycleItemArbitrationSchema,
  patchGovernanceCycleItemEditionSchema,
} from '../schemas/governance-cycle.schemas';

describe('governance-cycle.schemas', () => {
  it('refuse les champs croises entre edition et arbitrage', () => {
    const edition = patchGovernanceCycleItemEditionSchema.safeParse({
      valueScore: 4,
      decisionStatus: 'ACCEPTED',
    });
    expect(edition.success).toBe(false);

    const arbitration = patchGovernanceCycleItemArbitrationSchema.safeParse({
      decisionStatus: 'ACCEPTED',
      valueScore: 4,
    });
    expect(arbitration.success).toBe(false);
  });

  it('separe les jeux de cles edition vs arbitrage', () => {
    expect(EDITION_PATCH_KEYS).not.toContain('decisionStatus');
    expect(ARBITRATION_PATCH_KEYS).not.toContain('valueScore');
  });
});
