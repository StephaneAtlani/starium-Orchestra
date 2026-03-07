/**
 * Réponse de l’endpoint health (API-first, partagé api + web).
 */
export interface HealthResponse {
  status: 'ok' | 'degraded' | 'error';
  database?: 'connected' | 'disconnected';
  timestamp?: string;
}
