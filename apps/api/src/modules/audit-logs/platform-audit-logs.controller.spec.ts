import { Test, TestingModule } from '@nestjs/testing';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PlatformAdminGuard } from '../../common/guards/platform-admin.guard';
import { PlatformAuditLogsController } from './platform-audit-logs.controller';
import { AuditLogsService } from './audit-logs.service';

describe('PlatformAuditLogsController', () => {
  let controller: PlatformAuditLogsController;
  let service: AuditLogsService;

  const passGuard = { canActivate: () => true };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PlatformAuditLogsController],
      providers: [
        {
          provide: AuditLogsService,
          useValue: {
            listForPlatform: jest.fn(),
          },
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(passGuard)
      .overrideGuard(PlatformAdminGuard)
      .useValue(passGuard)
      .compile();

    controller = module.get<PlatformAuditLogsController>(PlatformAuditLogsController);
    service = module.get<AuditLogsService>(AuditLogsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should delegate GET /platform/audit-logs to AuditLogsService.listForPlatform', () => {
    const query: any = { clientId: 'c1', offset: 0, limit: 20 };
    (service.listForPlatform as jest.Mock).mockResolvedValue({
      items: [],
      total: 0,
    });

    controller.findAll(query);

    expect(service.listForPlatform).toHaveBeenCalledWith(query);
  });
});

