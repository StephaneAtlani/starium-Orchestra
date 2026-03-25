import type { AuthFetch } from '@/features/budgets/api/budget-management.api';
import { parseApiFormError } from '@/features/budgets/api/budget-management.api';

export type MicrosoftTeamOption = {
  teamId: string;
  teamName: string;
};

export type MicrosoftChannelOption = {
  channelId: string;
  channelName: string;
};

export type MicrosoftPlannerPlanOption = {
  plannerPlanId: string;
  plannerPlanTitle: string;
};

type ItemsResponse<T> = {
  items: T[];
};

const BASE = '/api/microsoft';

export async function listMicrosoftTeams(
  authFetch: AuthFetch,
): Promise<ItemsResponse<MicrosoftTeamOption>> {
  const res = await authFetch(`${BASE}/teams`);
  if (!res.ok) throw await parseApiFormError(res);
  const data = (await res.json()) as ItemsResponse<MicrosoftTeamOption>;
  return data;
}

export async function listMicrosoftChannels(
  authFetch: AuthFetch,
  teamId: string,
): Promise<ItemsResponse<MicrosoftChannelOption>> {
  const res = await authFetch(`${BASE}/teams/${teamId}/channels`);
  if (!res.ok) throw await parseApiFormError(res);
  const data = (await res.json()) as ItemsResponse<MicrosoftChannelOption>;
  return data;
}

export async function listMicrosoftPlansForTeam(
  authFetch: AuthFetch,
  teamId: string,
): Promise<ItemsResponse<MicrosoftPlannerPlanOption>> {
  const res = await authFetch(`${BASE}/teams/${teamId}/plans`);
  if (!res.ok) throw await parseApiFormError(res);
  const data = (await res.json()) as ItemsResponse<MicrosoftPlannerPlanOption>;
  return data;
}

