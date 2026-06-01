import { BadRequestException } from '@nestjs/common';
import { GovernanceCycleItemSourceType } from '@prisma/client';

export const GOVERNANCE_CYCLE_CONFIG_INVALID = 'GOVERNANCE_CYCLE_CONFIG_INVALID';

export type GovernanceCyclePropagationProject = 'NONE' | 'WRITE_ARBITRATION_CODIR';
export type GovernanceCyclePropagationBudget = 'NONE' | 'WRITE_BUDGET_GOVERNANCE_DECISION';

export type NormalizedGovernanceCycleConfig = {
  version: 1;
  allowedSourceTypes: GovernanceCycleItemSourceType[];
  defaultInstanceMode?: 'MEETING' | 'DECISION_RECORD' | 'VOTE';
  instanceSchedule?: {
    enabled: boolean;
    count?: number;
    firstDecisionAt?: string;
    stepMonths?: number;
  };
  propagation: {
    project: GovernanceCyclePropagationProject;
    budget: GovernanceCyclePropagationBudget;
  };
  readinessRules?: {
    enforceOnInstanceClose: boolean;
    onAcceptedDecision?: {
      requireProjectSheetCockpitComplete?: boolean;
      requireArbitrationMetierValide?: boolean;
      requireArbitrationComiteValide?: boolean;
      requireSponsorOnProjectTeam?: boolean;
    };
  };
};

const DEFAULT_SOURCE_TYPES: GovernanceCycleItemSourceType[] = [
  GovernanceCycleItemSourceType.PROJECT,
  GovernanceCycleItemSourceType.BUDGET,
  GovernanceCycleItemSourceType.MANUAL,
];

export const DEFAULT_GOVERNANCE_CYCLE_CONFIG: NormalizedGovernanceCycleConfig = {
  version: 1,
  allowedSourceTypes: [...DEFAULT_SOURCE_TYPES],
  defaultInstanceMode: 'MEETING',
  propagation: { project: 'NONE', budget: 'NONE' },
};

const ALL_SOURCE_TYPES = new Set<string>(Object.values(GovernanceCycleItemSourceType));

export type ParseGovernanceConfigOptions = {
  /** Lot 003-E — when false, budget propagation must stay NONE. */
  allowBudgetGovernancePropagation?: boolean;
};

export function parseAndNormalizeGovernanceConfig(
  raw: unknown,
  options: ParseGovernanceConfigOptions = {},
): NormalizedGovernanceCycleConfig {
  const allowBudget = options.allowBudgetGovernancePropagation === true;
  if (raw === null || raw === undefined) {
    return { ...DEFAULT_GOVERNANCE_CYCLE_CONFIG, allowedSourceTypes: [...DEFAULT_SOURCE_TYPES] };
  }
  if (typeof raw !== 'object' || Array.isArray(raw)) {
    throw badConfig('governanceConfig must be an object');
  }
  const o = raw as Record<string, unknown>;
  if (o.version !== 1) {
    throw badConfig('version must be 1');
  }

  const allowedSourceTypes = parseAllowedSourceTypes(o.allowedSourceTypes);
  const defaultInstanceMode = parseOptionalInstanceMode(o.defaultInstanceMode);
  const instanceSchedule = parseInstanceSchedule(o.instanceSchedule);
  const propagation = parsePropagation(o.propagation, allowBudget);
  const readinessRules = parseReadinessRules(o.readinessRules);

  return {
    version: 1,
    allowedSourceTypes,
    ...(defaultInstanceMode ? { defaultInstanceMode } : {}),
    ...(instanceSchedule ? { instanceSchedule } : {}),
    propagation,
    ...(readinessRules ? { readinessRules } : {}),
  };
}

function badConfig(detail: string): BadRequestException {
  return new BadRequestException({
    code: GOVERNANCE_CYCLE_CONFIG_INVALID,
    message: detail,
  });
}

function parseAllowedSourceTypes(value: unknown): GovernanceCycleItemSourceType[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw badConfig('allowedSourceTypes must be a non-empty array');
  }
  for (const v of value) {
    if (typeof v !== 'string' || !ALL_SOURCE_TYPES.has(v)) {
      throw badConfig('allowedSourceTypes contains invalid value');
    }
  }
  return value as GovernanceCycleItemSourceType[];
}

function parseOptionalInstanceMode(
  value: unknown,
): 'MEETING' | 'DECISION_RECORD' | 'VOTE' | undefined {
  if (value === undefined) return undefined;
  if (value === 'MEETING' || value === 'DECISION_RECORD' || value === 'VOTE') {
    return value;
  }
  throw badConfig('defaultInstanceMode invalid');
}

function parseInstanceSchedule(
  value: unknown,
): NormalizedGovernanceCycleConfig['instanceSchedule'] | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw badConfig('instanceSchedule must be an object');
  }
  const s = value as Record<string, unknown>;
  const enabled = s.enabled === true;
  if (!enabled) {
    return { enabled: false };
  }
  const count =
    s.count === undefined ? undefined : parseInt(String(s.count), 10);
  if (count !== undefined && (count < 1 || count > 12)) {
    throw badConfig('instanceSchedule.count must be between 1 and 12');
  }
  const firstDecisionAt =
    typeof s.firstDecisionAt === 'string' ? s.firstDecisionAt : undefined;
  if (!firstDecisionAt) {
    throw badConfig('instanceSchedule.firstDecisionAt required when enabled');
  }
  const stepMonths =
    s.stepMonths === undefined ? 3 : parseInt(String(s.stepMonths), 10);
  if (stepMonths < 1 || stepMonths > 12) {
    throw badConfig('instanceSchedule.stepMonths must be between 1 and 12');
  }
  return { enabled: true, count, firstDecisionAt, stepMonths };
}

function parsePropagation(
  value: unknown,
  allowBudget: boolean,
): NormalizedGovernanceCycleConfig['propagation'] {
  const def = { ...DEFAULT_GOVERNANCE_CYCLE_CONFIG.propagation };
  if (value === undefined) return def;
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw badConfig('propagation must be an object');
  }
  const p = value as Record<string, unknown>;
  const project = p.project ?? 'NONE';
  if (project === 'WRITE_PROJECT_STATUS') {
    throw badConfig('propagation.project WRITE_PROJECT_STATUS is not supported');
  }
  if (project !== 'NONE' && project !== 'WRITE_ARBITRATION_CODIR') {
    throw badConfig('propagation.project invalid');
  }
  let budget: GovernanceCyclePropagationBudget = 'NONE';
  const rawBudget = p.budget ?? 'NONE';
  if (rawBudget === 'WRITE_BUDGET_GOVERNANCE_DECISION') {
    if (!allowBudget) {
      throw badConfig(
        'propagation.budget WRITE_BUDGET_GOVERNANCE_DECISION is not available until budget propagation is enabled',
      );
    }
    budget = 'WRITE_BUDGET_GOVERNANCE_DECISION';
  } else if (rawBudget !== 'NONE') {
    throw badConfig('propagation.budget invalid');
  }
  return { project: project as GovernanceCyclePropagationProject, budget };
}

function parseReadinessRules(
  value: unknown,
): NormalizedGovernanceCycleConfig['readinessRules'] | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw badConfig('readinessRules must be an object');
  }
  const r = value as Record<string, unknown>;
  const enforceOnInstanceClose = r.enforceOnInstanceClose === true;
  let onAcceptedDecision:
    | NonNullable<NormalizedGovernanceCycleConfig['readinessRules']>['onAcceptedDecision']
    | undefined;
  if (r.onAcceptedDecision !== undefined) {
    if (typeof r.onAcceptedDecision !== 'object' || r.onAcceptedDecision === null) {
      throw badConfig('readinessRules.onAcceptedDecision must be an object');
    }
    const o = r.onAcceptedDecision as Record<string, unknown>;
    onAcceptedDecision = {
      requireProjectSheetCockpitComplete:
        o.requireProjectSheetCockpitComplete === true,
      requireArbitrationMetierValide: o.requireArbitrationMetierValide === true,
      requireArbitrationComiteValide: o.requireArbitrationComiteValide === true,
      requireSponsorOnProjectTeam: o.requireSponsorOnProjectTeam === true,
    };
  }
  return { enforceOnInstanceClose, ...(onAcceptedDecision ? { onAcceptedDecision } : {}) };
}

export function governanceConfigFromDb(
  raw: unknown,
  options?: ParseGovernanceConfigOptions,
): NormalizedGovernanceCycleConfig {
  try {
    return parseAndNormalizeGovernanceConfig(raw, options);
  } catch (e) {
    if (e instanceof BadRequestException) throw e;
    return { ...DEFAULT_GOVERNANCE_CYCLE_CONFIG, allowedSourceTypes: [...DEFAULT_SOURCE_TYPES] };
  }
}
