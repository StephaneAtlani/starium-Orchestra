import { Injectable, InternalServerErrorException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { PrismaService } from '../../prisma/prisma.service';

export interface DefaultProfileDefinition {
  name: string;
  description: string;
  permissionCodes: string[];
}

const DEFAULT_PROFILES_PATH = path.join(
  process.cwd(),
  'prisma',
  'default-profiles.json',
);

@Injectable()
export class DefaultProfilesService {
  constructor(private readonly prisma: PrismaService) {}

  getProfilesDefinition(): DefaultProfileDefinition[] {
    const resolved = fs.existsSync(DEFAULT_PROFILES_PATH)
      ? DEFAULT_PROFILES_PATH
      : path.join(__dirname, '..', '..', '..', 'prisma', 'default-profiles.json');
    const raw = fs.readFileSync(resolved, 'utf-8');
    return JSON.parse(raw) as DefaultProfileDefinition[];
  }

  /**
   * Crée les rôles système par défaut pour un client (idempotent).
   * N'écrase jamais les permissions existantes d'un rôle déjà présent :
   * on ajoute uniquement les permissions manquantes.
   */
  async applyForClient(clientId: string): Promise<void> {
    const profiles = this.getProfilesDefinition();
    const prisma = this.prisma as any;
    const allPermissionCodes = Array.from(
      new Set(profiles.flatMap((profile) => profile.permissionCodes)),
    );
    const existingPermissions = await prisma.permission.findMany({
      where: { code: { in: allPermissionCodes } },
      select: { id: true, code: true },
    });
    const existingCodes = new Set(
      existingPermissions.map((p: { code: string }) => p.code),
    );
    const missingCodes = allPermissionCodes.filter((code) => !existingCodes.has(code));
    if (missingCodes.length > 0) {
      throw new InternalServerErrorException(
        `Permissions globales manquantes pour les profils par defaut: ${missingCodes.join(', ')}. Lancez le seed des modules/permissions.`,
      );
    }

    for (const profile of profiles) {
      let role = await prisma.role.findFirst({
        where: { clientId, name: profile.name },
      });
      if (!role) {
        role = await prisma.role.create({
          data: {
            clientId,
            name: profile.name,
            description: profile.description ?? null,
            isSystem: true,
          },
        });
      }

      const permissionIds = existingPermissions
        .filter((p: { code: string }) => profile.permissionCodes.includes(p.code))
        .map((p: { id: string }) => p.id);

      if (permissionIds.length > 0) {
        await prisma.rolePermission.createMany({
          data: permissionIds.map((permissionId: string) => ({
            roleId: role.id,
            permissionId,
          })),
          skipDuplicates: true,
        });
      }
    }
  }
}
