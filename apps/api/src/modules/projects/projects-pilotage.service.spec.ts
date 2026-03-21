import {
  ProjectCriticality,
  ProjectPriority,
  ProjectRiskImpact,
  ProjectRiskProbability,
  ProjectRiskStatus,
  ProjectStatus,
  ProjectTaskPriority,
  ProjectTaskStatus,
  ProjectType,
} from '@prisma/client';
import {
  derivedProgressPercentFromTasks,
  ProjectsPilotageService,
  riskScore,
} from './projects-pilotage.service';

describe('ProjectsPilotageService', () => {
  let svc: ProjectsPilotageService;

  const baseProject = {
    id: 'p1',
    clientId: 'c1',
    name: 'P',
    code: 'P01',
    description: null,
    type: ProjectType.APPLICATION,
    status: 'IN_PROGRESS' as ProjectStatus,
    priority: 'MEDIUM' as ProjectPriority,
    sponsorUserId: null,
    ownerUserId: 'u1',
    startDate: null,
    targetEndDate: null,
    actualEndDate: null,
    criticality: 'MEDIUM' as ProjectCriticality,
    progressPercent: 50,
    targetBudgetAmount: null,
    pilotNotes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    svc = new ProjectsPilotageService();
  });

  describe('riskScore / riskCriticality', () => {
    it('HIGH = 7–9', () => {
      expect(riskScore('HIGH', 'HIGH')).toBe(9);
      expect(riskScore('MEDIUM', 'HIGH')).toBe(6);
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
          title: 'R',
          description: null,
          probability: 'HIGH' as ProjectRiskProbability,
          impact: 'HIGH' as ProjectRiskImpact,
          actionPlan: null,
          ownerUserId: null,
          status: 'OPEN' as ProjectRiskStatus,
          reviewDate: null,
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

    it('derivedProgressPercent from tasks', () => {
      const tasks = [
        {
          id: 't1',
          clientId: 'c1',
          projectId: 'p1',
          title: 'T',
          description: null,
          assigneeUserId: null,
          status: 'DONE' as ProjectTaskStatus,
          priority: 'LOW' as ProjectTaskPriority,
          dueDate: null,
          completedAt: null,
          sortOrder: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 't2',
          clientId: 'c1',
          projectId: 'p1',
          title: 'T2',
          description: null,
          assigneeUserId: null,
          status: 'TODO' as ProjectTaskStatus,
          priority: 'LOW' as ProjectTaskPriority,
          dueDate: null,
          completedAt: null,
          sortOrder: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
      expect(derivedProgressPercentFromTasks(tasks)).toBe(50);
    });
  });

  describe('isBlocked', () => {
    it('true when ON_HOLD', () => {
      const p = { ...baseProject, status: 'ON_HOLD' as ProjectStatus };
      expect(svc.isBlocked(p, [])).toBe(true);
    });
  });
});
