export type ProcedureStatusApi =
  | 'DRAFT'
  | 'IN_REVIEW'
  | 'PUBLISHED'
  | 'ARCHIVED';

export type ProcedureCategoryApi =
  | 'PILOTAGE'
  | 'COMPLIANCE'
  | 'FINANCE'
  | 'ORGANISATION'
  | 'SECURITY';

export type ProcedureListItem = {
  id: string;
  code: string;
  title: string;
  description: string | null;
  category: ProcedureCategoryApi;
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
  category: ProcedureCategoryApi;
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
  category?: ProcedureCategoryApi;
  ownerUserId?: string;
};

export type TransitionProcedureInput = {
  to: 'DRAFT' | 'IN_REVIEW' | 'PUBLISHED';
  changeSummary?: string;
  expectedUpdatedAt?: string;
};
