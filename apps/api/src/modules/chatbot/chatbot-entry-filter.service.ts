import { Injectable } from '@nestjs/common';
import { satisfiesPermission } from '@starium-orchestra/rbac-permissions';
import {
  ChatbotKnowledgeEntry,
  ChatbotKnowledgeScope,
  ClientUserRole,
} from '@prisma/client';
import { UserClientAccessService } from './user-client-access.service';

export type ChatbotEntryWithCategory = ChatbotKnowledgeEntry & {
  category?: { slug: string; name: string; icon: string | null } | null;
};

@Injectable()
export class ChatbotEntryFilterService {
  constructor(private readonly access: UserClientAccessService) {}

  /** Entrée catalogue active, périmètre scope, puis RBAC (module / permission / rôle). */
  async filterVisibleEntries(
    userId: string,
    clientId: string,
    entries: ChatbotEntryWithCategory[],
  ): Promise<ChatbotEntryWithCategory[]> {
    const [permissionCodes, clientUserRole] = await Promise.all([
      this.access.resolvePermissionCodes(userId, clientId),
      this.access.getClientUserRole(userId, clientId),
    ]);

    const moduleCodes = new Set<string>();
    for (const e of entries) {
      if (e.moduleCode) moduleCodes.add(e.moduleCode);
    }
    const moduleOk = new Map<string, boolean>();
    for (const code of moduleCodes) {
      moduleOk.set(
        code,
        await this.access.isModuleEnabledForClient(clientId, code),
      );
    }

    return entries.filter((e) =>
      this.isEntryVisibleSync(e, {
        clientId,
        permissionCodes,
        clientUserRole,
        moduleOk,
      }),
    );
  }

  isEntryVisibleSync(
    e: ChatbotKnowledgeEntry,
    ctx: {
      clientId: string;
      permissionCodes: Set<string>;
      clientUserRole: ClientUserRole | null;
      moduleOk: Map<string, boolean>;
    },
  ): boolean {
    if (!e.isActive || e.archivedAt) return false;
    if (e.scope === ChatbotKnowledgeScope.GLOBAL) {
      // ok
    } else if (e.scope === ChatbotKnowledgeScope.CLIENT) {
      if (e.clientId !== ctx.clientId) return false;
    } else {
      return false;
    }
    if (e.moduleCode) {
      if (!ctx.moduleOk.get(e.moduleCode)) return false;
    }
    if (e.requiredPermission) {
      if (!satisfiesPermission(ctx.permissionCodes, e.requiredPermission)) {
        return false;
      }
    }
    if (e.targetRole != null) {
      if (ctx.clientUserRole !== e.targetRole) return false;
    }
    return true;
  }
}
