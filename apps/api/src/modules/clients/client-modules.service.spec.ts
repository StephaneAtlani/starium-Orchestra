import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ClientModulesService } from './client-modules.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';

describe('ClientModulesService', () => {
  let service: ClientModulesService;
  let prisma: any;

  const clientId = 'client-1';

  beforeEach(() => {
    prisma = {
      client: {
        findUnique: jest.fn(),
      },
      module: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
      },
      clientModule: {
        upsert: jest.fn(),
      },
    };

    const auditLogs: Partial<AuditLogsService> = {
      create: jest.fn(),
    };

    service = new ClientModulesService(prisma, auditLogs as AuditLogsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('listCatalogue', () => {
    it('renvoie les modules avec le bon select et tri', async () => {
      const modules = [
        {
          id: 'mod-1',
          code: 'budgets',
          name: 'Budgets',
          description: 'desc',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
      prisma.module.findMany.mockResolvedValue(modules);

      const result = await service.listCatalogue();

      expect(prisma.module.findMany).toHaveBeenCalledWith({
        orderBy: { code: 'asc' },
        select: {
          id: true,
          code: true,
          name: true,
          description: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
        },
      });
      expect(result).toEqual(modules);
    });
  });

  describe('listForClient', () => {
    it('lève NotFoundException si le client est inconnu', async () => {
      prisma.client.findUnique.mockResolvedValue(null);

      await expect(service.listForClient(clientId)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(prisma.module.findMany).not.toHaveBeenCalled();
    });

    it('retourne les modules avec statut pour le client', async () => {
      prisma.client.findUnique.mockResolvedValue({ id: clientId });
      prisma.module.findMany.mockResolvedValue([
        {
          id: 'mod-1',
          code: 'budgets',
          name: 'Budgets',
          description: 'd',
          isActive: true,
          clientModules: [{ status: 'ENABLED' }],
        },
        {
          id: 'mod-2',
          code: 'contracts',
          name: 'Contracts',
          description: null,
          isActive: true,
          clientModules: [],
        },
      ]);

      const result = await service.listForClient(clientId);

      expect(prisma.module.findMany).toHaveBeenCalled();
      expect(result).toEqual([
        {
          id: 'mod-1',
          code: 'budgets',
          name: 'Budgets',
          description: 'd',
          isActive: true,
          status: 'ENABLED',
        },
        {
          id: 'mod-2',
          code: 'contracts',
          name: 'Contracts',
          description: null,
          isActive: true,
          status: null,
        },
      ]);
    });
  });

  describe('activateModuleForClient', () => {
    const moduleRecord = {
      id: 'mod-1',
      code: 'budgets',
      name: 'Budgets',
      description: 'd',
      isActive: true,
    };

    it('lève NotFoundException si le module est inconnu', async () => {
      prisma.client.findUnique.mockResolvedValue({ id: clientId });
      prisma.module.findUnique.mockResolvedValue(null);

      await expect(
        service.activateModuleForClient({
          clientId,
          moduleCode: 'budgets',
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.clientModule.upsert).not.toHaveBeenCalled();
    });

    it('lève BadRequestException si le module est inactif globalement', async () => {
      prisma.client.findUnique.mockResolvedValue({ id: clientId });
      prisma.module.findUnique.mockResolvedValue({
        ...moduleRecord,
        isActive: false,
      });

      await expect(
        service.activateModuleForClient({
          clientId,
          moduleCode: 'budgets',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.clientModule.upsert).not.toHaveBeenCalled();
    });

    it('crée ou met à jour le ClientModule avec statut ENABLED', async () => {
      prisma.client.findUnique.mockResolvedValue({ id: clientId });
      prisma.module.findUnique.mockResolvedValue(moduleRecord);
      prisma.clientModule.upsert.mockResolvedValue({
        id: 'cm-1',
        clientId,
        moduleId: moduleRecord.id,
        status: 'ENABLED',
      });

      const result = await service.activateModuleForClient({
        clientId,
        moduleCode: 'budgets',
      });

      expect(prisma.clientModule.upsert).toHaveBeenCalledWith({
        where: {
          clientId_moduleId: {
            clientId,
            moduleId: moduleRecord.id,
          },
        },
        create: {
          clientId,
          moduleId: moduleRecord.id,
          status: 'ENABLED',
        },
        update: {
          status: 'ENABLED',
        },
      });
      expect(result).toEqual({
        id: moduleRecord.id,
        code: moduleRecord.code,
        name: moduleRecord.name,
        description: moduleRecord.description,
        isActive: moduleRecord.isActive,
        status: 'ENABLED',
      });
    });
  });

  describe('updateClientModuleStatus', () => {
    const moduleRecord = {
      id: 'mod-1',
      code: 'budgets',
      name: 'Budgets',
      description: null,
      isActive: true,
    };

    it('met à jour le statut demandé', async () => {
      prisma.client.findUnique.mockResolvedValue({ id: clientId });
      prisma.module.findUnique.mockResolvedValue(moduleRecord);
      prisma.clientModule.upsert.mockResolvedValue({
        id: 'cm-1',
        clientId,
        moduleId: moduleRecord.id,
        status: 'DISABLED',
      });

      const result = await service.updateClientModuleStatus({
        clientId,
        moduleCode: 'budgets',
        status: 'DISABLED',
      });

      expect(prisma.clientModule.upsert).toHaveBeenCalledWith({
        where: {
          clientId_moduleId: {
            clientId,
            moduleId: moduleRecord.id,
          },
        },
        create: {
          clientId,
          moduleId: moduleRecord.id,
          status: 'DISABLED',
        },
        update: { status: 'DISABLED' },
      });
      expect(result.status).toBe('DISABLED');
    });
  });
});

