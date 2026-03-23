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
