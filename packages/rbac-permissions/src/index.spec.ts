import { describe, expect, it } from 'vitest';
import {
  expandForLegacyGuards,
  expandForUi,
  satisfiesPermission,
  uiPermissionHintsArray,
} from './index';

describe('satisfiesPermission', () => {
  it('read_scope ne satisfait pas budgets.read', () => {
    expect(satisfiesPermission(new Set(['budgets.read_scope']), 'budgets.read')).toBe(
      false,
    );
  });

  it('read_own ne satisfait pas budgets.read', () => {
    expect(satisfiesPermission(new Set(['budgets.read_own']), 'budgets.read')).toBe(
      false,
    );
  });

  it('read_all satisfait budgets.read', () => {
    expect(satisfiesPermission(new Set(['budgets.read_all']), 'budgets.read')).toBe(
      true,
    );
  });

  it('legacy budgets.read satisfait budgets.read', () => {
    expect(satisfiesPermission(new Set(['budgets.read']), 'budgets.read')).toBe(true);
  });

  it('manage_all satisfait projects.delete', () => {
    expect(satisfiesPermission(new Set(['projects.manage_all']), 'projects.delete')).toBe(
      true,
    );
  });

  it('write_scope ne satisfait pas projects.update', () => {
    expect(
      satisfiesPermission(new Set(['projects.write_scope']), 'projects.update'),
    ).toBe(false);
  });

  it('manage_all ne satisfait pas procurement.update (non mappé)', () => {
    expect(
      satisfiesPermission(new Set(['procurement.manage_all']), 'procurement.update'),
    ).toBe(false);
  });
});

describe('expandForUi', () => {
  it('n’ajoute pas legacy *.read (hints ≠ autorisation guard)', () => {
    const raw = new Set(['budgets.read_all']);
    const hints = uiPermissionHintsArray([...raw]);
    expect(hints).toContain('budgets.read_scope');
    expect(hints).toContain('budgets.read_own');
    expect(satisfiesPermission(new Set(raw), 'budgets.read')).toBe(true);
    // Un set « hints only » sans read_all ne doit pas ouvrir legacy read
    expect(satisfiesPermission(new Set(hints), 'budgets.read')).toBe(false);
  });
});

describe('expandForLegacyGuards', () => {
  it('ajoute legacy read si read_all', () => {
    const g = expandForLegacyGuards(new Set(['budgets.read_all']));
    expect(g.has('budgets.read')).toBe(true);
    expect(g.has('budgets.read_all')).toBe(true);
  });
});
