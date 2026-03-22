export interface QuickCreatePermissionError {
  status: number;
  message: string;
}

export type QuickCreateRequestResult =
  | { ok: true; name: string }
  | { ok: false; error: QuickCreatePermissionError | null };

export function prepareQuickCreateRequest(
  draftName: string,
  canCreateProcurement: boolean,
): QuickCreateRequestResult {
  const name = draftName.trim();

  if (!canCreateProcurement) {
    return {
      ok: false,
      error: {
        status: 403,
        message: "Tu n'as pas la permission 'procurement.create' pour créer un fournisseur.",
      },
    };
  }

  if (!name) {
    return { ok: false, error: null };
  }

  return { ok: true, name };
}

