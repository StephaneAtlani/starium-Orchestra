import { describe, expect, it } from 'vitest';
import {
  canEditCycleContent,
  getCycleWorkflowActions,
} from './governance-cycle-workflow';

describe('governance-cycle-workflow', () => {
  it('propose désarchiver pour ARCHIVED', () => {
    const actions = getCycleWorkflowActions('ARCHIVED');
    expect(actions.map((a) => a.id)).toEqual(['restore']);
    expect(canEditCycleContent('ARCHIVED')).toBe(false);
  });

  it('propose clôturer et archiver pour TO_ARBITRATE', () => {
    const ids = getCycleWorkflowActions('TO_ARBITRATE').map((a) => a.id);
    expect(ids).toContain('close');
    expect(ids).toContain('archive');
  });

  it('propose rouvrir pour CLOSED', () => {
    const ids = getCycleWorkflowActions('CLOSED').map((a) => a.id);
    expect(ids).toContain('reopen_execution');
    expect(ids).toContain('reopen_arbitration');
  });
});
