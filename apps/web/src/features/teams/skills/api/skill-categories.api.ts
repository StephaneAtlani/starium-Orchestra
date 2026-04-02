import type {
  CreateSkillCategoryPayload,
  Paginated,
  SkillCategoriesListParams,
  SkillCategoryListItem,
  SkillCategoryOption,
  UpdateSkillCategoryPayload,
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

function categoriesListQuery(params: SkillCategoriesListParams): string {
  const search = new URLSearchParams();
  if (params.search?.trim()) search.set('search', params.search.trim());
  if (typeof params.offset === 'number') search.set('offset', String(params.offset));
  if (typeof params.limit === 'number') search.set('limit', String(params.limit));
  if (params.sortBy) search.set('sortBy', params.sortBy);
  if (params.sortOrder) search.set('sortOrder', params.sortOrder);
  const q = search.toString();
  return q ? `?${q}` : '';
}

export async function listSkillCategories(
  authFetch: AuthFetch,
  params: SkillCategoriesListParams = {},
): Promise<Paginated<SkillCategoryListItem>> {
  const res = await authFetch(`/api/skill-categories${categoriesListQuery(params)}`);
  return handleResponse<Paginated<SkillCategoryListItem>>(res);
}

export async function listSkillCategoryOptions(
  authFetch: AuthFetch,
  params: { search?: string; offset?: number; limit?: number } = {},
): Promise<Paginated<SkillCategoryOption>> {
  const search = new URLSearchParams();
  if (params.search?.trim()) search.set('search', params.search.trim());
  if (typeof params.offset === 'number') search.set('offset', String(params.offset));
  if (typeof params.limit === 'number') search.set('limit', String(params.limit));
  const q = search.toString();
  const res = await authFetch(`/api/skill-categories/options${q ? `?${q}` : ''}`);
  return handleResponse<Paginated<SkillCategoryOption>>(res);
}

export async function getSkillCategoryById(
  authFetch: AuthFetch,
  categoryId: string,
): Promise<SkillCategoryListItem> {
  const res = await authFetch(`/api/skill-categories/${categoryId}`);
  return handleResponse<SkillCategoryListItem>(res);
}

export async function createSkillCategory(
  authFetch: AuthFetch,
  payload: CreateSkillCategoryPayload,
): Promise<SkillCategoryListItem> {
  const res = await authFetch('/api/skill-categories', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return handleResponse<SkillCategoryListItem>(res);
}

export async function updateSkillCategory(
  authFetch: AuthFetch,
  categoryId: string,
  payload: UpdateSkillCategoryPayload,
): Promise<SkillCategoryListItem> {
  const res = await authFetch(`/api/skill-categories/${categoryId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return handleResponse<SkillCategoryListItem>(res);
}

export async function deleteSkillCategory(
  authFetch: AuthFetch,
  categoryId: string,
): Promise<{ success: boolean }> {
  const res = await authFetch(`/api/skill-categories/${categoryId}`, {
    method: 'DELETE',
  });
  return handleResponse<{ success: boolean }>(res);
}
