import { BadRequestException } from '@nestjs/common';
import { ProjectRequestStatus } from '@prisma/client';
import { ProjectRequestCdcWorkflowService } from './project-request-cdc-workflow.service';

describe('ProjectRequestCdcWorkflowService (smoke)', () => {
  function build(status: ProjectRequestStatus) {
    const prisma = {
      projectRequest: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'req-1',
          clientId: 'c1',
          status,
          title: 'Demo',
          requestingDirection: 'Direction IT',
          referenceCode: 'DP-2026-014',
          type: null,
          estimatedBudget: null,
          retainedBudget: null,
        }),
        update: jest.fn(),
      },
      projectRequestJournalEntry: { create: jest.fn() },
      user: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'u1',
          email: 'a@b.c',
          firstName: 'A',
          lastName: 'B',
        }),
      },
    };
    const auditLogs = { create: jest.fn() };
    const effectivePermissions = {
      resolvePermissionCodesForRequest: jest
        .fn()
        .mockResolvedValue(
          new Set([
            'project_requests.instruct',
            'project_requests.validate',
            'project_requests.create',
            'project_requests.update',
          ]),
        ),
    };
    const workflowSettings = {
      getOrCreate: jest.fn().mockResolvedValue({
        requireN1Validation: true,
        requirePmoInstruction: true,
        autoCreateProjectOnApproval: false,
        copilThresholdAmount: { toNumber: () => 50_000 },
        codirThresholdAmount: { toNumber: () => 250_000 },
        exemptRequestTypes: [],
      }),
    };
    const converter = { convert: jest.fn() };
    const svc = new ProjectRequestCdcWorkflowService(
      prisma as never,
      auditLogs as never,
      effectivePermissions as never,
      workflowSettings as never,
      converter as never,
    );
    return { svc, prisma, converter };
  }

  it('refuse convert hors APPROVED', async () => {
    const { svc } = build(ProjectRequestStatus.IN_CYCLE);
    await expect(
      svc.convert('c1', 'u1', 'req-1', {}),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('refuse reopen hors POSTPONED/REJECTED', async () => {
    const { svc } = build(ProjectRequestStatus.APPROVED);
    await expect(
      svc.reopen('c1', 'u1', 'req-1', {}),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});