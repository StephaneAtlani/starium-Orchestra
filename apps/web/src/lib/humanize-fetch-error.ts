/**
 * Remplace les messages d’échec réseau génériques du navigateur par un libellé exploitable en UI.
 */
export function humanizeFetchErrorMessage(message: string): string {
  const t = message.trim();
  if (!t) return 'Erreur réseau inattendue.';

  const lower = t.toLowerCase();
  if (
    t === 'Failed to fetch' ||
    lower === 'failed to fetch' ||
    t === 'NetworkError when attempting to fetch resource.' ||
    lower === 'load failed' ||
    lower.includes('networkerror when attempting to fetch')
  ) {
    if (typeof process !== 'undefined' && process.env.NODE_ENV === 'development') {
      // Détail technique hors UI (évite un bandeau trop long dans le widget).
      console.warn(
        '[Starium] Fetch réseau impossible — vérifier que l’API Nest tourne et les rewrites Next (INTERNAL_API_URL / NEXT_PUBLIC_API_URL).',
      );
    }
    return 'Impossible de contacter le serveur. Vérifiez votre connexion, puis réessayez.';
  }

  if (lower.includes('aborted') || t === 'The user aborted a request.') {
    return 'Requête annulée.';
  }

  return message;
}
