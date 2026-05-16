'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import {
  listAccessModelIssues,
  type AccessModelIssueCategory,
} from '../api/access-model.api';
import { accessModelKeys } from '../query-keys';

export function useAccessModelIssues(params: {
  category: AccessModelIssueCategory;
  page: number;
  module?: string;
  search?: string;
}) {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();

  return useQuery({
    queryKey: accessModelKeys.issues(params),
    queryFn: () =>
      listAccessModelIssues(authFetch, {
        category: params.category,
        page: params.page,
        limit: 25,
        module: params.module,
        search: params.search,
      }),
    enabled: !!activeClient?.id,
    placeholderData: (prev) => prev,
  });
}
