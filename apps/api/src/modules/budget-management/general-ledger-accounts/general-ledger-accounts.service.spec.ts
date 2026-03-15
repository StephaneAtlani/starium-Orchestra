import { ConflictException, NotFoundException } from '@nestjs/common';
import { GeneralLedgerAccountsService } from './general-ledger-accounts.service';

describe('GeneralLedgerAccountsService', () => {
  let service: GeneralLedgerAccountsService;
  let prisma: any;
  let auditLogs: any;
  const clientId = 'client-1';

  beforeEach(() => {
    prisma = {
      generalLedgerAccount: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
    };
    auditLogs = { create: jest.fn().mockResolvedValue(undefined) };
    service = new GeneralLedgerAccountsService(prisma, auditLogs);
  });

  describe('create', () => {
    it('creates with unique code', async () => {
      prisma.generalLedgerAccount.findUnique.mockResolvedValue(null);
      prisma.generalLedgerAccount.create.mockResolvedValue({
        id: 'gla-1',
        clientId,
        code: '606000',
        name: 'Compte',
        description: null,
        isActive: true,
        sortOrder: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.create(
        clientId,
        { code: '606000', name: 'Compte' },
        { actorUserId: 'u1', meta: {} },
      );

      expect(result.code).toBe('606000');
      expect(prisma.generalLedgerAccount.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            clientId,
            code: '606000',
            name: 'Compte',
          }),
        }),
      );
      expect(auditLogs.create).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'general_ledger_account.created' }),
      );
    });

    it('rejects duplicate code', async () => {
      prisma.generalLedgerAccount.findUnique.mockResolvedValue({
        id: 'existing',
        clientId,
        code: '606000',
      });

      await expect(
        service.create(clientId, { code: '606000', name: 'Compte' }),
      ).rejects.toThrow(ConflictException);
      expect(prisma.generalLedgerAccount.create).not.toHaveBeenCalled();
    });
  });

  describe('getById', () => {
    it('returns 404 when not found', async () => {
      prisma.generalLedgerAccount.findFirst.mockResolvedValue(null);

      await expect(
        service.getById(clientId, 'gla-unknown'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
