import { Test, TestingModule } from '@nestjs/testing';
import { ClientUserRole, ClientUserStatus } from '@prisma/client';
import { ActiveClientGuard } from '../../common/guards/active-client.guard';
import { ClientAdminGuard } from '../../common/guards/client-admin.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

describe('UsersController', () => {
  let controller: UsersController;
  let service: UsersService;

  const clientId = 'client-1';
  const mockUserResponse = {
    id: 'user-1',
    email: 'jean@test.fr',
    firstName: 'Jean',
    lastName: 'Dupont',
    role: ClientUserRole.CLIENT_ADMIN,
    status: ClientUserStatus.ACTIVE,
  };

  const passGuard = { canActivate: () => true };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: {
            findAll: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
          },
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(passGuard)
      .overrideGuard(ActiveClientGuard)
      .useValue(passGuard)
      .overrideGuard(ClientAdminGuard)
      .useValue(passGuard)
      .compile();

    controller = module.get<UsersController>(UsersController);
    service = module.get<UsersService>(UsersService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should return 200 and list of users', async () => {
      (service.findAll as jest.Mock).mockResolvedValue([mockUserResponse]);
      const result = await controller.findAll(clientId);
      expect(service.findAll).toHaveBeenCalledWith(clientId);
      expect(result).toEqual([mockUserResponse]);
    });
  });

  describe('create', () => {
    it('should return 201 and created user', async () => {
      (service.create as jest.Mock).mockResolvedValue(mockUserResponse);
      const dto = {
        email: 'new@test.fr',
        firstName: 'New',
        lastName: 'User',
        role: ClientUserRole.CLIENT_USER,
        password: 'password12',
      };
      const result = await controller.create(clientId, dto);
      expect(service.create).toHaveBeenCalledWith(clientId, dto);
      expect(result).toEqual(mockUserResponse);
    });
  });

  describe('update', () => {
    it('should return 200 and updated user', async () => {
      (service.update as jest.Mock).mockResolvedValue({
        ...mockUserResponse,
        firstName: 'Updated',
      });
      const result = await controller.update(clientId, mockUserResponse.id, {
        firstName: 'Updated',
      });
      expect(service.update).toHaveBeenCalledWith(clientId, mockUserResponse.id, {
        firstName: 'Updated',
      });
      expect(result.firstName).toBe('Updated');
    });
  });

  describe('remove', () => {
    it('should call remove and return void', async () => {
      (service.remove as jest.Mock).mockResolvedValue(undefined);
      await controller.remove(clientId, mockUserResponse.id);
      expect(service.remove).toHaveBeenCalledWith(clientId, mockUserResponse.id);
    });
  });
});
