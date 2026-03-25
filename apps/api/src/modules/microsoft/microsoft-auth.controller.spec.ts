import { Test, TestingModule } from '@nestjs/testing';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ActiveClientGuard } from '../../common/guards/active-client.guard';
import { MicrosoftIntegrationAccessGuard } from '../../common/guards/microsoft-integration-access.guard';
import { MicrosoftAuthController } from './microsoft-auth.controller';
import { MicrosoftOAuthService } from './microsoft-oauth.service';

describe('MicrosoftAuthController', () => {
  let controller: MicrosoftAuthController;
  let oauth: MicrosoftOAuthService;
  const passGuard = { canActivate: () => true };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MicrosoftAuthController],
      providers: [
        {
          provide: MicrosoftOAuthService,
          useValue: {
            getAuthorizationUrl: jest.fn(),
            getActiveConnection: jest.fn(),
            revokeConnection: jest.fn(),
          },
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(passGuard)
      .overrideGuard(ActiveClientGuard)
      .useValue(passGuard)
      .overrideGuard(MicrosoftIntegrationAccessGuard)
      .useValue(passGuard)
      .compile();

    controller = module.get<MicrosoftAuthController>(MicrosoftAuthController);
    oauth = module.get<MicrosoftOAuthService>(MicrosoftOAuthService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('DELETE /connection (idempotence côté service)', () => {
    it('appelle revokeConnection deux fois sans erreur (révocation déjà vide)', async () => {
      (oauth.revokeConnection as jest.Mock).mockResolvedValue(undefined);

      await controller.revokeConnection('user-1', 'client-a');
      await controller.revokeConnection('user-1', 'client-a');

      expect(oauth.revokeConnection).toHaveBeenCalledTimes(2);
      expect(oauth.revokeConnection).toHaveBeenNthCalledWith(1, 'client-a', 'user-1');
      expect(oauth.revokeConnection).toHaveBeenNthCalledWith(2, 'client-a', 'user-1');
    });
  });

  describe('GET /connection', () => {
    it('retourne { connection } depuis getActiveConnection', async () => {
      (oauth.getActiveConnection as jest.Mock).mockResolvedValue({
        id: 'c1',
        tenantId: 'tid',
        tenantName: null,
        status: 'ACTIVE',
        tokenExpiresAt: null,
        connectedByUserId: 'u1',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await controller.getConnection('client-x');

      expect(oauth.getActiveConnection).toHaveBeenCalledWith('client-x');
      expect(result).toEqual({
        connection: expect.objectContaining({ id: 'c1', tenantId: 'tid' }),
      });
    });
  });

  describe('GET /auth/url', () => {
    it('délègue à getAuthorizationUrl avec user et client actifs', async () => {
      (oauth.getAuthorizationUrl as jest.Mock).mockResolvedValue({
        authorizationUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize?x=1',
      });

      const result = await controller.getAuthorizationUrl('user-z', 'client-z');

      expect(oauth.getAuthorizationUrl).toHaveBeenCalledWith('user-z', 'client-z');
      expect(result.authorizationUrl).toContain('login.microsoftonline.com');
    });
  });
});
