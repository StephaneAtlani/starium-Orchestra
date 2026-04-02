import type {
  CreateSkillPayload,
  Paginated,
  SkillCollaboratorListItem,
  SkillCollaboratorsListParams,
  SkillListItem,
  SkillOption,
  SkillsListParams,
  UpdateSkillPayload,
} from '../types/skill.types';

type AuthFetch = (input: RequestInfo, init?: RequestInit) => Promise<Response>;

export type ApiFormError = Error & { status?: number };

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const raw = (body as { message?: string | string[] })?.message;
    const message = Array.isArray(raw) ? raw.join(', ') : (raw ?? 'Erreur lors de la requête');
    const error = new Error(message) as ApiFormError;
    error.status = res.status;
    throw error;
  }
  return res.json() as Promise<T>;
}

function appendEnumList(
  search: URLSearchParams,
  key: string,
  values: string[] | undefined,
) {
  if (!values?.length) return;
  for (const v of values) {
    search.append(key, v);
  }
}

function skillsListQuery(params: SkillsListParams): string {
  const search = new URLSearchParams();
  if (params.search?.trim()) search.set('search', params.search.trim());
  if (params.categoryId) search.set('categoryId', params.categoryId);
  appendEnumList(search, 'status', params.status);
  appendEnumList(search, 'referenceLevel', params.referenceLevel);
  if (params.includeArchived === true) search.set('includeArchived', 'true');
  if (typeof params.offset === 'number') search.set('offset', String(params.offset));
  if (typeof params.limit === 'number') search.set('limit', String(params.limit));
  if (params.sortBy) search.set('sortBy', params.sortBy);
  if (params.sortOrder) search.set('sortOrder', params.sortOrder);
  const q = search.toString();
  return q ? `?${q}` : '';
}

function skillCollaboratorsQuery(params: SkillCollaboratorsListParams): string {
  const search = new URLSearchParams();
  if (params.search?.trim()) search.set('search', params.search.trim());
  appendEnumList(search, 'level', params.level);
  if (params.validated === true) search.set('validated', 'true');
  if (params.validated === false) search.set('validated', 'false');
  if (params.includeArchived === true) search.set('includeArchived', 'true');
  if (typeof params.offset === 'number') search.set('offset', String(params.offset));
  if (typeof params.limit === 'number') search.set('limit', String(params.limit));
  if (params.sortBy) search.set('sortBy', params.sortBy);
  if (params.sortOrder) search.set('sortOrder', params.sortOrder);
  const q = search.toString();
  return q ? `?${q}` : '';
}

export async function listSkills(
  authFetch: AuthFetch,
  params: SkillsListParams,
): Promise<Paginated<SkillListItem>> {
  const res = await authFetch(`/api/skills${skillsListQuery(params)}`);
  return handleResponse<Paginated<SkillListItem>>(res);
}

export async function getSkillById(
  authFetch: AuthFetch,
  skillId: string,
): Promise<SkillListItem> {
  const res = await authFetch(`/api/skills/${skillId}`);
  return handleResponse<SkillListItem>(res);
}

export async function createSkill(
  authFetch: AuthFetch,
  payload: CreateSkillPayload,
): Promise<SkillListItem> {
  const res = await authFetch('/api/skills', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return handleResponse<SkillListItem>(res);
}

export async function updateSkill(
  authFetch: AuthFetch,
  skillId: string,
  payload: UpdateSkillPayload,
): Promise<SkillListItem> {
  const res = await authFetch(`/api/skills/${skillId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return handleResponse<SkillListItem>(res);
}

export async function archiveSkill(
  authFetch: AuthFetch,
  skillId: string,
): Promise<SkillListItem> {
  const res = await authFetch(`/api/skills/${skillId}/archive`, {
    method: 'PATCH',
  });
  return handleResponse<SkillListItem>(res);
}

export async function restoreSkill(
  authFetch: AuthFetch,
  skillId: string,
): Promise<SkillListItem> {
  const res = await authFetch(`/api/skills/${skillId}/restore`, {
    method: 'PATCH',
  });
  return handleResponse<SkillListItem>(res);
}

export async function listSkillOptions(
  authFetch: AuthFetch,
  params: { search?: string; offset?: number; limit?: number } = {},
): Promise<Paginated<SkillOption>> {
  const search = new URLSearchParams();
  if (params.search?.trim()) search.set('search', params.search.trim());
  if (typeof params.offset === 'number') search.set('offset', String(params.offset));
  if (typeof params.limit === 'number') search.set('limit', String(params.limit));
  const q = search.toString();
  const res = await authFetch(`/api/skills/options${q ? `?${q}` : ''}`);
  return handleResponse<Paginated<SkillOption>>(res);
}

export async function listCollaboratorsForSkill(
  authFetch: AuthFetch,
  skillId: string,
  params: SkillCollaboratorsListParams = {},
): Promise<Paginated<SkillCollaboratorListItem>> {
  const res = await authFetch(
    `/api/skills/${skillId}/collaborators${skillCollaboratorsQuery(params)}`,
  );
  return handleResponse<Paginated<SkillCollaboratorListItem>>(res);
}
