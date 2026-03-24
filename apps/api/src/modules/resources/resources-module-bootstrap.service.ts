import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

const DEFAULT_RESOURCE_ROLE_NAMES = [
  'Project Manager',
  'Developer',
  'Architect',
  'DSI',
  'Consultant',
] as const;

/**
 * Bootstrap idempotent à l’activation du module `resources` (RFC-RES-001).
 * RBAC : Resource Manager / Resource Viewer — aucune assignation UserRole automatique.
 * Métier : ResourceRole par défaut — jamais supprimés au disable module.
 */
@Injectable()
export class ResourcesModuleBootstrapService {
  private readonly logger = new Logger(ResourcesModuleBootstrapService.name);

  constructor(private readonly prisma: PrismaService) {}

  async bootstrapForClient(clientId: string): Promise<void> {
    const requiredPermissionCodes = [
      'resources.read',
      'resources.create',
      'resources.update',
    ] as const;
    const perms = await this.prisma.permission.findMany({
      where: {
        code: {
          in: [...requiredPermissionCodes],
        },
      },
      select: { id: true, code: true },
    });
    const byCode = new Map(perms.map((p) => [p.code, p.id]));
    const missing = requiredPermissionCodes.filter((code) => !byCode.has(code));
    if (missing.length > 0) {
      throw new InternalServerErrorException(
        `Permissions resources manquantes: ${missing.join(', ')}. Lancez le seed des modules/permissions.`,
      );
    }

    await this.ensureRbacRole({
      clientId,
      name: 'Resource Manager',
      permissionIds: [
        byCode.get('resources.read'),
        byCode.get('resources.create'),
        byCode.get('resources.update'),
      ].filter((x): x is string => !!x),
    });

    await this.ensureRbacRole({
      clientId,
      name: 'Resource Viewer',
      permissionIds: [byCode.get('resources.read')].filter(
        (x): x is string => !!x,
      ),
    });

    for (const name of DEFAULT_RESOURCE_ROLE_NAMES) {
      await this.prisma.resourceRole.upsert({
        where: {
          clientId_name: { clientId, name },
        },
        update: {},
        create: {
          clientId,
          name,
        },
      });
    }

    this.logger.log(`Bootstrap resources OK pour client ${clientId}`);
  }

  private async ensureRbacRole(params: {
    clientId: string;
    name: string;
    permissionIds: string[];
  }): Promise<void> {
    const { clientId, name, permissionIds } = params;
    void clientId;
    let role = await this.prisma.role.findFirst({
      where: { scope: 'GLOBAL', name },
    });
    if (!role) {
      role = await this.prisma.role.create({
        data: {
          clientId: null,
          scope: 'GLOBAL',
          name,
          isSystem: false,
        },
      });
    }
    const existing = await this.prisma.rolePermission.findMany({
      where: { roleId: role.id },
      select: { permissionId: true },
    });
    const have = new Set(existing.map((e) => e.permissionId));
    const toAdd = permissionIds.filter((id) => !have.has(id));
    if (toAdd.length > 0) {
      await this.prisma.rolePermission.createMany({
        data: toAdd.map((permissionId) => ({
          roleId: role.id,
          permissionId,
        })),
        skipDuplicates: true,
      });
    }
  }
}
