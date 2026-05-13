import { readApiErrorMessageFromResponse } from '@/lib/read-api-error-message';

export type MyEffectiveRightsIntent = 'READ' | 'WRITE' | 'ADMIN';

export type MyEffectiveRightsPayload = {
  finalDecision: 'ALLOWED' | 'DENIED' | 'UNSAFE_CONTEXT';
  reasonCode: string | null;
  resourceLabel: string | null;
  controls: Array<{
    id: string;
    status: 'pass' | 'fail' | 'not_applicable';
    reasonCode: string | null;
    message: string;
    enforcedForIntent?: boolean;
    evaluationMode?: 'enforced' | 'informational' | 'superseded_by_decision_engine';
  }>;
  safeMessage: string;
  computedAt: string;
};

/** GET /api/access-diagnostics/effective-rights/me — lazy (ouvrir popover / panneau 403 uniquement). */
export async function getMyEffectiveRights(
  authenticatedFetch: (
    input: RequestInfo,
    init?: RequestInit,
  ) => Promise<Response>,
  params: {
    resourceType: string;
    resourceId: string;
    intent: MyEffectiveRightsIntent;
  },
): Promise<MyEffectiveRightsPayload> {
  const qs = new URLSearchParams({
    intent: params.intent,
    resourceType: params.resourceType,
    resourceId: params.resourceId,
  });
  const res = await authenticatedFetch(
    `/api/access-diagnostics/effective-rights/me?${qs.toString()}`,
  );
  if (!res.ok) {
    throw new Error(await readApiErrorMessageFromResponse(res));
  }
  return (await res.json()) as MyEffectiveRightsPayload;
}
