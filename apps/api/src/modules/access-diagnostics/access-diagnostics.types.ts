export type EffectiveRightsOperation = 'read' | 'write' | 'admin';

export type EffectiveRightsCheckStatus = 'pass' | 'fail' | 'not_applicable';

/** RFC-ACL-019 — statut d’affichage des six couches historiques quand le moteur 018 prime (READ enrichi). */
export type EffectiveRightsEvaluationMode =
  | 'enforced'
  | 'informational'
  | 'superseded_by_decision_engine';

export type EffectiveRightsCheck = {
  status: EffectiveRightsCheckStatus;
  reasonCode: string | null;
  message: string;
  details?: Record<string, unknown>;
  evaluationMode?: EffectiveRightsEvaluationMode;
};

export type EffectiveRightsDecision = 'allowed' | 'denied';

export type EffectiveRightsDenialLayer =
  | 'licenseCheck'
  | 'subscriptionCheck'
  | 'moduleActivationCheck'
  | 'moduleVisibilityCheck'
  | 'rbacCheck'
  | 'aclCheck';

export type EnrichedDiagnosticCheck = {
  status: EffectiveRightsCheckStatus;
  reasonCode: string | null;
  message: string;
  enforcedForIntent: boolean;
  details?: Record<string, unknown>;
};

export type EffectiveRightsResponse = {
  licenseCheck: EffectiveRightsCheck;
  subscriptionCheck: EffectiveRightsCheck;
  moduleActivationCheck: EffectiveRightsCheck;
  moduleVisibilityCheck: EffectiveRightsCheck;
  rbacCheck: EffectiveRightsCheck;
  aclCheck: EffectiveRightsCheck;
  finalDecision: EffectiveRightsDecision;
  denialReasons: Array<{
    layer: EffectiveRightsDenialLayer;
    reasonCode: string;
    message: string;
  }>;
  computedAt: string;
  /** Présents uniquement si `ACCESS_DIAGNOSTICS_ENRICHED` actif et chemin enrichi concerné. */
  organizationScopeCheck?: EnrichedDiagnosticCheck;
  resourceOwnershipCheck?: EnrichedDiagnosticCheck;
  resourceAccessPolicyCheck?: EnrichedDiagnosticCheck;
};

/** RFC-ACL-014 §3 — réponse self-service `GET .../effective-rights/me`. */
export type SelfEffectiveControlId =
  | 'USER_LICENSE'
  | 'CLIENT_SUBSCRIPTION'
  | 'CLIENT_MODULE_ENABLED'
  | 'USER_MODULE_VISIBLE'
  | 'RBAC_PERMISSION'
  | 'ORGANIZATION_SCOPE'
  | 'RESOURCE_OWNERSHIP'
  | 'RESOURCE_ACCESS_POLICY'
  | 'RESOURCE_ACL';

export type SelfEffectiveDecision = 'ALLOWED' | 'DENIED' | 'UNSAFE_CONTEXT';

export type SelfEffectiveControl = {
  id: SelfEffectiveControlId;
  status: 'pass' | 'fail' | 'not_applicable';
  reasonCode: string | null;
  message: string;
  enforcedForIntent?: boolean;
  evaluationMode?: EffectiveRightsEvaluationMode;
};

export type MyEffectiveRightsResponse = {
  finalDecision: SelfEffectiveDecision;
  reasonCode: string | null;
  resourceLabel: string | null;
  controls: SelfEffectiveControl[];
  safeMessage: string;
  computedAt: string;
};
