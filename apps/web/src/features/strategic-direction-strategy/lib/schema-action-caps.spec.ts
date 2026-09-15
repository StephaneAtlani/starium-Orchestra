import { describe, expect, it } from 'vitest';
import { resolveSchemaActionCaps } from './schema-action-caps';

describe('resolveSchemaActionCaps', () => {
  it('autorise édition et soumission en DRAFT si write', () => {
    const caps = resolveSchemaActionCaps({
      status: 'DRAFT',
      canUpdateStrategy: true,
      hasReview: false,
    });
    expect(caps.canEditContent).toBe(true);
    expect(caps.canSubmit).toBe(true);
    expect(caps.canAdaptVersion).toBe(false);
    expect(caps.canArchive).toBe(false);
    expect(caps.showReviewEntry).toBe(true);
    expect(caps.canDecide).toBe(false);
  });

  it('gèle le contenu en APPROVED et expose version / archive', () => {
    const caps = resolveSchemaActionCaps({
      status: 'APPROVED',
      canUpdateStrategy: true,
    });
    expect(caps.canEditContent).toBe(false);
    expect(caps.canSubmit).toBe(false);
    expect(caps.canAdaptVersion).toBe(true);
    expect(caps.canArchive).toBe(true);
    expect(caps.showReviewEntry).toBe(false);
  });

  it('autorise décider en SUBMITTED avec review', () => {
    const caps = resolveSchemaActionCaps({
      status: 'SUBMITTED',
      canUpdateStrategy: true,
      hasReview: true,
    });
    expect(caps.canEditContent).toBe(false);
    expect(caps.canDecide).toBe(true);
    expect(caps.showReviewEntry).toBe(true);
  });

  it('refuse toute écriture sans canUpdateStrategy', () => {
    const caps = resolveSchemaActionCaps({
      status: 'DRAFT',
      canUpdateStrategy: false,
      hasReview: true,
    });
    expect(caps.canEditContent).toBe(false);
    expect(caps.canSubmit).toBe(false);
    expect(caps.canAdaptVersion).toBe(false);
    expect(caps.canArchive).toBe(false);
  });

  it('priorise les flags API dérivés', () => {
    const caps = resolveSchemaActionCaps({
      status: 'DRAFT',
      canUpdateStrategy: true,
      canEditContent: false,
      canSubmit: false,
    });
    expect(caps.canEditContent).toBe(false);
    expect(caps.canSubmit).toBe(false);
  });

  it('gèle ARCHIVED', () => {
    const caps = resolveSchemaActionCaps({
      status: 'ARCHIVED',
      canUpdateStrategy: true,
    });
    expect(caps.canEditContent).toBe(false);
    expect(caps.canAdaptVersion).toBe(false);
    expect(caps.canArchive).toBe(false);
    expect(caps.showReviewEntry).toBe(false);
  });
});
