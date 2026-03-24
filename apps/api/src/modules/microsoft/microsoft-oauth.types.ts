import { MICROSOFT_OAUTH_STATE_PURPOSE } from './microsoft.constants';

/** Claims du JWT `state` (signé Starium). */
export interface MicrosoftOAuthStatePayload {
  sub: string;
  /** clientId Starium actif au moment de l'init */
  cid: string;
  jti: string;
  purpose: typeof MICROSOFT_OAUTH_STATE_PURPOSE;
}
