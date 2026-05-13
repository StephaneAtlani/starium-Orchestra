import { SetMetadata } from '@nestjs/common';
import type { SupportedDiagnosticResourceType } from '../access-diagnostics/resource-diagnostics.registry';
import type { AccessIntent } from './access-decision.types';

export const REQUIRE_ACCESS_KEY = 'accessDecision:requireAccess';

export type RequireAccessMetadata = {
  resourceType: SupportedDiagnosticResourceType;
  resourceIdParam: string;
  intent: AccessIntent;
};

export const RequireAccess = (meta: RequireAccessMetadata) => SetMetadata(REQUIRE_ACCESS_KEY, meta);
