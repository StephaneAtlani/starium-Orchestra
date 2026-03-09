import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ClientModuleStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

export interface ModuleCatalogueItem {
  id: string;
  code: string;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ClientModuleItem {
  id: string;
  code: string;
  name: string;
  description: string | null;
  isActive: boolean;
  status: ClientModuleStatus | null;
}

@Injectable()
export class ClientModulesService {
  constructor(private readonly prisma: PrismaService) {}

  async listCatalogue(): Promise<ModuleCatalogueItem[]> {
    const modules = await this.prisma.module.findMany({
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

    return modules;
  }

  async listForClient(clientId: string): Promise<ClientModuleItem[]> {
    await this.ensureClientExists(clientId);

    const modules = await this.prisma.module.findMany({
      orderBy: { code: 'asc' },
      select: {
        id: true,
        code: true,
        name: true,
        description: true,
        isActive: true,
        clientModules: {
          where: { clientId },
          select: { status: true },
          take: 1,
        },
      },
    });

    return modules.map((m) => ({
      id: m.id,
      code: m.code,
      name: m.name,
      description: m.description,
      isActive: m.isActive,
      status: m.clientModules[0]?.status ?? null,
    }));
  }

  async activateModuleForClient(params: {
    clientId: string;
    moduleCode: string;
  }): Promise<ClientModuleItem> {
    const { clientId, moduleCode } = params;

    await this.ensureClientExists(clientId);
    const module = await this.prisma.module.findUnique({
      where: { code: moduleCode },
    });
    if (!module) {
      throw new NotFoundException('Module non trouvé');
    }
    if (!module.isActive) {
      throw new BadRequestException('Module inactif sur la plateforme');
    }

    const clientModule = await this.prisma.clientModule.upsert({
      where: {
        clientId_moduleId: {
          clientId,
          moduleId: module.id,
        },
      },
      create: {
        clientId,
        moduleId: module.id,
        status: ClientModuleStatus.ENABLED,
      },
      update: {
        status: ClientModuleStatus.ENABLED,
      },
    });

    return {
      id: module.id,
      code: module.code,
      name: module.name,
      description: module.description ?? null,
      isActive: module.isActive,
      status: clientModule.status,
    };
  }

  async updateClientModuleStatus(params: {
    clientId: string;
    moduleCode: string;
    status: ClientModuleStatus;
  }): Promise<ClientModuleItem> {
    const { clientId, moduleCode, status } = params;

    await this.ensureClientExists(clientId);
    const module = await this.prisma.module.findUnique({
      where: { code: moduleCode },
    });
    if (!module) {
      throw new NotFoundException('Module non trouvé');
    }
    if (!module.isActive) {
      throw new BadRequestException('Module inactif sur la plateforme');
    }

    const clientModule = await this.prisma.clientModule.upsert({
      where: {
        clientId_moduleId: {
          clientId,
          moduleId: module.id,
        },
      },
      create: {
        clientId,
        moduleId: module.id,
        status,
      },
      update: { status },
    });

    return {
      id: module.id,
      code: module.code,
      name: module.name,
      description: module.description ?? null,
      isActive: module.isActive,
      status: clientModule.status,
    };
  }

  private async ensureClientExists(clientId: string): Promise<void> {
    const client = await this.prisma.client.findUnique({
      where: { id: clientId },
      select: { id: true },
    });
    if (!client) {
      throw new NotFoundException('Client non trouvé');
    }
  }
}

