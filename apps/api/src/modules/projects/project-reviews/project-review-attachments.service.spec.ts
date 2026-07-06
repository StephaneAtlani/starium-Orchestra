import { BadRequestException, NotFoundException } from '@nestjs/common';
import {
  ProjectReviewAttachmentType,
  ProjectReviewStatus,
} from '@prisma/client';
import { AuditLogsService } from '../../audit-logs/audit-logs.service';
import { PROJECT_AUDIT_ACTION } from '../project-audit.constants';
import { ProjectsService } from '../projects.service';
import { ProjectReviewAttachmentsService } from './project-review-attachments.service';

describe('ProjectReviewAttachmentsService (RFC-PROJ-013-2)', () => {
  let service: ProjectReviewAttachmentsService;
  let prisma: {
    projectReview: { findFirst: jest.Mock };
    projectReviewAttachment: {
      findFirst: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
    projectDocument: { findFirst: jest.Mock };
    projectReviewAgendaItem: { findFirst: jest.Mock };
    projectReviewDecision: { findFirst: jest.Mock };
    projectReviewActionItem: { findFirst: jest.Mock };
  };
  let projects: { getProjectForScope: jest.Mock };
  let auditLogs: { create: jest.Mock };

  const clientId = 'c1';
  const otherClientId = 'c2';
  const projectId = 'p1';
  const reviewId = 'rev1';

  beforeEach(() => {
    auditLogs = { create: jest.fn().mockResolvedValue(undefined) };
    projects = {
      getProjectForScope: jest.fn().mockResolvedValue({ id: projectId }),
    };
    prisma = {
      projectReview: { findFirst: jest.fn() },
      projectReviewAttachment: {
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      projectDocument: { findFirst: jest.fn() },
      projectReviewAgendaItem: { findFirst: jest.fn() },
      projectReviewDecision: { findFirst: jest.fn() },
      projectReviewActionItem: { findFirst: jest.fn() },
    };
    service = new ProjectReviewAttachmentsService(
      prisma as never,
      projects as unknown as ProjectsService,
      auditLogs as unknown as AuditLogsService,
    );
  });

  function mockEditableReview() {
    prisma.projectReview.findFirst.mockResolvedValue({
      id: reviewId,
      status: ProjectReviewStatus.PREPARING,
    });
  }

  it('create URL attachment sans url dans audit', async () => {
    mockEditableReview();
    prisma.projectReviewAttachment.create.mockResolvedValue({
      id: 'att1',
      attachmentType: ProjectReviewAttachmentType.URL,
      title: 'Dashboard',
      url: 'https://example.com/secret',
      documentId: null,
      agendaItemId: null,
      decisionId: null,
      actionItemId: null,
    });

    await service.create(
      clientId,
      projectId,
      reviewId,
      {
        attachmentType: ProjectReviewAttachmentType.URL,
        title: 'Dashboard',
        url: 'https://example.com/secret',
      },
      { actorUserId: 'u1' },
    );

    expect(auditLogs.create).toHaveBeenCalledWith(
      expect.objectContaining({
        action: PROJECT_AUDIT_ACTION.PROJECT_REVIEW_ATTACHMENT_ADDED,
        newValue: expect.not.objectContaining({
          url: expect.anything(),
        }),
      }),
    );
  });

  it('refuse documentId hors projet', async () => {
    mockEditableReview();
    prisma.projectDocument.findFirst.mockResolvedValue(null);

    await expect(
      service.create(clientId, projectId, reviewId, {
        attachmentType: ProjectReviewAttachmentType.DOCUMENT_REFERENCE,
        title: 'CR',
        documentId: 'doc-other',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('refuse agendaItemId hors revue', async () => {
    mockEditableReview();
    prisma.projectReviewAgendaItem.findFirst.mockResolvedValue(null);

    await expect(
      service.create(clientId, projectId, reviewId, {
        attachmentType: ProjectReviewAttachmentType.URL,
        title: 'Lien',
        url: 'https://example.com',
        agendaItemId: 'ag-other',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('refuse decisionId autre client', async () => {
    mockEditableReview();
    prisma.projectReviewDecision.findFirst.mockImplementation(
      async ({ where }: { where: { clientId: string } }) =>
        where.clientId === otherClientId ? { id: 'dec1' } : null,
    );

    await expect(
      service.create(clientId, projectId, reviewId, {
        attachmentType: ProjectReviewAttachmentType.URL,
        title: 'Lien',
        url: 'https://example.com',
        decisionId: 'dec1',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('refuse actionItemId hors revue', async () => {
    mockEditableReview();
    prisma.projectReviewActionItem.findFirst.mockResolvedValue(null);

    await expect(
      service.create(clientId, projectId, reviewId, {
        attachmentType: ProjectReviewAttachmentType.URL,
        title: 'Lien',
        url: 'https://example.com',
        actionItemId: 'act-other',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('refuse mutation si FINALIZED', async () => {
    prisma.projectReview.findFirst.mockResolvedValue({
      id: reviewId,
      status: ProjectReviewStatus.FINALIZED,
    });

    await expect(
      service.create(clientId, projectId, reviewId, {
        attachmentType: ProjectReviewAttachmentType.URL,
        title: 'Lien',
        url: 'https://example.com',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('delete attachment scopé revue', async () => {
    mockEditableReview();
    prisma.projectReviewAttachment.findFirst.mockResolvedValue({
      id: 'att1',
      attachmentType: ProjectReviewAttachmentType.URL,
      title: 'Lien',
      documentId: null,
      agendaItemId: null,
      decisionId: null,
      actionItemId: null,
    });
    prisma.projectReviewAttachment.delete.mockResolvedValue(undefined);

    await service.remove(clientId, projectId, reviewId, 'att1', {});

    expect(prisma.projectReviewAttachment.delete).toHaveBeenCalledWith({
      where: { id: 'att1' },
    });
    expect(auditLogs.create).toHaveBeenCalledWith(
      expect.objectContaining({
        action: PROJECT_AUDIT_ACTION.PROJECT_REVIEW_ATTACHMENT_REMOVED,
      }),
    );
  });
});
