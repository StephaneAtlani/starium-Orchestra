/** Configuration OAuth Microsoft résolue (plateforme DB + env). */
export interface ResolvedPlatformMicrosoftConfig {
  redirectUri: string;
  graphScopes: string;
  oauthSuccessUrl: string | null;
  oauthErrorUrl: string | null;
  oauthStateTtlSeconds: number;
  refreshLeewaySeconds: number;
  tokenHttpTimeoutMs: number;
}
