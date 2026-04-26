import { Test, TestingModule } from '@nestjs/testing';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PlatformAdminGuard } from '../../common/guards/platform-admin.guard';
import type { RequestMeta } from '../../common/decorators/request-meta.decorator';
import { ClientsController } from './clients.controller';
import { ClientMembershipService } from './client-membership.service';
import { ClientsService } from './clients.service';

describe('ClientsController', () => {
  let controller: ClientsController;
  let service: ClientsService;
  const meta: RequestMeta = {};

  const mockClientResponse = {
    id: 'client-1',
    name: 'Client démo',
    slug: 'demo',
  };
  const mockClientListItem = {
    ...mockClientResponse,
    createdAt: new Date('2020-01-01'),
    procurementAttachmentsNotOnS3Count: 0,
    procurementS3Configured: true,
  };
  const passGuard = { canActivate: () => true };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ClientsController],
      providers: [
        {
          provide: ClientsService,
          useValue: {
            findAll: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
            migrateProcurementLocalDocumentsToS3: jest.fn(),
          },
        },
        {
          provide: ClientMembershipService,
          useValue: {
            attachUserToClient: jest.fn(),
            detachUserFromClient: jest.fn(),
          },
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(passGuard)
      .overrideGuard(PlatformAdminGuard)
      .useValue(passGuard)
      .compile();

    controller = module.get<ClientsController>(ClientsController);
    service = module.get<ClientsService>(ClientsService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should return list of clients', async () => {
      (service.findAll as jest.Mock).mockResolvedValue([mockClientListItem]);
      const result = await controller.findAll();
      expect(service.findAll).toHaveBeenCalledWith();
      expect(result).toEqual([mockClientListItem]);
    });
  });

  describe('create', () => {
    it('should call create with dto and return client', async () => {
      (service.create as jest.Mock).mockResolvedValue(mockClientResponse);
      const dto = {
        name: 'New Client',
        slug: 'new-client',
        adminEmail: 'admin@test.fr',
      };
      const result = await controller.create(dto, undefined, meta);
      expect(service.create).toHaveBeenCalledWith(dto, {
        actorUserId: undefined,
        meta,
      });
      expect(result).toEqual(mockClientResponse);
    });
  });

  describe('update', () => {
    it('should call update with id and dto', async () => {
      (service.update as jest.Mock).mockResolvedValue({
        ...mockClientResponse,
        name: 'Updated',
      });
      const result = await controller.update(
        mockClientResponse.id,
        { name: 'Updated' },
        undefined,
        meta,
      );
      expect(service.update).toHaveBeenCalledWith(
        mockClientResponse.id,
        {
          name: 'Updated',
        },
        {
          actorUserId: undefined,
          meta,
        },
      );
      expect(result.name).toBe('Updated');
    });
  });

  describe('remove', () => {
    it('should call remove and return void', async () => {
      (service.remove as jest.Mock).mockResolvedValue(undefined);
      await controller.remove(mockClientResponse.id);
      expect(service.remove).toHaveBeenCalledWith(mockClientResponse.id);
    });
  });

  describe('migrateProcurementDocumentsToS3', () => {
    it('should delegate to service', async () => {
      (service.migrateProcurementLocalDocumentsToS3 as jest.Mock).mockResolvedValue({
        migratedCount: 3,
      });
      const result = await controller.migrateProcurementDocumentsToS3(
        mockClientResponse.id,
        'actor-1',
        meta,
      );
      expect(service.migrateProcurementLocalDocumentsToS3).toHaveBeenCalledWith(
        mockClientResponse.id,
        { actorUserId: 'actor-1', meta },
      );
      expect(result).toEqual({ migratedCount: 3 });
    });
  });
});
