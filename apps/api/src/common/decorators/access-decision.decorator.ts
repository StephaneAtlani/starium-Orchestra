import { SetMetadata } from '@nestjs/common';
import type { SupportedDiagnosticResourceType } from '../../modules/access-diagnostics/resource-diagnostics.registry';
import type { AccessIntent } from '../../modules/access-decision/access-decision.types';

/** RFC-ACL-025 — metadata partagée avec `ResourceAccessDecisionGuard`. */
export const REQUIRE_ACCESS_KEY = 'accessDecision:requireAccess';

export type AccessDecisionMetadata = {
  resourceType: SupportedDiagnosticResourceType;
  resourceIdParam: string;
  intent: AccessIntent;
};

/** @alias AccessDecisionMetadata — compat imports historiques. */
export type RequireAccessMetadata = AccessDecisionMetadata;

export const AccessDecision = (meta: AccessDecisionMetadata) =>
  SetMetadata(REQUIRE_ACCESS_KEY, meta);

/** Alias historique (module access-decision). */
export const RequireAccess = AccessDecision;
