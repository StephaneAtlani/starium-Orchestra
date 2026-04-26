import { Test, TestingModule } from '@nestjs/testing';
import { ProcurementLocalDocumentsS3MigrationService } from './procurement-local-documents-s3-migration.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuditLogsService } from '../../audit-logs/audit-logs.service';
import { ClientDocumentsStorageProvisionerService } from './client-documents-storage-provisioner.service';
import { LocalProcurementBlobStorageService } from './local-procurement-blob-storage.service';
import { ProcurementS3ConfigResolverService } from './procurement-s3-config.resolver.service';
import { ProcurementStorageResolutionService } from './procurement-storage-resolution.service';
import { S3ProcurementBlobStorageService } from './s3-procurement-blob-storage.service';

describe('ProcurementLocalDocumentsS3MigrationService', () => {
  let svc: ProcurementLocalDocumentsS3MigrationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProcurementLocalDocumentsS3MigrationService,
        { provide: PrismaService, useValue: {} },
        { provide: ProcurementStorageResolutionService, useValue: {} },
        { provide: LocalProcurementBlobStorageService, useValue: {} },
        { provide: S3ProcurementBlobStorageService, useValue: {} },
        { provide: ProcurementS3ConfigResolverService, useValue: {} },
        { provide: ClientDocumentsStorageProvisionerService, useValue: {} },
        { provide: AuditLogsService, useValue: { create: jest.fn() } },
      ],
    }).compile();
    svc = module.get(ProcurementLocalDocumentsS3MigrationService);
  });

  it('parseDomainFromLocalObjectKey reconnaît Commandes / Factures / Contrats', () => {
    const cid = 'cl_1';
    expect(
      svc.parseDomainFromLocalObjectKey(
        cid,
        `${cid}/Commandes/u1/u2.pdf`,
      ),
    ).toBe('commandes');
    expect(
      svc.parseDomainFromLocalObjectKey(
        cid,
        `${cid}/Factures/a/b.bin`,
      ),
    ).toBe('factures');
    expect(
      svc.parseDomainFromLocalObjectKey(
        cid,
        `${cid}/Contrats/x/y.ext`,
      ),
    ).toBe('contrats');
    expect(svc.parseDomainFromLocalObjectKey(cid, 'autre/chemin')).toBeNull();
    expect(svc.parseDomainFromLocalObjectKey('other', `${cid}/Commandes/a/b`)).toBeNull();
  });
});
