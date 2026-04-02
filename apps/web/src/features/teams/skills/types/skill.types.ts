/** Aligné Prisma / API backend (RFC-TEAM-003). */
export type SkillStatus = 'ACTIVE' | 'DRAFT' | 'ARCHIVED';

export type SkillReferenceLevel = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT';

export type Paginated<T> = {
  items: T[];
  total: number;
  limit: number;
  offset: number;
};

export type SkillListItem = {
  id: string;
  clientId: string;
  categoryId: string;
  categoryName: string;
  name: string;
  description: string | null;
  status: SkillStatus;
  referenceLevel: SkillReferenceLevel;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type SkillCategoryListItem = {
  id: string;
  clientId: string;
  name: string;
  description: string | null;
  sortOrder: number;
  skillCount: number;
  createdAt: string;
  updatedAt: string;
};

export type SkillCategoryOption = {
  id: string;
  name: string;
};

export type SkillOption = {
  id: string;
  name: string;
  categoryName: string;
};

export type SkillsListParams = {
  search?: string;
  categoryId?: string;
  status?: SkillStatus[];
  referenceLevel?: SkillReferenceLevel[];
  includeArchived?: boolean;
  offset?: number;
  limit?: number;
  sortBy?: 'name' | 'createdAt' | 'updatedAt' | 'referenceLevel';
  sortOrder?: 'asc' | 'desc';
};

export type SkillCategoriesListParams = {
  search?: string;
  offset?: number;
  limit?: number;
  sortBy?: 'name' | 'sortOrder' | 'createdAt' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
};

export type CreateSkillPayload = {
  name: string;
  description?: string;
  categoryId: string;
  referenceLevel?: SkillReferenceLevel;
  status?: Extract<SkillStatus, 'DRAFT' | 'ACTIVE'>;
};

export type UpdateSkillPayload = {
  name?: string;
  description?: string;
  categoryId?: string;
  referenceLevel?: SkillReferenceLevel;
};

export type CreateSkillCategoryPayload = {
  name: string;
  description?: string;
  sortOrder?: number;
};

export type UpdateSkillCategoryPayload = {
  name?: string;
  description?: string;
  sortOrder?: number;
};

export type SkillCollaboratorListItem = {
  id: string;
  collaboratorId: string;
  collaboratorDisplayName: string;
  collaboratorJobTitle: string | null;
  collaboratorStatus: string;
  level: SkillReferenceLevel;
  source: string;
  reviewedAt: string | null;
  validatedAt: string | null;
  validatedByName: string | null;
};

export type SkillCollaboratorsListParams = {
  search?: string;
  level?: SkillReferenceLevel[];
  validated?: boolean;
  includeArchived?: boolean;
  offset?: number;
  limit?: number;
  sortBy?: 'collaboratorName' | 'level' | 'validatedAt';
  sortOrder?: 'asc' | 'desc';
};
