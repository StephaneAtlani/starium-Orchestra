/** Payload custom du JWT `state` OAuth Microsoft (signé côté Starium). */
export const MICROSOFT_OAUTH_STATE_PURPOSE = 'microsoft_oauth' as const;

/** Seuil par défaut : refresh si expiration dans moins de 5 minutes. */
export const DEFAULT_MICROSOFT_REFRESH_LEEWAY_SECONDS = 300;

/** TTL du state / jti (secondes). */
export const DEFAULT_MICROSOFT_OAUTH_STATE_TTL_SECONDS = 600;

/** Timeout HTTP vers le endpoint token Microsoft (ms). */
export const DEFAULT_MICROSOFT_TOKEN_HTTP_TIMEOUT_MS = 5000;

/** Scopes Graph par défaut (moindre privilège initial ; étendus par env). */
export const DEFAULT_MICROSOFT_GRAPH_SCOPES =
  'offline_access openid profile email User.Read';

/** Base URL Microsoft Graph API v1.0 (sans slash final). */
export const MICROSOFT_GRAPH_BASE_URL = 'https://graph.microsoft.com/v1.0';

/** Timeout HTTP vers Graph (ms) — défaut aligné sur le token endpoint. */
export const DEFAULT_MICROSOFT_GRAPH_HTTP_TIMEOUT_MS = 5000;

/**
 * 5xx / réseau / abort : au plus 1 retry (2 tentatives au total).
 * Utilisé comme borne pour GET uniquement.
 */
export const DEFAULT_MICROSOFT_GRAPH_MAX_RETRIES = 1;

/** Boucle 429 : 1 tentative initiale + 2 retries = 3 au total. */
export const DEFAULT_MICROSOFT_GRAPH_MAX_429_ATTEMPTS = 3;

/** Plafond appliqué au délai issu de Retry-After (secondes). */
export const DEFAULT_MICROSOFT_GRAPH_MAX_RETRY_AFTER_SECONDS = 5;
