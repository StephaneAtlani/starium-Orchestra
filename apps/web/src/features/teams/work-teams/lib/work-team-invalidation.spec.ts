import { describe, expect, it } from 'vitest';
import { workTeamQueryKeys } from './work-team-query-keys';

/**
 * Contrat : les mutations invalident au minimum le préfixe `workTeamQueryKeys.all`
 * pour éviter les données d’équipe obsolètes après changement de client ou de périmètre.
 */
describe('invalidation croisée (contrat query keys)', () => {
  it('namespace all est le préfixe commun pour invalider tout le feature work-teams', () => {
    expect(workTeamQueryKeys.all).toEqual(['teams', 'work-teams']);
  });

  it('les clés membres sont scopées par client et teamId', () => {
    const k = workTeamQueryKeys.members('c1', 't1', {});
    expect(k).toContain('c1');
    expect(k).toContain('t1');
    expect(k).toContain('members');
  });

  it('preview scopes est isolé par manager et params', () => {
    const a = workTeamQueryKeys.managerScopePreview('c1', 'm1', { offset: 0 });
    const b = workTeamQueryKeys.managerScopePreview('c1', 'm1', { offset: 20 });
    expect(a).not.toEqual(b);
  });
});
