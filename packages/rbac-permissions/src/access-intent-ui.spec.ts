import { describe, expect, it } from 'vitest';
import { evaluateAccessIntentForUi } from './access-intent-ui';

describe('evaluateAccessIntentForUi', () => {
  it('read_scope + v2 + serviceEnforced → allowed', () => {
    const r = evaluateAccessIntentForUi(
      'projects',
      'read',
      new Set(['projects.read_scope']),
      { v2Enabled: true, serviceEnforced: true },
    );
    expect(r.allowed).toBe(true);
  });

  it('read_scope + v2 sans serviceEnforced → refuse', () => {
    const r = evaluateAccessIntentForUi(
      'projects',
      'read',
      new Set(['projects.read_scope']),
      { v2Enabled: true, serviceEnforced: false },
    );
    expect(r.allowed).toBe(false);
  });
});
