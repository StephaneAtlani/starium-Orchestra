import { Test, TestingModule } from '@nestjs/testing';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PlatformAdminGuard } from '../../common/guards/platform-admin.guard';
import { ClientsController } from './clients.controller';
import { ClientMembershipService } from './client-membership.service';
import { ClientsService } from './clients.service';

describe('ClientsController', () => {
  let controller: ClientsController;
  let service: ClientsService;

  const mockClientResponse = {
    id: 'client-1',
    name: 'Client démo',
    slug: 'demo',
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
      (service.findAll as jest.Mock).mockResolvedValue([mockClientResponse]);
      const result = await controller.findAll();
      expect(service.findAll).toHaveBeenCalledWith();
      expect(result).toEqual([mockClientResponse]);
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
      const result = await controller.create(dto);
      expect(service.create).toHaveBeenCalledWith(dto, {
        actorUserId: undefined,
        meta: undefined,
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
      const result = await controller.update(mockClientResponse.id, {
        name: 'Updated',
      });
      expect(service.update).toHaveBeenCalledWith(
        mockClientResponse.id,
        {
          name: 'Updated',
        },
        {
          actorUserId: undefined,
          meta: undefined,
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
});
