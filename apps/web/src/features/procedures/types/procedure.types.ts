export type ProcedureStatusApi =
  | 'DRAFT'
  | 'IN_REVIEW'
  | 'PUBLISHED'
  | 'ARCHIVED';

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

export type ProcedureListItem = {
  id: string;
  code: string;
  title: string;
  description: string | null;
  categoryId: string;
  category: ProcedureCategoryRef;
  status: ProcedureStatusApi;
  ownerLabel: string | null;
  publishedVersionNumber: number | null;
  draftVersionNumber?: number | null;
  displayVersionNumber?: number | null;
  blockCount?: number;
  publishedAt: string | null;
  updatedAt: string;
};

export type ProcedureDetail = {
  id: string;
  code: string;
  title: string;
  description: string | null;
  categoryId: string;
  category: ProcedureCategoryRef;
  status: ProcedureStatusApi;
  ownerLabel: string | null;
  currentDraftVersionId: string | null;
  currentPublishedVersionId: string | null;
  createdAt: string;
  updatedAt: string;
  currentDraft: {
    id: string;
    versionNumber: number;
    lifecycle: 'DRAFT' | 'PUBLISHED';
    title: string;
    contentJson?: Record<string, unknown>;
    updatedAt: string;
  } | null;
};

export type ProcedureListResponse = {
  items: ProcedureListItem[];
  total: number;
  limit: number;
  offset: number;
};

export type CreateProcedureInput = {
  code: string;
  title: string;
  description?: string;
  categoryId?: string;
  ownerUserId?: string;
};

export type TransitionProcedureInput = {
  to: 'DRAFT' | 'IN_REVIEW' | 'PUBLISHED';
  changeSummary?: string;
  expectedUpdatedAt?: string;
};
