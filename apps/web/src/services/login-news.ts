/** GET /api/auth/login-news — message affiché sur l’écran de connexion. */
export type LoginNewsApiResponse = {
  message: string | null;
};

export async function fetchLoginNewsApi(): Promise<LoginNewsApiResponse> {
  try {
    const res = await fetch('/api/auth/login-news', {
      method: 'GET',
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    });
    if (!res.ok) {
      return { message: null };
    }
    const data = (await res.json()) as LoginNewsApiResponse;
    const message =
      typeof data.message === 'string' && data.message.trim().length > 0
        ? data.message.trim()
        : null;
    return { message };
  } catch {
    return { message: null };
  }
}
