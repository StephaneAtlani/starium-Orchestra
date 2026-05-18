import { toMissingOwnerIssue } from './access-model.helpers';
import type { AccessModelIssueItem } from './access-model.types';

describe('AccessModelIssueItem builders — resourceId obligatoire', () => {
  it('toMissingOwnerIssue renseigne resourceId (= PK ressource)', () => {
    const item = toMissingOwnerIssue({
      id: 'budget-line-42',
      resourceType: 'BUDGET_LINE',
      module: 'budgets',
      label: 'Ligne X',
      budgetId: 'budget-1',
      ownerOrgUnitSource: 'self',
    });
    expect(item.resourceId).toBe('budget-line-42');
    expect(item.id).toBe('budget-line-42');
  });

  it('atypical_acl : id composite ≠ resourceId métier', () => {
    const item: AccessModelIssueItem = {
      id: 'PROJECT:proj-uuid-1:USER:u1:WRITE',
      resourceId: 'proj-uuid-1',
      category: 'atypical_acl',
      resourceType: 'PROJECT',
      module: 'projects',
      label: 'Projet',
      severity: 'warning',
      correctiveAction: { kind: 'link', href: '/projects/proj-uuid-1', label: 'Ouvrir' },
    };
    expect(item.resourceId).toBe('proj-uuid-1');
    expect(item.id).not.toBe(item.resourceId);
  });

  it('policy_review : id composite ≠ resourceId métier', () => {
    const item: AccessModelIssueItem = {
      id: 'PROJECT:proj-abc:RESTRICTIVE',
      resourceId: 'proj-abc',
      category: 'policy_review',
      resourceType: 'PROJECT',
      module: 'projects',
      label: 'Projet',
      severity: 'warning',
      correctiveAction: { kind: 'link', href: '/projects/proj-abc', label: 'Ouvrir' },
    };
    expect(item.resourceId).toBe('proj-abc');
    expect(item.id).toContain('proj-abc');
    expect(item.id).not.toBe(item.resourceId);
  });

  it('missing_human : resourceId = userId membre', () => {
    const item: AccessModelIssueItem = {
      id: 'user-member-1',
      resourceId: 'user-member-1',
      category: 'missing_human',
      module: 'organization',
      label: 'Dupont — dupont@acme.fr',
      severity: 'warning',
      correctiveAction: {
        kind: 'link',
        href: '/client/members?edit=user-member-1',
        label: 'Modifier le membre',
      },
    };
    expect(item.resourceId).toBe('user-member-1');
  });
});
