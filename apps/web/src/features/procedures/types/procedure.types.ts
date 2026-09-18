export type ProcedureStatusApi = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
export type ProcedureCategoryApi =
  | 'SECURITY'
  | 'OPERATIONS'
  | 'HR'
  | 'IT_SERVICE'
  | 'COMPLIANCE'
  | 'OTHER';

export type ProcedureListItem = {
  id: string;
  code: string;
  title: string;
  description: string | null;
  category: ProcedureCategoryApi;
  status: ProcedureStatusApi;
  ownerLabel: string | null;
  publishedVersionNumber: number | null;
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
