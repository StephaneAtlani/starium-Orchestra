import type { QueryClient } from '@tanstack/react-query';
import { projectQueryKeys } from '../lib/project-query-keys';

/** Invalidations minimales après mise à jour d’un scénario (RFC-FE-PROJ-SC-003 §8). */
export async function invalidateAfterScenarioUpdate(
  queryClient: QueryClient,
  clientId: string,
  projectId: string,
  scenarioId: string,
): Promise<void> {
  await Promise.all([
    queryClient.invalidateQueries({
      queryKey: projectQueryKeys.scenarioDetail(clientId, projectId, scenarioId),
    }),
    queryClient.invalidateQueries({
      queryKey: projectQueryKeys.scenarios(clientId, projectId),
    }),
    queryClient.invalidateQueries({
      queryKey: projectQueryKeys.detail(clientId, projectId),
    }),
  ]);
}
