import { readApiErrorMessageFromResponse } from '@/lib/read-api-error-message';

/** Réponse POST /api/auth/login */
export type LoginApiResponse =
  | {
      status: 'AUTHENTICATED';
      accessToken: string;
      refreshToken: string;
    }
  | {
      status: 'MFA_REQUIRED';
      challengeId: string;
      expiresAt: string;
    };

export async function getMicrosoftSsoAuthorizationUrlApi(): Promise<
  { ok: true; authorizationUrl: string } | { ok: false; message: string }
> {
  const res = await fetch('/api/auth/microsoft/url');
  if (!res.ok) {
    const msg = await readApiErrorMessageFromResponse(res);
    return {
      ok: false,
      message: msg || 'Impossible de démarrer la connexion Microsoft',
    };
  }
  const data = (await res.json().catch(() => ({}))) as {
    authorizationUrl?: string;
  };
  if (!data.authorizationUrl) {
    return {
      ok: false,
      message: 'Impossible de démarrer la connexion Microsoft',
    };
  }
  return { ok: true, authorizationUrl: data.authorizationUrl };
}

/** POST /api/auth/microsoft/disable-password-login — après OAuth ; aligne la DB sur le navigateur. */
export async function postMicrosoftDisablePasswordLoginApi(
  accessToken: string,
): Promise<boolean> {
  const res = await fetch('/api/auth/microsoft/disable-password-login', {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return res.ok;
}

/** POST /api/auth/password-login-eligibility — UX (compte Microsoft-only → false). */
export async function fetchPasswordLoginEligibilityApi(
  email: string,
): Promise<{ passwordLoginAllowed: boolean }> {
  const res = await fetch('/api/auth/password-login-eligibility', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: email.trim() }),
  });
  if (!res.ok) {
    return { passwordLoginAllowed: true };
  }
  return (await res.json()) as { passwordLoginAllowed: boolean };
}

export async function loginApi(
  email: string,
  password: string,
  trustedDeviceToken?: string | null,
): Promise<LoginApiResponse> {
  const body: Record<string, string> = { email, password };
  if (trustedDeviceToken) {
    body.trustedDeviceToken = trustedDeviceToken;
  }
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({}))) as LoginApiResponse & {
    message?: string | string[];
  };
  if (!res.ok) {
    const msg = Array.isArray(data.message)
      ? data.message.join(', ')
      : data.message;
    throw new Error(msg || 'Identifiants invalides');
  }
  return data as LoginApiResponse;
}

export async function verifyMfaTotpApi(
  challengeId: string,
  otp: string,
  trustDevice?: boolean,
): Promise<{
  status: 'AUTHENTICATED';
  accessToken: string;
  refreshToken: string;
  trustedDeviceToken?: string;
}> {
  const res = await fetch('/api/auth/mfa/totp/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      challengeId,
      otp,
      trustDevice: trustDevice ?? false,
    }),
  });
  const data = (await res.json().catch(() => ({}))) as {
    status?: string;
    accessToken?: string;
    refreshToken?: string;
    trustedDeviceToken?: string;
    message?: string | string[];
  };
  if (!res.ok) {
    const msg = Array.isArray(data.message)
      ? data.message.join(', ')
      : data.message;
    throw new Error(msg || 'Code MFA invalide');
  }
  if (
    data.status !== 'AUTHENTICATED' ||
    !data.accessToken ||
    !data.refreshToken
  ) {
    throw new Error('Réponse MFA inattendue');
  }
  return {
    status: 'AUTHENTICATED',
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
    ...(data.trustedDeviceToken
      ? { trustedDeviceToken: data.trustedDeviceToken }
      : {}),
  };
}

export async function sendMfaFallbackEmailApi(
  challengeId: string,
): Promise<void> {
  const res = await fetch('/api/auth/mfa/fallback-email/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ challengeId }),
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as {
      message?: string | string[];
    };
    const msg = Array.isArray(data.message)
      ? data.message.join(', ')
      : data.message;
    throw new Error(msg || 'Impossible d’envoyer le code email');
  }
}

export async function verifyMfaEmailApi(
  challengeId: string,
  code: string,
  trustDevice?: boolean,
): Promise<{
  status: 'AUTHENTICATED';
  accessToken: string;
  refreshToken: string;
  trustedDeviceToken?: string;
}> {
  const res = await fetch('/api/auth/mfa/fallback-email/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      challengeId,
      code,
      trustDevice: trustDevice ?? false,
    }),
  });
  const data = (await res.json().catch(() => ({}))) as {
    status?: string;
    accessToken?: string;
    refreshToken?: string;
    trustedDeviceToken?: string;
    message?: string | string[];
  };
  if (!res.ok) {
    const msg = Array.isArray(data.message)
      ? data.message.join(', ')
      : data.message;
    throw new Error(msg || 'Code email invalide');
  }
  if (
    data.status !== 'AUTHENTICATED' ||
    !data.accessToken ||
    !data.refreshToken
  ) {
    throw new Error('Réponse MFA inattendue (email)');
  }
  return {
    status: 'AUTHENTICATED',
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
    ...(data.trustedDeviceToken
      ? { trustedDeviceToken: data.trustedDeviceToken }
      : {}),
  };
}

export async function verifyMfaRecoveryApi(
  challengeId: string,
  recoveryCode: string,
  trustDevice?: boolean,
): Promise<{
  status: 'AUTHENTICATED';
  accessToken: string;
  refreshToken: string;
  trustedDeviceToken?: string;
}> {
  const res = await fetch('/api/auth/mfa/recovery/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      challengeId,
      recoveryCode,
      trustDevice: trustDevice ?? false,
    }),
  });
  const data = (await res.json().catch(() => ({}))) as {
    status?: string;
    accessToken?: string;
    refreshToken?: string;
    trustedDeviceToken?: string;
    message?: string | string[];
  };
  if (!res.ok) {
    const msg = Array.isArray(data.message)
      ? data.message.join(', ')
      : data.message;
    throw new Error(msg || 'Code de secours invalide');
  }
  if (
    data.status !== 'AUTHENTICATED' ||
    !data.accessToken ||
    !data.refreshToken
  ) {
    throw new Error('Réponse MFA inattendue (recovery)');
  }
  return {
    status: 'AUTHENTICATED',
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
    ...(data.trustedDeviceToken
      ? { trustedDeviceToken: data.trustedDeviceToken }
      : {}),
  };
}
