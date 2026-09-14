import {
  ProjectRequestArbitrationInstance,
  ProjectRequestType,
  ProjectRequestWorkflowSettings,
  Prisma,
} from '@prisma/client';
import {
  arbitrationInstance,
  computeCircuit,
  needsCycle,
  routingBudget,
  statusAfterInstructOk,
  statusAfterN1Approve,
  statusAfterSubmit,
} from './project-request-circuit';

function settings(partial: Partial<ProjectRequestWorkflowSettings> = {}) {
  return {
    copilThresholdAmount: new Prisma.Decimal(50_000),
    codirThresholdAmount: new Prisma.Decimal(250_000),
    instructionSlaBusinessDays: 10,
    requireN1Validation: true,
    requirePmoInstruction: true,
    autoCreateProjectOnApproval: false,
    exemptRequestTypes: [ProjectRequestType.REGULATORY],
    ...partial,
  } as ProjectRequestWorkflowSettings;
}

describe('project-request-circuit', () => {
  it('49k hors cycle, 51k COPIL, 251k CODIR', () => {
    const s = settings();
    expect(needsCycle({ type: ProjectRequestType.PRODUCT, estimatedBudget: 49_000 }, s)).toBe(
      false,
    );
    expect(
      arbitrationInstance(
        { type: ProjectRequestType.PRODUCT, estimatedBudget: 51_000 },
        s,
      ),
    ).toBe(ProjectRequestArbitrationInstance.COPIL);
    expect(
      arbitrationInstance(
        { type: ProjectRequestType.PRODUCT, estimatedBudget: 251_000 },
        s,
      ),
    ).toBe(ProjectRequestArbitrationInstance.CODIR);
  });

  it('type exempt reste hors cycle à 400k', () => {
    const s = settings();
    expect(
      needsCycle(
        { type: ProjectRequestType.REGULATORY, estimatedBudget: 400_000 },
        s,
      ),
    ).toBe(false);
  });

  it('budget retenu prime sur estimation', () => {
    expect(
      routingBudget({
        type: ProjectRequestType.PRODUCT,
        estimatedBudget: 40_000,
        retainedBudget: 300_000,
      }),
    ).toBe(300_000);
  });

  it('statusAfterSubmit selon toggles', () => {
    expect(statusAfterSubmit(settings())).toBe('SUBMITTED');
    expect(
      statusAfterSubmit(settings({ requireN1Validation: false })),
    ).toBe('IN_REVIEW');
    expect(
      statusAfterSubmit(
        settings({ requireN1Validation: false, requirePmoInstruction: false }),
      ),
    ).toBe('IN_CYCLE');
  });

  it('statusAfterN1Approve / instruct', () => {
    const s = settings();
    const d = { type: ProjectRequestType.PRODUCT, estimatedBudget: 180_000 };
    expect(statusAfterN1Approve(s, d)).toBe('IN_REVIEW');
    expect(statusAfterInstructOk(s, d)).toBe('IN_CYCLE');
    expect(
      statusAfterInstructOk(s, {
        type: ProjectRequestType.EVOLUTION,
        estimatedBudget: 20_000,
      }),
    ).toBe('APPROVED');
  });

  it('computeCircuit expose les étapes attendues', () => {
    const c = computeCircuit(
      { type: ProjectRequestType.TRANSFORMATION, estimatedBudget: 180_000 },
      settings(),
    );
    expect(c.needsCycle).toBe(true);
    expect(c.instance).toBe(ProjectRequestArbitrationInstance.COPIL);
    expect(c.steps.map((x) => x.key)).toEqual(['sub', 'n1', 'ins', 'arb', 'prj']);
  });
});
