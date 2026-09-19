export type ProcedureStatusApi =
  | 'DRAFT'
  | 'IN_REVIEW'
  | 'PENDING_VALIDATION'
  | 'PUBLISHED'
  | 'ARCHIVED';

export type ProcedureBumpType = 'MINOR' | 'MAJOR';

export type ProcedureCategoryRef = {
  id: string;
  code: string;
  label: string;
};

export type ProcedureCategoryItem = ProcedureCategoryRef & {
  sortOrder: number;
  isActive: boolean;
  updatedAt: string;
};

export type ProcedurePublishedVersionSummary = {
  id: string;
  versionLabel: string | null;
  versionMajor: number | null;
  versionMinor: number | null;
  bumpType: ProcedureBumpType | null;
  isMajor: boolean;
  isCurrent: boolean;
  changeSummary: string | null;
  publishedAt: string | null;
  title: string;
  publishedByLabel?: string | null;
};

export type ProcedureListItem = {
  id: string;
  code: string | null;
  title: string;
  description: string | null;
  categoryId: string;
  category: ProcedureCategoryRef;
  status: ProcedureStatusApi;
  ownerLabel: string | null;
  publishedVersionLabel: string | null;
  publishedVersionMajor: number | null;
  publishedVersionMinor: number | null;
  blockCount?: number;
  publishedAt: string | null;
  updatedAt: string;
};

export type ProcedureDetail = {
  id: string;
  code: string | null;
  title: string;
  description: string | null;
  categoryId: string;
  category: ProcedureCategoryRef;
  status: ProcedureStatusApi;
  ownerUserId: string | null;
  ownerLabel: string | null;
  currentDraftVersionId: string | null;
  currentPublishedVersionId: string | null;
  sourceTemplateId?: string | null;
  sourceTemplateName?: string | null;
  /** Libellé affiché : nom live du modèle si dispo, sinon snapshot. */
  sourceTemplateLabel?: string | null;
  createdAt: string;
  updatedAt: string;
  publishedVersion: ProcedurePublishedVersionSummary | null;
  currentDraft: {
    id: string;
    lifecycle: 'DRAFT' | 'PUBLISHED';
    title: string;
    contentJson?: Record<string, unknown>;
    updatedAt: string;
  } | null;
};

export type ProcedureVersionListItem = {
  id: string;
  versionLabel: string | null;
  versionMajor: number | null;
  versionMinor: number | null;
  bumpType: ProcedureBumpType | null;
  isMajor: boolean;
  isCurrent: boolean;
  changeSummary: string | null;
  publishedAt: string | null;
  publishedByLabel: string | null;
  title: string;
};

export type ProcedureListResponse = {
  items: ProcedureListItem[];
  total: number;
  limit: number;
  offset: number;
};

export type CreateProcedureInput = {
  code?: string;
  title: string;
  description?: string;
  categoryId?: string;
  ownerUserId?: string;
  templateId?: string;
};

export type TransitionProcedureInput = {
  to: 'DRAFT' | 'IN_REVIEW' | 'PENDING_VALIDATION' | 'PUBLISHED';
  bumpType?: ProcedureBumpType;
  changeSummary?: string;
  expectedUpdatedAt?: string;
};

export type ProcedureTemplateStatusApi = 'DRAFT' | 'ACTIVE' | 'ARCHIVED';

export type ProcedureTemplateOutlineItem = {
  level: 1 | 2 | 3;
  title: string;
};

export type ProcedureTemplate = {
  id: string;
  name: string;
  status: ProcedureTemplateStatusApi;
  categoryId: string | null;
  category: ProcedureCategoryRef | null;
  outline: ProcedureTemplateOutlineItem[];
  hierarchyWarnings: string[];
  createdAt: string;
  updatedAt: string;
};

export type CreateProcedureTemplateInput = {
  name: string;
  categoryId?: string | null;
  outline?: ProcedureTemplateOutlineItem[];
};

export type UpdateProcedureTemplateInput = {
  name?: string;
  categoryId?: string | null;
  outline?: ProcedureTemplateOutlineItem[];
};
