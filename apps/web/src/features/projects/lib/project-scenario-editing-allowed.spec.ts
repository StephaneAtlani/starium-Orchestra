import { describe, expect, it } from 'vitest';
import { isProjectScenarioEditingAllowed } from './project-scenario-editing-allowed';

describe('isProjectScenarioEditingAllowed', () => {
  it('autorise uniquement DRAFT', () => {
    expect(isProjectScenarioEditingAllowed({ status: 'DRAFT' })).toBe(true);
    expect(isProjectScenarioEditingAllowed({ status: 'IN_PROGRESS' })).toBe(false);
    expect(isProjectScenarioEditingAllowed({ status: 'PLANNED' })).toBe(false);
  });
});
