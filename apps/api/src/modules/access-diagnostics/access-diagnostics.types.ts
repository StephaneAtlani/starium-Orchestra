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
