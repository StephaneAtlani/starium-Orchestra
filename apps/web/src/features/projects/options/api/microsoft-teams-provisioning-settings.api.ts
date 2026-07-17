import type { AuthFetch } from '@/features/budgets/api/budget-management.api';
import { parseApiFormError } from '@/features/budgets/api/budget-management.api';
import type {
  CreateTeamsChannelTemplatePayload,
  ProjectMicrosoftTeamsChannelTemplateDto,
  ProjectMicrosoftTeamsProvisioningSettingsDto,
  ReorderTeamsChannelTemplatesPayload,
  UpdateTeamsChannelTemplatePayload,
  UpdateTeamsProvisioningSettingsPayload,
} from '../types/project-options.types';

export async function getMicrosoftTeamsProvisioningSettings(
  authFetch: AuthFetch,
): Promise<ProjectMicrosoftTeamsProvisioningSettingsDto> {
  const res = await authFetch('/api/projects/options/microsoft-teams-provisioning');
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<ProjectMicrosoftTeamsProvisioningSettingsDto>;
}

export async function updateMicrosoftTeamsProvisioningSettings(
  authFetch: AuthFetch,
  body: UpdateTeamsProvisioningSettingsPayload,
): Promise<ProjectMicrosoftTeamsProvisioningSettingsDto> {
  const res = await authFetch('/api/projects/options/microsoft-teams-provisioning', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<ProjectMicrosoftTeamsProvisioningSettingsDto>;
}

export async function listMicrosoftTeamsChannelTemplates(
  authFetch: AuthFetch,
): Promise<{ items: ProjectMicrosoftTeamsChannelTemplateDto[] }> {
  const res = await authFetch('/api/projects/options/microsoft-teams-channels');
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<{ items: ProjectMicrosoftTeamsChannelTemplateDto[] }>;
}

export async function createMicrosoftTeamsChannelTemplate(
  authFetch: AuthFetch,
  body: CreateTeamsChannelTemplatePayload,
): Promise<ProjectMicrosoftTeamsChannelTemplateDto> {
  const res = await authFetch('/api/projects/options/microsoft-teams-channels', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<ProjectMicrosoftTeamsChannelTemplateDto>;
}

export async function updateMicrosoftTeamsChannelTemplate(
  authFetch: AuthFetch,
  id: string,
  body: UpdateTeamsChannelTemplatePayload,
): Promise<ProjectMicrosoftTeamsChannelTemplateDto> {
  const res = await authFetch(`/api/projects/options/microsoft-teams-channels/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<ProjectMicrosoftTeamsChannelTemplateDto>;
}

export async function deleteMicrosoftTeamsChannelTemplate(
  authFetch: AuthFetch,
  id: string,
): Promise<void> {
  const res = await authFetch(`/api/projects/options/microsoft-teams-channels/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw await parseApiFormError(res);
}

export async function reorderMicrosoftTeamsChannelTemplates(
  authFetch: AuthFetch,
  body: ReorderTeamsChannelTemplatesPayload,
): Promise<{ items: ProjectMicrosoftTeamsChannelTemplateDto[] }> {
  const res = await authFetch('/api/projects/options/microsoft-teams-channels/reorder', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<{ items: ProjectMicrosoftTeamsChannelTemplateDto[] }>;
}
