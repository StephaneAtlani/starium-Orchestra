import { describe, expect, it, vi } from 'vitest';
import type { QueryClient } from '@tanstack/react-query';
import { projectQueryKeys } from '../lib/project-query-keys';
import { invalidateAfterScenarioUpdate } from './invalidate-after-scenario-update';

describe('invalidateAfterScenarioUpdate', () => {
  it('invalide scenarioDetail, liste scénarios et détail projet', async () => {
    const invalidateQueries = vi.fn().mockResolvedValue(undefined);
    const queryClient = { invalidateQueries } as unknown as QueryClient;

    await invalidateAfterScenarioUpdate(queryClient, 'client-1', 'proj-1', 'scen-1');

    expect(invalidateQueries).toHaveBeenCalledTimes(3);
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: projectQueryKeys.scenarioDetail('client-1', 'proj-1', 'scen-1'),
    });
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: projectQueryKeys.scenarios('client-1', 'proj-1'),
    });
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: projectQueryKeys.detail('client-1', 'proj-1'),
    });
  });
});
