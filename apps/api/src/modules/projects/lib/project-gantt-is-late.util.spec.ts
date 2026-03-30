import { ProjectMilestoneStatus, ProjectTaskStatus } from '@prisma/client';
import {
  computeIsLateMilestone,
  computeIsLateTask,
  utcStartOfTodayMs,
} from './project-gantt-is-late.util';

describe('project-gantt-is-late.util', () => {
  const fixed = new Date('2026-03-15T12:00:00.000Z');

  describe('utcStartOfTodayMs', () => {
    it('returns UTC midnight for the given instant’s calendar day', () => {
      const d = new Date('2026-03-15T23:59:59.999Z');
      expect(utcStartOfTodayMs(d)).toBe(Date.UTC(2026, 2, 15));
    });
  });

  describe('computeIsLateTask', () => {
    it('false for DONE', () => {
      expect(
        computeIsLateTask(
          {
            status: ProjectTaskStatus.DONE,
            plannedEndDate: new Date('2020-01-01'),
          },
          fixed,
        ),
      ).toBe(false);
    });

    it('false for CANCELLED', () => {
      expect(
        computeIsLateTask(
          {
            status: ProjectTaskStatus.CANCELLED,
            plannedEndDate: new Date('2020-01-01'),
          },
          fixed,
        ),
      ).toBe(false);
    });

    it('false when plannedEndDate is null', () => {
      expect(
        computeIsLateTask(
          { status: ProjectTaskStatus.TODO, plannedEndDate: null },
          fixed,
        ),
      ).toBe(false);
    });

    it('true for TODO when plannedEndDate before today UTC', () => {
      expect(
        computeIsLateTask(
          {
            status: ProjectTaskStatus.TODO,
            plannedEndDate: new Date('2026-03-14T23:59:59.999Z'),
          },
          fixed,
        ),
      ).toBe(true);
    });

    it('true for BLOCKED when plannedEndDate before today UTC', () => {
      expect(
        computeIsLateTask(
          {
            status: ProjectTaskStatus.BLOCKED,
            plannedEndDate: new Date('2026-03-14T12:00:00.000Z'),
          },
          fixed,
        ),
      ).toBe(true);
    });

    it('false when plannedEndDate is on or after today UTC start', () => {
      expect(
        computeIsLateTask(
          {
            status: ProjectTaskStatus.IN_PROGRESS,
            plannedEndDate: new Date('2026-03-15T00:00:00.000Z'),
          },
          fixed,
        ),
      ).toBe(false);
    });
  });

  describe('computeIsLateMilestone', () => {
    it('false for ACHIEVED', () => {
      expect(
        computeIsLateMilestone(
          {
            status: ProjectMilestoneStatus.ACHIEVED,
            targetDate: new Date('2020-01-01'),
          },
          fixed,
        ),
      ).toBe(false);
    });

    it('false for CANCELLED', () => {
      expect(
        computeIsLateMilestone(
          {
            status: ProjectMilestoneStatus.CANCELLED,
            targetDate: new Date('2020-01-01'),
          },
          fixed,
        ),
      ).toBe(false);
    });

    it('true for PLANNED when targetDate before today UTC', () => {
      expect(
        computeIsLateMilestone(
          {
            status: ProjectMilestoneStatus.PLANNED,
            targetDate: new Date('2026-03-14T12:00:00.000Z'),
          },
          fixed,
        ),
      ).toBe(true);
    });

    it('false when targetDate on or after today UTC start', () => {
      expect(
        computeIsLateMilestone(
          {
            status: ProjectMilestoneStatus.PLANNED,
            targetDate: new Date('2026-03-15T00:00:00.000Z'),
          },
          fixed,
        ),
      ).toBe(false);
    });
  });
});
