import { HttpException, HttpStatus } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { FeatureFlagsService } from '../feature-flags/feature-flags.service';
import { ACCESS_MODEL_MAX_EXPORT_ROWS } from './access-model.constants';
import { AccessModelService } from './access-model.service';
import type { AccessModelIssueItem } from './access-model.types';

function makeIssue(index: number): AccessModelIssueItem {
  return {
    id: `proj-${index}`,
    resourceId: `proj-${index}`,
    category: 'missing_owner',
    resourceType: 'PROJECT',
    module: 'projects',
    label: `Projet ${index}`,
    severity: 'warning',
    correctiveAction: {
      kind: 'link',
      href: `/projects/proj-${index}`,
      label: 'Ouvrir',
    },
  };
}

describe('AccessModelService export (RFC-ACL-026)', () => {
  let service: AccessModelService;
  let auditLogs: { create: jest.Mock };
  let prisma: {
    client: { findUnique: jest.Mock };
    orgUnit: { count: jest.Mock };
  };

  beforeEach(async () => {
    auditLogs = { create: jest.fn().mockResolvedValue(undefined) };
    prisma = {
      client: {
        findUnique: jest.fn().mockResolvedValue({ slug: 'acme' }),
      },
      orgUnit: { count: jest.fn().mockResolvedValue(1) },
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AccessModelService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
        {
          provide: FeatureFlagsService,
          useValue: { isEnabled: jest.fn().mockResolvedValue(false) },
        },
        { provide: AuditLogsService, useValue: auditLogs },
      ],
    }).compile();
    service = module.get(AccessModelService);
  });

  it('export exactement 5000 lignes → CSV + audit', async () => {
    const items = Array.from({ length: ACCESS_MODEL_MAX_EXPORT_ROWS }, (_, i) =>
      makeIssue(i),
    );
    jest.spyOn(service, 'resolveFilteredIssues').mockResolvedValue({
      items,
      total: items.length,
      scanTruncated: false,
    });

    const req = {
      user: { userId: 'user-1' },
      ip: '127.0.0.1',
      headers: { 'user-agent': 'jest' },
    } as any;

    const out = await service.exportIssuesCsv(
      'client-1',
      { category: 'missing_owner' },
      req,
    );

    expect(out.rowCount).toBe(5000);
    expect(out.buffer.length).toBeGreaterThan(0);
    const csv = out.buffer.toString('utf-8');
    const dataLines = csv.trim().split('\n').slice(1);
    expect(dataLines).toHaveLength(5000);
    expect(out.filename).toMatch(/^access-model-issues-acme-\d{4}-\d{2}-\d{2}\.csv$/);
    expect(auditLogs.create).toHaveBeenCalledTimes(1);
    expect(auditLogs.create).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'access_model.issues.exported',
        newValue: expect.objectContaining({ rowCount: 5000, category: 'missing_owner' }),
      }),
    );
  });

  it('export 5001 lignes → 413 sans audit', async () => {
    const items = Array.from(
      { length: ACCESS_MODEL_MAX_EXPORT_ROWS + 1 },
      (_, i) => makeIssue(i),
    );
    jest.spyOn(service, 'resolveFilteredIssues').mockResolvedValue({
      items,
      total: items.length,
      scanTruncated: false,
    });

    await expect(
      service.exportIssuesCsv(
        'client-1',
        { category: 'missing_owner' },
        { user: { userId: 'u1' }, headers: {} } as any,
      ),
    ).rejects.toMatchObject({ status: HttpStatus.PAYLOAD_TOO_LARGE });

    expect(auditLogs.create).not.toHaveBeenCalled();
    expect(prisma.client.findUnique).not.toHaveBeenCalled();
  });

  it('export avec slug client dangereux → filename sanitizé', async () => {
    prisma.client.findUnique.mockResolvedValue({ slug: 'Acme/Labs "EU"' });
    jest.spyOn(service, 'resolveFilteredIssues').mockResolvedValue({
      items: [makeIssue(0)],
      total: 1,
      scanTruncated: false,
    });

    const out = await service.exportIssuesCsv(
      'client-id-fallback',
      { category: 'missing_owner' },
      { user: { userId: 'u1' }, headers: {} } as any,
    );

    expect(out.filename).toBe('access-model-issues-Acme-Labs-EU-2026-05-18.csv');
    expect(out.filename).not.toMatch(/[/\s"]/);
  });

  it('scanTruncated true → 413 sans audit même si ≤5000 items', async () => {
    jest.spyOn(service, 'resolveFilteredIssues').mockResolvedValue({
      items: [makeIssue(0)],
      total: 1,
      scanTruncated: true,
    });

    await expect(
      service.exportIssuesCsv(
        'client-1',
        { category: 'atypical_acl' },
        { user: { userId: 'u1' }, headers: {} } as any,
      ),
    ).rejects.toBeInstanceOf(HttpException);

    expect(auditLogs.create).not.toHaveBeenCalled();
  });
});
