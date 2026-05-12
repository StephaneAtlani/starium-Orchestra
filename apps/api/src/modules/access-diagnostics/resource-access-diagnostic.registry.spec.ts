import {
  RESOURCE_ACCESS_DIAGNOSTIC_REGISTRY,
  resolveRbacCodesForIntent,
} from './resource-access-diagnostic.registry';

describe('RESOURCE_ACCESS_DIAGNOSTIC_REGISTRY (RFC-ACL-014 §1)', () => {
  it('expose PROJECT aligné diagnostics / seed', () => {
    const e = RESOURCE_ACCESS_DIAGNOSTIC_REGISTRY.PROJECT;
    expect(e.moduleCode).toBe('projects');
    expect(e.intents.READ).toEqual(['projects.read']);
    expect(e.intents.WRITE).toEqual(['projects.update']);
    expect(e.intents.ADMIN).toEqual(['projects.delete']);
  });

  it('BUDGET ADMIN fallback WRITE', () => {
    const e = RESOURCE_ACCESS_DIAGNOSTIC_REGISTRY.BUDGET;
    expect(resolveRbacCodesForIntent(e, 'ADMIN')).toEqual(['budgets.update']);
  });

  it('SUPPLIER ADMIN fallback WRITE', () => {
    const e = RESOURCE_ACCESS_DIAGNOSTIC_REGISTRY.SUPPLIER;
    expect(resolveRbacCodesForIntent(e, 'ADMIN')).toEqual(['procurement.update']);
  });
});
