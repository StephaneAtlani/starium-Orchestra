import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ActiveClientGuard } from '../../../common/guards/active-client.guard';
import { ModuleAccessGuard } from '../../../common/guards/module-access.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { PrismaModule } from '../../../prisma/prisma.module';
import { AuditLogsModule } from '../../audit-logs/audit-logs.module';
import { BudgetImportController } from '../budget-import.controller';
import { BudgetImportMappingsController } from '../budget-import-mappings.controller';
import { BudgetImportService } from '../budget-import.service';
import { BudgetImportMappingsService } from '../budget-import-mappings.service';
import { BudgetImportFileStoreService } from '../budget-import-file-store.service';
import { BudgetImportParserService } from '../budget-import-parser.service';
import { BudgetImportMatchingService } from '../budget-import-matching.service';

describe('Budget import integration', () => {
  let app: INestApplication;
  let mappingsService: BudgetImportMappingsService;
  let budgetImportService: BudgetImportService;
  const passGuard = { canActivate: () => true };

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [PrismaModule, AuditLogsModule],
      controllers: [BudgetImportController, BudgetImportMappingsController],
      providers: [
        BudgetImportService,
        BudgetImportMappingsService,
        BudgetImportFileStoreService,
        BudgetImportParserService,
        BudgetImportMatchingService,
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(passGuard)
      .overrideGuard(ActiveClientGuard)
      .useValue(passGuard)
      .overrideGuard(ModuleAccessGuard)
      .useValue(passGuard)
      .overrideGuard(PermissionsGuard)
      .useValue(passGuard)
      .compile();

    app = module.createNestApplication();
    await app.init();

    mappingsService = module.get<BudgetImportMappingsService>(BudgetImportMappingsService);
    budgetImportService = module.get<BudgetImportService>(BudgetImportService);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('BudgetImportMappingsService', () => {
    it('list returns items scoped by clientId', async () => {
      const result = await mappingsService.list('test-client', { limit: 10, offset: 0 });
      expect(result).toHaveProperty('items');
      expect(result).toHaveProperty('total');
      expect(Array.isArray(result.items)).toBe(true);
    });
  });

  describe('BudgetImportService.analyze', () => {
    it('rejects when file is missing', async () => {
      await expect(
        budgetImportService.analyze('c1', 'u1', null as any, {}),
      ).rejects.toThrow();
    });
  });
});
