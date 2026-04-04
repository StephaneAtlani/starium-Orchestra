import { ConflictException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { WorkTeamMemberRole, WorkTeamStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { WorkTeamMembershipsService } from './work-team-memberships.service';
import { WorkTeamsService } from './work-teams.service';

describe('WorkTeamMembershipsService', () => {
  it('addMember refuse equipe ARCHIVED -> ConflictException', async () => {
    const prisma = {
      workTeam: {
        findFirst: jest.fn().mockResolvedValue({
          id: 't1',
          clientId: 'c1',
          status: WorkTeamStatus.ARCHIVED,
        }),
      },
      collaborator: { findFirst: jest.fn() },
      workTeamMembership: { create: jest.fn() },
    };
    const module = await Test.createTestingModule({
      providers: [
        WorkTeamMembershipsService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditLogsService, useValue: { create: jest.fn() } },
        {
          provide: WorkTeamsService,
          useValue: { assertTeamInClient: jest.fn() },
        },
      ],
    }).compile();

    const svc = module.get(WorkTeamMembershipsService);

    await expect(
      svc.addMember(
        'c1',
        't1',
        { resourceId: 'res1', role: WorkTeamMemberRole.MEMBER },
        'u1',
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
