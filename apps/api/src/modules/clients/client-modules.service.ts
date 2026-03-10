import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  AuditLogsService,
  CreateAuditLogInput,
} from '../audit-logs/audit-logs.service';
import { RequestMeta } from '../../common/decorators/request-meta.decorator';

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
  status: 'ENABLED' | 'DISABLED' | null;
}

@Injectable()
export class ClientModulesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogs: AuditLogsService,
  ) {}

  async listCatalogue(): Promise<ModuleCatalogueItem[]> {
    const prisma = this.prisma as any;

    const modules = await prisma.module.findMany({
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

    const prisma = this.prisma as any;

    const modules = await prisma.module.findMany({
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

    return modules.map((m: any) => ({
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
    context?: { actorUserId?: string; meta?: RequestMeta };
  }): Promise<ClientModuleItem> {
    const { clientId, moduleCode, context } = params;

    await this.ensureClientExists(clientId);
    const prisma = this.prisma as any;

    const module = await prisma.module.findUnique({
      where: { code: moduleCode },
    });
    if (!module) {
      throw new NotFoundException('Module non trouvé');
    }
    if (!module.isActive) {
      throw new BadRequestException('Module inactif sur la plateforme');
    }

    const clientModule = await prisma.clientModule.upsert({
      where: {
        clientId_moduleId: {
          clientId,
          moduleId: module.id,
        },
      },
      create: {
        clientId,
        moduleId: module.id,
        status: 'ENABLED',
      },
      update: {
        status: 'ENABLED',
      },
    });

    const result: ClientModuleItem = {
      id: module.id,
      code: module.code,
      name: module.name,
      description: module.description ?? null,
      isActive: module.isActive,
      status: clientModule.status,
    };
    await this.logClientModuleEvent('module.enabled', {
      clientId,
      moduleCode: module.code,
      status: clientModule.status,
      context,
    });
    return result;
  }

  async updateClientModuleStatus(params: {
    clientId: string;
    moduleCode: string;
    status: 'ENABLED' | 'DISABLED';
    context?: { actorUserId?: string; meta?: RequestMeta };
  }): Promise<ClientModuleItem> {
    const { clientId, moduleCode, status, context } = params;

    await this.ensureClientExists(clientId);
    const prisma = this.prisma as any;

    const module = await prisma.module.findUnique({
      where: { code: moduleCode },
    });
    if (!module) {
      throw new NotFoundException('Module non trouvé');
    }
    if (!module.isActive) {
      throw new BadRequestException('Module inactif sur la plateforme');
    }

    const clientModule = await prisma.clientModule.upsert({
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

    const result: ClientModuleItem = {
      id: module.id,
      code: module.code,
      name: module.name,
      description: module.description ?? null,
      isActive: module.isActive,
      status: clientModule.status,
    };
    const action =
      status === 'ENABLED' ? 'module.enabled' : ('module.disabled' as const);
    await this.logClientModuleEvent(action, {
      clientId,
      moduleCode: module.code,
      status: clientModule.status,
      context,
    });
    return result;
  }

  private async logClientModuleEvent(
    action: 'module.enabled' | 'module.disabled',
    params: {
      clientId: string;
      moduleCode: string;
      status: 'ENABLED' | 'DISABLED' | null;
      context?: { actorUserId?: string; meta?: RequestMeta };
    },
  ): Promise<void> {
    const { clientId, moduleCode, status, context } = params;
    if (!clientId) {
      return;
    }
    const input: CreateAuditLogInput = {
      clientId,
      userId: context?.actorUserId,
      action,
      resourceType: 'module',
      resourceId: moduleCode,
      newValue: {
        status,
      },
      ipAddress: context?.meta?.ipAddress,
      userAgent: context?.meta?.userAgent,
      requestId: context?.meta?.requestId,
    };
    await this.auditLogs.create(input);
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

