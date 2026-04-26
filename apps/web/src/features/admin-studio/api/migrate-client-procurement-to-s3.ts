export type AuthFetch = (
  input: RequestInfo,
  init?: RequestInit,
) => Promise<Response>;

export async function migrateClientProcurementDocumentsToS3(
  authFetch: AuthFetch,
  clientId: string,
): Promise<{ migratedCount: number }> {
  const res = await authFetch(
    `/api/clients/${encodeURIComponent(clientId)}/migrate-procurement-documents-to-s3`,
    { method: 'POST' },
  );
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as {
      message?: string | string[];
    };
    const msg = Array.isArray(data.message)
      ? data.message.join(', ')
      : data.message;
    throw new Error(msg || `Migration impossible (${res.status})`);
  }
  return (await res.json()) as { migratedCount: number };
}
