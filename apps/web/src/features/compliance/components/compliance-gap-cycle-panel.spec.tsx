import { describe, expect, it } from 'vitest';
import {
  canCloseOrRejectGap,
  canSubmitGapToVerify,
  complianceGapStatusLabel,
  isGapTerminal,
} from '../lib/compliance-gap-status';

describe('compliance-gap-status', () => {
  it('expose les libellés métier FR', () => {
    expect(complianceGapStatusLabel('OPEN')).toBe('Ouvert');
    expect(complianceGapStatusLabel('IN_PROGRESS')).toBe('En traitement');
    expect(complianceGapStatusLabel('TO_VERIFY')).toBe('À vérifier');
    expect(complianceGapStatusLabel('CLOSED')).toBe('Clôturé');
    expect(complianceGapStatusLabel('CANCELLED')).toBe('Annulé');
    expect(complianceGapStatusLabel('???')).toBe('Statut inconnu');
  });

  it('autorise les transitions UI du cycle efficacité', () => {
    expect(canSubmitGapToVerify('OPEN')).toBe(true);
    expect(canSubmitGapToVerify('IN_PROGRESS')).toBe(true);
    expect(canSubmitGapToVerify('TO_VERIFY')).toBe(false);
    expect(canCloseOrRejectGap('TO_VERIFY')).toBe(true);
    expect(canCloseOrRejectGap('OPEN')).toBe(false);
    expect(isGapTerminal('CLOSED')).toBe(true);
    expect(isGapTerminal('CANCELLED')).toBe(true);
    expect(isGapTerminal('OPEN')).toBe(false);
  });
});
