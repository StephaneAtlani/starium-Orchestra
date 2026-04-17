import type { QueryClient } from '@tanstack/react-query';
import { projectQueryKeys } from '../lib/project-query-keys';

/** Après mutation sur une dimension scénario : détail scénario + listes + portefeuille scénarios. */
export async function invalidateScenarioWorkspaceCaches(
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
      queryKey: projectQueryKeys.scenarioFinancialLines(clientId, projectId, scenarioId),
    }),
    queryClient.invalidateQueries({
      queryKey: projectQueryKeys.scenarioResourcePlans(clientId, projectId, scenarioId),
    }),
    queryClient.invalidateQueries({
      queryKey: projectQueryKeys.scenarioScenarioTasks(clientId, projectId, scenarioId),
    }),
    queryClient.invalidateQueries({
      queryKey: projectQueryKeys.scenarioCapacitySnapshots(clientId, projectId, scenarioId),
    }),
    queryClient.invalidateQueries({
      queryKey: projectQueryKeys.scenarioCapacitySummary(clientId, projectId, scenarioId),
    }),
    queryClient.invalidateQueries({
      queryKey: projectQueryKeys.scenarioRisks(clientId, projectId, scenarioId),
    }),
    queryClient.invalidateQueries({
      queryKey: projectQueryKeys.detail(clientId, projectId),
    }),
  ]);
}
