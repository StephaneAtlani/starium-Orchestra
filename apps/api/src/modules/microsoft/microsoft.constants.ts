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
