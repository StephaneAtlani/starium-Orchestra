import {
  ChatbotKnowledgeEntryType,
  ChatbotKnowledgeScope,
  ClientUserRole,
} from '@prisma/client';
import { ChatbotEntryFilterService } from './chatbot-entry-filter.service';
import type { UserClientAccessService } from './user-client-access.service';

describe('ChatbotEntryFilterService', () => {
  const access = {
    resolvePermissionCodes: jest.fn(),
    getClientUserRole: jest.fn(),
    isModuleEnabledForClient: jest.fn(),
  } as unknown as UserClientAccessService;

  const svc = new ChatbotEntryFilterService(access);

  const base = {
    id: 'e1',
    slug: 's',
    title: 'T',
    question: 'Q',
    answer: 'A',
    keywords: [] as string[],
    tags: [] as string[],
    moduleCode: null as string | null,
    targetRole: null as ClientUserRole | null,
    requiredPermission: null as string | null,
    categoryId: null,
    type: ChatbotKnowledgeEntryType.FAQ,
    scope: ChatbotKnowledgeScope.GLOBAL,
    clientId: null as string | null,
    isActive: true,
    archivedAt: null,
    priority: 0,
    isFeatured: false,
    isPopular: false,
    icon: null,
    content: null,
    searchText: null,
    indexedAt: null,
    structuredLinks: null,
    relatedEntryIds: [] as string[],
    createdByUserId: 'u1',
    updatedByUserId: 'u1',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  it('masque une entrée CLIENT d’un autre client', () => {
    const ok = svc.isEntryVisibleSync(
      {
        ...base,
        scope: ChatbotKnowledgeScope.CLIENT,
        clientId: 'c2',
      },
      {
        clientId: 'c1',
        permissionCodes: new Set(),
        clientUserRole: ClientUserRole.MEMBER,
        moduleOk: new Map(),
      },
    );
    expect(ok).toBe(false);
  });

  it('laisse passer une entrée CLIENT du client actif', () => {
    const ok = svc.isEntryVisibleSync(
      {
        ...base,
        scope: ChatbotKnowledgeScope.CLIENT,
        clientId: 'c1',
      },
      {
        clientId: 'c1',
        permissionCodes: new Set(),
        clientUserRole: ClientUserRole.MEMBER,
        moduleOk: new Map(),
      },
    );
    expect(ok).toBe(true);
  });

  it('filtre si le module est désactivé pour le client', () => {
    const ok = svc.isEntryVisibleSync(
      { ...base, moduleCode: 'budgets' },
      {
        clientId: 'c1',
        permissionCodes: new Set(['budgets.read']),
        clientUserRole: ClientUserRole.MEMBER,
        moduleOk: new Map([['budgets', false]]),
      },
    );
    expect(ok).toBe(false);
  });

  it('filtre si la permission requise est absente', () => {
    const ok = svc.isEntryVisibleSync(
      { ...base, requiredPermission: 'strategic_vision.manage_links' },
      {
        clientId: 'c1',
        permissionCodes: new Set(['strategic_vision.read']),
        clientUserRole: ClientUserRole.MEMBER,
        moduleOk: new Map(),
      },
    );
    expect(ok).toBe(false);
  });

  it('filterVisibleEntries charge le contexte et applique le filtre', async () => {
    (access.resolvePermissionCodes as jest.Mock).mockResolvedValue(
      new Set(['budgets.read']),
    );
    (access.getClientUserRole as jest.Mock).mockResolvedValue(
      ClientUserRole.MEMBER,
    );
    (access.isModuleEnabledForClient as jest.Mock).mockResolvedValue(true);

    const visible = await svc.filterVisibleEntries('u1', 'c1', [
      { ...base, id: 'ok', moduleCode: 'budgets' },
      {
        ...base,
        id: 'other-client',
        scope: ChatbotKnowledgeScope.CLIENT,
        clientId: 'c2',
      },
    ]);

    expect(visible.map((e) => e.id)).toEqual(['ok']);
  });
});
