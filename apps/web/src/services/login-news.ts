/** GET /api/auth/login-news — message affiché sur l’écran de connexion. */
export type LoginNewsMessageType = 'INFORMATION' | 'WARNING' | 'URGENT';

export type LoginNewsApiResponse = {
  message: string | null;
  messageType: LoginNewsMessageType;
};

const LOGIN_NEWS_MESSAGE_TYPES: LoginNewsMessageType[] = [
  'INFORMATION',
  'WARNING',
  'URGENT',
];

export function isLoginNewsMessageType(
  value: unknown,
): value is LoginNewsMessageType {
  return (
    typeof value === 'string' &&
    LOGIN_NEWS_MESSAGE_TYPES.includes(value as LoginNewsMessageType)
  );
}

export const LOGIN_NEWS_MESSAGE_TYPE_LABEL: Record<LoginNewsMessageType, string> =
  {
    INFORMATION: 'Information',
    WARNING: 'Avertissement',
    URGENT: 'Urgent',
  };

export async function fetchLoginNewsApi(): Promise<LoginNewsApiResponse> {
  try {
    const res = await fetch('/api/auth/login-news', {
      method: 'GET',
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    });
    if (!res.ok) {
      return { message: null, messageType: 'INFORMATION' };
    }
    const data = (await res.json()) as LoginNewsApiResponse;
    const message =
      typeof data.message === 'string' && data.message.trim().length > 0
        ? data.message.trim()
        : null;
    const messageType = isLoginNewsMessageType(data.messageType)
      ? data.messageType
      : 'INFORMATION';
    return { message, messageType };
  } catch {
    return { message: null, messageType: 'INFORMATION' };
  }
}
