/** GET /api/auth/login-news — message affiché sur l’écran de connexion. */
export type LoginNewsMessageType = 'INFORMATION' | 'WARNING' | 'URGENT';

export type LoginNewsApiResponse = {
  message: string | null;
  messageType: LoginNewsMessageType;
  startsAt: string | null;
  endsAt: string | null;
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

export function formatLoginNewsDatetimeLocal(
  iso: string | null | undefined,
): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const local = new Date(date);
  local.setMinutes(local.getMinutes() - local.getTimezoneOffset());
  return local.toISOString().slice(0, 16);
}

export function loginNewsDatetimeLocalToIso(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const date = new Date(trimmed);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function parseOptionalIso(value: unknown): string | null {
  if (typeof value !== 'string' || value.trim().length === 0) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

export async function fetchLoginNewsApi(): Promise<LoginNewsApiResponse> {
  try {
    const res = await fetch('/api/auth/login-news', {
      method: 'GET',
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    });
    if (!res.ok) {
      return {
        message: null,
        messageType: 'INFORMATION',
        startsAt: null,
        endsAt: null,
      };
    }
    const data = (await res.json()) as LoginNewsApiResponse;
    const message =
      typeof data.message === 'string' && data.message.trim().length > 0
        ? data.message.trim()
        : null;
    const messageType = isLoginNewsMessageType(data.messageType)
      ? data.messageType
      : 'INFORMATION';
    return {
      message,
      messageType,
      startsAt: parseOptionalIso(data.startsAt),
      endsAt: parseOptionalIso(data.endsAt),
    };
  } catch {
    return {
      message: null,
      messageType: 'INFORMATION',
      startsAt: null,
      endsAt: null,
    };
  }
}
