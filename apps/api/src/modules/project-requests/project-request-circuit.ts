import {
  ProjectRequestArbitrationInstance,
  ProjectRequestCircuitStep,
  ProjectRequestType,
  ProjectRequestWorkflowSettings,
  Prisma,
} from '@prisma/client';

export type CircuitSettingsInput = Pick<
  ProjectRequestWorkflowSettings,
  | 'copilThresholdAmount'
  | 'codirThresholdAmount'
  | 'instructionSlaBusinessDays'
  | 'requireN1Validation'
  | 'requirePmoInstruction'
  | 'autoCreateProjectOnApproval'
  | 'exemptRequestTypes'
>;

export type CircuitDemandInput = {
  type: ProjectRequestType | null | undefined;
  estimatedBudget: Prisma.Decimal | number | null | undefined;
  retainedBudget?: Prisma.Decimal | number | null | undefined;
};

export type ComputedCircuitStep = {
  key: 'sub' | 'n1' | 'ins' | 'arb' | 'prj';
  label: string;
  actorHint: string;
  circuitStep: ProjectRequestCircuitStep;
};

export type ComputedCircuit = {
  needsCycle: boolean;
  instance: ProjectRequestArbitrationInstance | null;
  budgetForRouting: number;
  steps: ComputedCircuitStep[];
  copilThresholdAmount: number;
  codirThresholdAmount: number;
  instructionSlaBusinessDays: number;
  requireN1Validation: boolean;
  requirePmoInstruction: boolean;
  autoCreateProjectOnApproval: boolean;
  exemptRequestTypes: ProjectRequestType[];
};

function toNum(v: Prisma.Decimal | number | null | undefined): number {
  if (v == null) return 0;
  if (typeof v === 'number') return v;
  return Number(v);
}

export function routingBudget(d: CircuitDemandInput): number {
  if (d.retainedBudget != null) return toNum(d.retainedBudget);
  return toNum(d.estimatedBudget);
}

export function needsCycle(
  d: CircuitDemandInput,
  settings: CircuitSettingsInput,
): boolean {
  const type = d.type;
  const exempt = settings.exemptRequestTypes ?? [];
  if (type && exempt.includes(type)) return false;
  return routingBudget(d) >= toNum(settings.copilThresholdAmount);
}

export function arbitrationInstance(
  d: CircuitDemandInput,
  settings: CircuitSettingsInput,
): ProjectRequestArbitrationInstance | null {
  if (!needsCycle(d, settings)) return null;
  return routingBudget(d) >= toNum(settings.codirThresholdAmount)
    ? ProjectRequestArbitrationInstance.CODIR
    : ProjectRequestArbitrationInstance.COPIL;
}

export function computeCircuit(
  d: CircuitDemandInput,
  settings: CircuitSettingsInput,
): ComputedCircuit {
  const cycle = needsCycle(d, settings);
  const instance = arbitrationInstance(d, settings);
  const steps: ComputedCircuitStep[] = [
    {
      key: 'sub',
      label: 'Soumission',
      actorHint: 'Demandeur',
      circuitStep: ProjectRequestCircuitStep.SUBMISSION,
    },
  ];
  if (settings.requireN1Validation) {
    steps.push({
      key: 'n1',
      label: 'Validation N+1',
      actorHint: 'Responsable de direction',
      circuitStep: ProjectRequestCircuitStep.N1,
    });
  }
  if (settings.requirePmoInstruction) {
    steps.push({
      key: 'ins',
      label: 'Instruction',
      actorHint: `PMO · ${settings.instructionSlaBusinessDays} j ouvrés`,
      circuitStep: ProjectRequestCircuitStep.INSTRUCTION,
    });
  }
  steps.push(
    cycle
      ? {
          key: 'arb',
          label: `Arbitrage ${instance ?? 'COPIL'}`,
          actorHint: 'Cycle de pilotage',
          circuitStep: ProjectRequestCircuitStep.ARBITRATION,
        }
      : {
          key: 'arb',
          label: 'Validation PMO',
          actorHint: 'Hors cycle de pilotage',
          circuitStep: ProjectRequestCircuitStep.ARBITRATION,
        },
  );
  steps.push({
    key: 'prj',
    label: 'Création du projet',
    actorHint: settings.autoCreateProjectOnApproval
      ? 'Automatique'
      : 'Sur action du PMO',
    circuitStep: ProjectRequestCircuitStep.PROJECT_CREATION,
  });

  return {
    needsCycle: cycle,
    instance,
    budgetForRouting: routingBudget(d),
    steps,
    copilThresholdAmount: toNum(settings.copilThresholdAmount),
    codirThresholdAmount: toNum(settings.codirThresholdAmount),
    instructionSlaBusinessDays: settings.instructionSlaBusinessDays,
    requireN1Validation: settings.requireN1Validation,
    requirePmoInstruction: settings.requirePmoInstruction,
    autoCreateProjectOnApproval: settings.autoCreateProjectOnApproval,
    exemptRequestTypes: settings.exemptRequestTypes ?? [],
  };
}

/** Statut après soumission selon toggles circuit. */
export function statusAfterSubmit(
  settings: CircuitSettingsInput,
): 'SUBMITTED' | 'IN_REVIEW' | 'IN_CYCLE' {
  if (settings.requireN1Validation) return 'SUBMITTED';
  if (settings.requirePmoInstruction) return 'IN_REVIEW';
  return 'IN_CYCLE';
}

/** Statut après validation N+1 favorable. */
export function statusAfterN1Approve(
  settings: CircuitSettingsInput,
  d: CircuitDemandInput,
): 'IN_REVIEW' | 'IN_CYCLE' | 'APPROVED' {
  if (settings.requirePmoInstruction) return 'IN_REVIEW';
  if (needsCycle(d, settings)) return 'IN_CYCLE';
  return 'APPROVED';
}

/** Statut après instruction favorable/réservée. */
export function statusAfterInstructOk(
  settings: CircuitSettingsInput,
  d: CircuitDemandInput,
): 'IN_CYCLE' | 'APPROVED' {
  if (needsCycle(d, settings)) return 'IN_CYCLE';
  return 'APPROVED';
}
