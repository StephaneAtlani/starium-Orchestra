import { evaluateReadRbacIntent } from './access-decision.read-intent';

describe('evaluateReadRbacIntent', () => {
  it('read_all → orgScopeRequired false', () => {
    const r = evaluateReadRbacIntent('projects', new Set(['projects.read_all']));
    expect(r.allowed).toBe(true);
    expect(r.orgScopeRequired).toBe(false);
  });

  it('projects.read direct → orgScopeRequired false', () => {
    const r = evaluateReadRbacIntent('projects', new Set(['projects.read']));
    expect(r.allowed).toBe(true);
    expect(r.orgScopeRequired).toBe(false);
  });

  it('read_scope seul → orgScopeRequired true', () => {
    const r = evaluateReadRbacIntent('projects', new Set(['projects.read_scope']));
    expect(r.allowed).toBe(true);
    expect(r.orgScopeRequired).toBe(true);
  });

  it('read_own seul → orgScopeRequired true', () => {
    const r = evaluateReadRbacIntent('projects', new Set(['projects.read_own']));
    expect(r.allowed).toBe(true);
    expect(r.orgScopeRequired).toBe(true);
  });

  it('sans permission lecture → refusé', () => {
    const r = evaluateReadRbacIntent('projects', new Set(['projects.update']));
    expect(r.allowed).toBe(false);
  });
});
