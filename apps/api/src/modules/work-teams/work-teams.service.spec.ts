import { Test } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { WorkTeamsService } from './work-teams.service';

describe('WorkTeamsService', () => {
  let service: WorkTeamsService;

  beforeEach(async () => {
    const prisma = {
      workTeam: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        findFirstOrThrow: jest.fn(),
      },
      $transaction: jest.fn((ops: Array<Promise<unknown>>) => Promise.all(ops)),
    };

    const module = await Test.createTestingModule({
      providers: [
        WorkTeamsService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditLogsService, useValue: { create: jest.fn() } },
      ],
    }).compile();

    service = module.get(WorkTeamsService);
  });

  it('normalizeCode: trim et vide -> null', () => {
    expect(service.normalizeCode('  ')).toBeNull();
    expect(service.normalizeCode('')).toBeNull();
    expect(service.normalizeCode(undefined)).toBeNull();
    expect(service.normalizeCode('  ABC  ')).toBe('ABC');
  });
});
