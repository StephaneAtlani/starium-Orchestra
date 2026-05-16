import { SetMetadata } from '@nestjs/common';

export const REQUIRE_ACCESS_INTENT_KEY = 'require_access_intent';

export type AccessIntentKind = 'read' | 'list' | 'write' | 'admin' | 'create';

export type RequireAccessIntentMetadata = {
  module: string;
  intent: AccessIntentKind;
  /**
   * Clé stable optionnelle (`Controller.method`) si le nom de méthode Nest diffère
   * de l’entrée registre service-enforced.
   */
  handlerKey?: string;
};

export const RequireAccessIntent = (meta: RequireAccessIntentMetadata) =>
  SetMetadata(REQUIRE_ACCESS_INTENT_KEY, meta);
