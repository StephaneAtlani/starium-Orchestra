export interface MeProfile {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  department: string | null;
  jobTitle: string | null;
  company: string | null;
  office: string | null;
  hasAvatar: boolean;
  platformRole: 'PLATFORM_ADMIN' | null;
}

export type UpdateMyProfilePayload = {
  firstName?: string | null;
  lastName?: string | null;
  department?: string | null;
  jobTitle?: string | null;
  company?: string | null;
  office?: string | null;
};

export interface MeClient {
  id: string;
  name: string;
  slug: string;
  budgetAccountingEnabled: boolean;
  role: 'CLIENT_ADMIN' | 'CLIENT_USER';
  status: 'ACTIVE' | 'SUSPENDED' | 'INVITED';
  isDefault: boolean;
}

export async function getMe(accessToken: string): Promise<MeProfile> {
  const res = await fetch('/api/me', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  if (!res.ok) {
    throw new Error('Impossible de récupérer le profil utilisateur');
  }
  return (await res.json()) as MeProfile;
}

export async function getMyClients(
  accessToken: string,
): Promise<MeClient[]> {
  const res = await fetch('/api/me/clients', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  if (!res.ok) {
    throw new Error('Impossible de récupérer la liste des clients');
  }
  return (await res.json()) as MeClient[];
}

export interface MePermissionsResponse {
  permissionCodes: string[];
}

/** GET /me/permissions — codes de permission pour le client actif (X-Client-Id requis). */
export async function getMyPermissions(
  authenticatedFetch: (input: RequestInfo, init?: RequestInit) => Promise<Response>,
): Promise<MePermissionsResponse> {
  const res = await authenticatedFetch('/api/me/permissions');
  if (!res.ok) {
    throw new Error('Impossible de récupérer les permissions');
  }
  return (await res.json()) as MePermissionsResponse;
}

export interface SetDefaultClientResult {
  success: true;
  defaultClientId: string;
}

export async function setDefaultClient(
  accessToken: string,
  clientId: string,
): Promise<SetDefaultClientResult> {
  const res = await fetch('/api/me/default-client', {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ clientId }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || 'Impossible de définir le client par défaut');
  }
  return (await res.json()) as SetDefaultClientResult;
}

export async function changeMyPassword(
  accessToken: string,
  currentPassword: string,
  newPassword: string,
): Promise<{ success: true }> {
  const res = await fetch('/api/me/password', {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ currentPassword, newPassword }),
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as {
      message?: string | string[];
    };
    const msg = Array.isArray(data.message)
      ? data.message.join(', ')
      : data.message;
    throw new Error(msg || 'Impossible de changer le mot de passe');
  }
  return (await res.json()) as { success: true };
}

export interface TwoFactorStatus {
  enabled: boolean;
  pendingEnrollment: boolean;
}

export async function getTwoFactorStatus(
  accessToken: string,
): Promise<TwoFactorStatus> {
  const res = await fetch('/api/me/2fa', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    throw new Error('Impossible de lire le statut 2FA');
  }
  return (await res.json()) as TwoFactorStatus;
}

export interface EnrollTwoFactorResult {
  otpauthUrl: string;
  qrCodeDataUrl: string;
  secretMasked: string;
}

export async function enrollTwoFactor(
  accessToken: string,
): Promise<EnrollTwoFactorResult> {
  const res = await fetch('/api/me/2fa/enroll', {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as {
      message?: string | string[];
    };
    const msg = Array.isArray(data.message)
      ? data.message.join(', ')
      : data.message;
    throw new Error(msg || 'Impossible de démarrer l’activation 2FA');
  }
  return (await res.json()) as EnrollTwoFactorResult;
}

export async function verifyTwoFactorEnrollment(
  accessToken: string,
  otp: string,
): Promise<{ recoveryCodes: string[] }> {
  const res = await fetch('/api/me/2fa/verify-enroll', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ otp }),
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as {
      message?: string | string[];
    };
    const msg = Array.isArray(data.message)
      ? data.message.join(', ')
      : data.message;
    throw new Error(msg || 'Code TOTP invalide');
  }
  return (await res.json()) as { recoveryCodes: string[] };
}

export async function disableTwoFactor(
  accessToken: string,
  currentPassword: string,
  otp: string,
): Promise<{ success: true }> {
  const res = await fetch('/api/me/2fa/disable', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ currentPassword, otp }),
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as {
      message?: string | string[];
    };
    const msg = Array.isArray(data.message)
      ? data.message.join(', ')
      : data.message;
    throw new Error(msg || 'Impossible de désactiver la 2FA');
  }
  return (await res.json()) as { success: true };
}

export async function updateMyProfile(
  accessToken: string,
  patch: UpdateMyProfilePayload,
): Promise<MeProfile> {
  const res = await fetch('/api/me/profile', {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(patch),
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as {
      message?: string | string[];
    };
    const msg = Array.isArray(data.message)
      ? data.message.join(', ')
      : data.message;
    throw new Error(msg || 'Impossible d’enregistrer le profil');
  }
  return (await res.json()) as MeProfile;
}

export async function uploadMyAvatar(
  accessToken: string,
  file: File,
): Promise<{ success: true }> {
  const form = new FormData();
  form.append('file', file);
  const res = await fetch('/api/me/avatar', {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
    body: form,
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as {
      message?: string | string[];
    };
    const msg = Array.isArray(data.message)
      ? data.message.join(', ')
      : data.message;
    throw new Error(msg || 'Impossible d’envoyer la photo');
  }
  return (await res.json()) as { success: true };
}

export async function deleteMyAvatar(
  accessToken: string,
): Promise<{ success: true }> {
  const res = await fetch('/api/me/avatar', {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as {
      message?: string | string[];
    };
    const msg = Array.isArray(data.message)
      ? data.message.join(', ')
      : data.message;
    throw new Error(msg || 'Impossible de supprimer la photo');
  }
  return (await res.json()) as { success: true };
}
