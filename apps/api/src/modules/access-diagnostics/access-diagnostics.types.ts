export type EffectiveRightsOperation = 'read' | 'write' | 'admin';

export type EffectiveRightsCheckStatus = 'pass' | 'fail' | 'not_applicable';

export type EffectiveRightsCheck = {
  status: EffectiveRightsCheckStatus;
  reasonCode: string | null;
  message: string;
  details?: Record<string, unknown>;
};

export type EffectiveRightsDecision = 'allowed' | 'denied';

export type EffectiveRightsResponse = {
  licenseCheck: EffectiveRightsCheck;
  subscriptionCheck: EffectiveRightsCheck;
  moduleActivationCheck: EffectiveRightsCheck;
  moduleVisibilityCheck: EffectiveRightsCheck;
  rbacCheck: EffectiveRightsCheck;
  aclCheck: EffectiveRightsCheck;
  finalDecision: EffectiveRightsDecision;
  denialReasons: Array<{
    layer:
      | 'licenseCheck'
      | 'subscriptionCheck'
      | 'moduleActivationCheck'
      | 'moduleVisibilityCheck'
      | 'rbacCheck'
      | 'aclCheck';
    reasonCode: string;
    message: string;
  }>;
  computedAt: string;
};

/** RFC-ACL-014 §3 — réponse self-service `GET .../effective-rights/me`. */
export type SelfEffectiveControlId =
  | 'USER_LICENSE'
  | 'CLIENT_SUBSCRIPTION'
  | 'CLIENT_MODULE_ENABLED'
  | 'USER_MODULE_VISIBLE'
  | 'RBAC_PERMISSION'
  | 'RESOURCE_ACL';

export type SelfEffectiveDecision = 'ALLOWED' | 'DENIED' | 'UNSAFE_CONTEXT';

export type SelfEffectiveControl = {
  id: SelfEffectiveControlId;
  status: 'pass' | 'fail' | 'not_applicable';
  reasonCode: string | null;
  message: string;
};

export type MyEffectiveRightsResponse = {
  finalDecision: SelfEffectiveDecision;
  reasonCode: string | null;
  resourceLabel: string | null;
  controls: SelfEffectiveControl[];
  safeMessage: string;
  computedAt: string;
};
