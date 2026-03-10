import { Test, TestingModule } from '@nestjs/testing';
import { PlatformUsersController } from './platform-users.controller';
import { UsersService } from './users.service';

describe('PlatformUsersController', () => {
  let controller: PlatformUsersController;
  let usersService: jest.Mocked<UsersService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PlatformUsersController],
      providers: [
        {
          provide: UsersService,
          useValue: {
            listPlatformUsers: jest.fn(),
            createPlatformUser: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<PlatformUsersController>(PlatformUsersController);
    usersService = module.get(UsersService) as jest.Mocked<UsersService>;
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should delegate GET /platform/users to UsersService.listPlatformUsers', async () => {
    const users = [
      {
        id: 'u1',
        email: 'user1@test.fr',
        firstName: 'User',
        lastName: 'One',
        createdAt: new Date(),
        updatedAt: new Date(),
        platformRole: null,
      },
    ];
    usersService.listPlatformUsers.mockResolvedValue(users);

    const result = await controller.findAll();

    expect(usersService.listPlatformUsers).toHaveBeenCalledTimes(1);
    expect(result).toEqual(users);
  });
});

