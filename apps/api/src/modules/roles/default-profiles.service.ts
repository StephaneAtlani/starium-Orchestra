import { Injectable } from '@nestjs/common';
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
   * Crée ou met à jour les rôles par défaut pour un client (idempotent).
   * Les rôles existants avec le même nom ont leurs permissions mises à jour.
   */
  async applyForClient(clientId: string): Promise<void> {
    const profiles = this.getProfilesDefinition();
    const prisma = this.prisma as any;

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

      const permissions = await prisma.permission.findMany({
        where: { code: { in: profile.permissionCodes } },
        select: { id: true },
      });
      const permissionIds = permissions.map((p: { id: string }) => p.id);

      const tx: Promise<unknown>[] = [
        prisma.rolePermission.deleteMany({ where: { roleId: role.id } }),
      ];
      if (permissionIds.length > 0) {
        tx.push(
          prisma.rolePermission.createMany({
            data: permissionIds.map((permissionId: string) => ({
              roleId: role.id,
              permissionId,
            })),
          }),
        );
      }
      await prisma.$transaction(tx);
    }
  }
}
