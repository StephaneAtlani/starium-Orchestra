import type { Project } from '@prisma/client';
import {
  buildProjectReviewSnapshotPayload,
  parseCommitteeMood,
  snapshotContainsSensitiveUrls,
} from './project-reviews-snapshot.builder';
import { ProjectsPilotageService } from '../projects-pilotage.service';

describe('project-reviews-snapshot.builder', () => {
  const pilotage = new ProjectsPilotageService();

  const baseReview = {
    reviewType: 'COPIL' as const,
    title: 'COPIL Q2',
    objective: 'Arbitrer le budget',
    executiveSummary: null,
    periodStart: null,
    periodEnd: null,
    reviewDate: new Date('2026-06-01T10:00:00.000Z'),
    durationMinutes: 90,
    nextReviewDate: null,
    contentPayload: null,
  };

  const baseProject = {
    id: 'proj-1',
    name: 'Projet Alpha',
    status: 'IN_PROGRESS',
    priority: 'HIGH',
    progressPercent: 40,
    arbitrationMetierStatus: null,
    arbitrationComiteStatus: null,
    arbitrationCodirStatus: null,
    arbitrationStatus: null,
  } as unknown as Project;

  it('builds schemaVersion 2 without sensitive URLs', () => {
    const payload = buildProjectReviewSnapshotPayload({
      review: baseReview,
      facilitatorDisplayName: 'Alice Martin',
      attachments: [
        {
          id: 'att-1',
          clientId: 'c1',
          projectReviewId: 'r1',
          agendaItemId: 'ag-1',
          decisionId: null,
          actionItemId: null,
          attachmentType: 'URL',
          title: 'Dashboard Power BI',
          description: null,
          url: 'https://powerbi.example.com/report',
          documentId: null,
          fileName: null,
          mimeType: null,
          sizeBytes: null,
          uploadedByUserId: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      standaloneDecisions: [],
      standaloneActions: [],
      agendaTitleById: new Map([['ag-1', 'Budget']]),
      project: baseProject,
      tasks: [],
      risks: [],
      milestones: [],
      budgetLinks: [],
      pilotage,
      meeting: { meetingMode: 'REMOTE', location: null },
      participants: [],
      agenda: [],
    });

    const parsed = payload as Record<string, unknown>;
    expect(parsed.schemaVersion).toBe(2);
    expect(snapshotContainsSensitiveUrls(parsed)).toBe(false);
    expect(JSON.stringify(parsed)).not.toContain('https://powerbi');
    const attachments = parsed.attachments as Array<Record<string, unknown>>;
    expect(attachments[0]).toMatchObject({
      title: 'Dashboard Power BI',
      attachmentType: 'URL',
      agendaItemTitle: 'Budget',
    });
    expect(attachments[0].url).toBeUndefined();
  });

  it('parseCommitteeMood lit committeeMood depuis contentPayload', () => {
    expect(parseCommitteeMood({ committeeMood: 'ORANGE' })).toBe('ORANGE');
    expect(parseCommitteeMood({ committeeMood: 'GREEN' })).toBe('GREEN');
    expect(parseCommitteeMood({ committeeMood: 'RED' })).toBe('RED');
    expect(parseCommitteeMood({ committeeMood: 'BLUE' })).toBeNull();
    expect(parseCommitteeMood(null)).toBeNull();
    expect(parseCommitteeMood([])).toBeNull();
  });

  it('fige committeeMood dans le snapshot quand défini en réunion', () => {
    const payload = buildProjectReviewSnapshotPayload({
      review: {
        ...baseReview,
        contentPayload: { committeeMood: 'RED' },
      },
      facilitatorDisplayName: null,
      attachments: [],
      standaloneDecisions: [],
      standaloneActions: [],
      agendaTitleById: new Map(),
      project: baseProject,
      tasks: [],
      risks: [],
      milestones: [],
      budgetLinks: [],
      pilotage,
      meeting: { meetingMode: 'REMOTE', location: null },
      participants: [],
      agenda: [],
    });

    const parsed = payload as {
      review: { committeeMood: string | null };
    };
    expect(parsed.review.committeeMood).toBe('RED');
  });
});
