import {
  ProjectArbitrationLevelStatus,
  ProjectCopilRecommendation,
  ProjectCriticality,
  ProjectKind,
  ProjectPriority,
  ProjectRiskCriticality,
  ProjectRiskStatus,
  ProjectRiskTreatmentStrategy,
  ProjectStatus,
  ProjectTaskPriority,
  ProjectTaskStatus,
  ProjectType,
} from '@prisma/client';
import {
  derivedProgressPercentFromTasks,
  ProjectsPilotageService,
  riskScoreFromRisk,
} from './projects-pilotage.service';

describe('ProjectsPilotageService', () => {
  let svc: ProjectsPilotageService;

  const baseProject = {
    id: 'p1',
    clientId: 'c1',
    name: 'P',
    code: 'P01',
    description: null,
    kind: ProjectKind.PROJECT,
    type: ProjectType.APPLICATION,
    status: 'IN_PROGRESS' as ProjectStatus,
    priority: 'MEDIUM' as ProjectPriority,
    sponsorUserId: null,
    ownerUserId: 'u1',
    portfolioCategoryId: null,
    ownerFreeLabel: null,
    ownerAffiliation: null,
    startDate: null,
    targetEndDate: null,
    actualEndDate: null,
    criticality: 'MEDIUM' as ProjectCriticality,
    progressPercent: 50,
    targetBudgetAmount: null,
    pilotNotes: null,
    businessValueScore: null,
    strategicAlignment: null,
    urgencyScore: null,
    estimatedCost: null,
    estimatedGain: null,
    roi: null,
    riskLevel: null,
    riskResponse: null,
    priorityScore: null,
    arbitrationStatus: null,
    arbitrationMetierStatus: ProjectArbitrationLevelStatus.BROUILLON,
    arbitrationComiteStatus: null,
    arbitrationCodirStatus: null,
    arbitrationMetierRefusalNote: null,
    arbitrationComiteRefusalNote: null,
    arbitrationCodirRefusalNote: null,
    copilRecommendation: ProjectCopilRecommendation.NOT_SET,
    copilRecommendationNote: null,
    businessProblem: null,
    businessBenefits: null,
    businessSuccessKpis: null,
    cadreLocation: null,
    cadreQui: null,
    involvedTeams: null,
    swotStrengths: null,
    swotWeaknesses: null,
    swotOpportunities: null,
    swotThreats: null,
    towsActions: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    svc = new ProjectsPilotageService();
  });

  describe('riskScoreFromRisk', () => {
    it('renvoie criticalityScore persisté', () => {
      expect(
        riskScoreFromRisk({
          criticalityScore: 9,
        } as any),
      ).toBe(9);
    });
  });

  describe('computedHealth', () => {
    it('RED on overdue', () => {
      const past = new Date();
      past.setDate(past.getDate() - 10);
      const p = {
        ...baseProject,
        targetEndDate: past,
        status: 'IN_PROGRESS' as ProjectStatus,
      };
      const h = svc.computedHealth(p, [], [], []);
      expect(h).toBe('RED');
    });

    it('RED on OPEN high risk', () => {
      const risks = [
        {
          id: 'r1',
          clientId: 'c1',
          projectId: 'p1',
          code: 'R-001',
          title: 'R',
          description: null,
          category: null,
          threatSource: '—',
          businessImpact: '—',
          likelihoodJustification: null,
          impactCategory: null,
          probability: 5,
          impact: 5,
          criticalityScore: 25,
          criticalityLevel: 'CRITICAL' as ProjectRiskCriticality,
          mitigationPlan: null,
          contingencyPlan: null,
          ownerUserId: null,
          status: 'OPEN' as ProjectRiskStatus,
          reviewDate: null,
          dueDate: null,
          detectedAt: null,
          closedAt: null,
          sortOrder: 0,
          complianceRequirementId: null,
          riskTypeId: 'rt1',
          treatmentStrategy: ProjectRiskTreatmentStrategy.REDUCE,
          residualRiskLevel: null,
          residualJustification: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
      const h = svc.computedHealth(baseProject, [], risks, []);
      expect(h).toBe('RED');
    });

    it('ORANGE within 14 days', () => {
      const d = new Date();
      d.setDate(d.getDate() + 7);
      const p = {
        ...baseProject,
        targetEndDate: d,
        status: 'IN_PROGRESS' as ProjectStatus,
      };
      const h = svc.computedHealth(p, [], [], []);
      expect(h).toBe('ORANGE');
    });

    it('derivedProgressPercent from tasks (moyenne progress)', () => {
      const tasks = [
        {
          id: 't1',
          clientId: 'c1',
          projectId: 'p1',
          name: 'T',
          code: null,
          description: null,
          ownerUserId: null,
          status: 'DONE' as ProjectTaskStatus,
          priority: 'LOW' as ProjectTaskPriority,
          progress: 100,
          plannedStartDate: null,
          plannedEndDate: null,
          actualStartDate: null,
          actualEndDate: null,
          phaseId: null,
          dependsOnTaskId: null,
          dependencyType: null,
          budgetLineId: null,
          createdByUserId: null,
          updatedByUserId: null,
          sortOrder: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 't2',
          clientId: 'c1',
          projectId: 'p1',
          name: 'T2',
          code: null,
          description: null,
          ownerUserId: null,
          status: 'TODO' as ProjectTaskStatus,
          priority: 'LOW' as ProjectTaskPriority,
          progress: 0,
          plannedStartDate: null,
          plannedEndDate: null,
          actualStartDate: null,
          actualEndDate: null,
          phaseId: null,
          dependsOnTaskId: null,
          dependencyType: null,
          budgetLineId: null,
          createdByUserId: null,
          updatedByUserId: null,
          sortOrder: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
      expect(derivedProgressPercentFromTasks(tasks as any)).toBe(50);
    });
  });

  describe('isBlocked', () => {
    it('true when ON_HOLD', () => {
      const p = { ...baseProject, status: 'ON_HOLD' as ProjectStatus };
      expect(svc.isBlocked(p, [])).toBe(true);
    });

    it('false when COMPLETED even with OPEN high risk (no operational block)', () => {
      const risks = [
        {
          status: 'OPEN' as ProjectRiskStatus,
          criticalityLevel: 'CRITICAL' as ProjectRiskCriticality,
        },
      ] as any[];
      const p = { ...baseProject, status: 'COMPLETED' as ProjectStatus };
      expect(svc.isBlocked(p, risks)).toBe(false);
    });

    it('false when IN_PROGRESS with OPEN HIGH/CRITICAL risk (risks do not set blocked)', () => {
      const risks = [
        {
          status: 'OPEN' as ProjectRiskStatus,
          criticalityLevel: 'HIGH' as ProjectRiskCriticality,
        },
      ] as any[];
      const p = { ...baseProject, status: 'IN_PROGRESS' as ProjectStatus };
      expect(svc.isBlocked(p, risks)).toBe(false);
    });
  });
});
