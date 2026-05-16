import { evaluateWriteRbacIntent } from './access-decision.write-intent';

describe('evaluateWriteRbacIntent — intent=write', () => {
  it('legacy `*.update` → ALL (orgScopeRequired=false)', () => {
    const r = evaluateWriteRbacIntent(
      'projects',
      new Set(['projects.update']),
      'write',
    );
    expect(r.allowed).toBe(true);
    expect(r.orgScopeRequired).toBe(false);
    expect(r.matchedPermission).toBe('projects.update');
  });

  it('`manage_all` → ALL (orgScopeRequired=false), prime sur write_scope', () => {
    const r = evaluateWriteRbacIntent(
      'projects',
      new Set(['projects.manage_all', 'projects.write_scope']),
      'write',
    );
    expect(r.allowed).toBe(true);
    expect(r.orgScopeRequired).toBe(false);
    expect(r.matchedPermission).toBe('projects.manage_all');
  });

  it('`write_scope` seul → SCOPE requis sur module scopé', () => {
    const r = evaluateWriteRbacIntent(
      'projects',
      new Set(['projects.write_scope']),
      'write',
    );
    expect(r.allowed).toBe(true);
    expect(r.orgScopeRequired).toBe(true);
    expect(r.matchedPermission).toBe('projects.write_scope');
  });

  it('aucun code → refus RBAC', () => {
    const r = evaluateWriteRbacIntent(
      'projects',
      new Set(['projects.read']),
      'write',
    );
    expect(r.allowed).toBe(false);
    expect(r.matchedPermission).toBeUndefined();
  });
});

describe('evaluateWriteRbacIntent — intent=admin', () => {
  it('`manage_all` → ALL (orgScopeRequired=false)', () => {
    const r = evaluateWriteRbacIntent(
      'projects',
      new Set(['projects.manage_all']),
      'admin',
    );
    expect(r.allowed).toBe(true);
    expect(r.orgScopeRequired).toBe(false);
    expect(r.matchedPermission).toBe('projects.manage_all');
  });

  it('legacy `*.delete` → ALL pour MANAGE_ALL_IMPLIES_DELETE_MODULES (projects)', () => {
    const r = evaluateWriteRbacIntent(
      'projects',
      new Set(['projects.delete']),
      'admin',
    );
    expect(r.allowed).toBe(true);
    expect(r.matchedPermission).toBe('projects.delete');
  });

  it('legacy `*.delete` → ALL pour contracts (MANAGE_ALL_IMPLIES_DELETE_MODULES)', () => {
    const r = evaluateWriteRbacIntent(
      'contracts',
      new Set(['contracts.delete']),
      'admin',
    );
    expect(r.allowed).toBe(true);
    expect(r.matchedPermission).toBe('contracts.delete');
  });

  it('`write_scope` ne satisfait pas l’intent admin', () => {
    const r = evaluateWriteRbacIntent(
      'projects',
      new Set(['projects.write_scope']),
      'admin',
    );
    expect(r.allowed).toBe(false);
  });

  it('legacy `*.delete` pour module hors whitelist → refus admin', () => {
    const r = evaluateWriteRbacIntent(
      'budgets',
      new Set(['budgets.delete']),
      'admin',
    );
    expect(r.allowed).toBe(false);
  });

  it('module budgets sans manage_all → refus admin (pas de admin_scope V1)', () => {
    const r = evaluateWriteRbacIntent(
      'budgets',
      new Set(['budgets.update']),
      'admin',
    );
    expect(r.allowed).toBe(false);
  });
});
