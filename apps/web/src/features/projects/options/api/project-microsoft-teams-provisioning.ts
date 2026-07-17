import type { AuthFetch } from '@/features/budgets/api/budget-management.api';
import { parseApiFormError } from '@/features/budgets/api/budget-management.api';
import type {
  ProjectMicrosoftTeamsProvisioningDto,
  ResolveProjectMicrosoftTeamsProvisioningPayload,
} from '../types/project-options.types';

const BASE = '/api/projects';

export async function getProjectMicrosoftTeamsProvisioning(
  authFetch: AuthFetch,
  projectId: string,
): Promise<ProjectMicrosoftTeamsProvisioningDto | null> {
  const res = await authFetch(`${BASE}/${projectId}/microsoft-teams/provision`);
  if (res.status === 404) return null;
  if (!res.ok) throw await parseApiFormError(res);
  const text = await res.text();
  if (!text.trim()) return null;
  return JSON.parse(text) as ProjectMicrosoftTeamsProvisioningDto;
}

export async function startProjectMicrosoftTeamsProvisioning(
  authFetch: AuthFetch,
  projectId: string,
): Promise<ProjectMicrosoftTeamsProvisioningDto> {
  const res = await authFetch(`${BASE}/${projectId}/microsoft-teams/provision`, {
    method: 'POST',
  });
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<ProjectMicrosoftTeamsProvisioningDto>;
}

export async function retryProjectMicrosoftTeamsProvisioning(
  authFetch: AuthFetch,
  projectId: string,
  provisioningId: string,
): Promise<ProjectMicrosoftTeamsProvisioningDto> {
  const res = await authFetch(
    `${BASE}/${projectId}/microsoft-teams/provision/${provisioningId}/retry`,
    { method: 'POST' },
  );
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<ProjectMicrosoftTeamsProvisioningDto>;
}

export async function resolveProjectMicrosoftTeamsProvisioning(
  authFetch: AuthFetch,
  projectId: string,
  provisioningId: string,
  body: ResolveProjectMicrosoftTeamsProvisioningPayload,
): Promise<ProjectMicrosoftTeamsProvisioningDto> {
  const res = await authFetch(
    `${BASE}/${projectId}/microsoft-teams/provision/${provisioningId}/resolve-unknown`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    },
  );
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<ProjectMicrosoftTeamsProvisioningDto>;
}
