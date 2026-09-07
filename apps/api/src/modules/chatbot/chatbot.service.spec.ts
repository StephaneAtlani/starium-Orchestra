import { NotFoundException } from '@nestjs/common';
import { ChatbotMessageRole } from '@prisma/client';
import { ChatbotService } from './chatbot.service';
import type { ChatbotEntryFilterService } from './chatbot-entry-filter.service';
import type { ChatbotMatchingService } from './chatbot-matching.service';
import type { UserClientAccessService } from './user-client-access.service';
import type { AuditLogsService } from '../audit-logs/audit-logs.service';
import type { AlertsService } from '../alerts/alerts.service';

describe('ChatbotService — isolation / no-match / historique', () => {
  const prisma = {
    chatbotKnowledgeEntry: {
      findMany: jest.fn(),
    },
    chatbotConversation: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    chatbotMessage: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
    chatbotCategory: {
      findMany: jest.fn(),
    },
  };

  const entryFilter = {
    filterVisibleEntries: jest.fn(),
    isEntryVisibleSync: jest.fn().mockReturnValue(true),
  } as unknown as ChatbotEntryFilterService;

  const matching = {
    matchBest: jest.fn(),
  } as unknown as ChatbotMatchingService;

  const access = {
    resolvePermissionCodes: jest.fn().mockResolvedValue(new Set()),
    getClientUserRole: jest.fn().mockResolvedValue(null),
    isModuleEnabledForClient: jest.fn().mockResolvedValue(true),
  } as unknown as UserClientAccessService;

  const auditLogs = { create: jest.fn() } as unknown as AuditLogsService;
  const alerts = { create: jest.fn() } as unknown as AlertsService;

  let service: ChatbotService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ChatbotService(
      prisma as never,
      entryFilter,
      matching,
      access,
      auditLogs,
      alerts,
    );
    (entryFilter.filterVisibleEntries as jest.Mock).mockResolvedValue([]);
    (prisma.chatbotKnowledgeEntry.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.chatbotCategory.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.chatbotConversation.update as jest.Mock).mockResolvedValue({});
    (prisma.chatbotMessage.create as jest.Mock).mockResolvedValue({});
  });

  it('postMessage no-match → noAnswerFallbackUsed', async () => {
    (matching.matchBest as jest.Mock).mockReturnValue(null);
    (prisma.chatbotConversation.create as jest.Mock).mockResolvedValue({
      id: 'conv-1',
    });
    (prisma.chatbotKnowledgeEntry.findMany as jest.Mock).mockResolvedValue([]);

    const res = await service.postMessage('u1', 'c1', 'question inconnue xyz', undefined, undefined);

    expect(res.noAnswerFallbackUsed).toBe(true);
    expect(res.answer.length).toBeGreaterThan(0);
    expect(prisma.chatbotMessage.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          role: ChatbotMessageRole.ASSISTANT,
          noAnswerFallbackUsed: true,
          clientId: 'c1',
          userId: 'u1',
        }),
      }),
    );
  });

  it('refuse un conversationId hors client / user (NotFound)', async () => {
    (prisma.chatbotConversation.findFirst as jest.Mock).mockResolvedValue(null);

    await expect(
      service.postMessage('u1', 'c1', 'hello', 'conv-other-client', undefined),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(prisma.chatbotMessage.create).not.toHaveBeenCalled();
  });

  it('listConversations filtre strictement userId + clientId', async () => {
    (prisma.chatbotConversation.findMany as jest.Mock).mockResolvedValue([
      { id: 'c', title: 't', updatedAt: new Date(), createdAt: new Date() },
    ]);

    await service.listConversations('u1', 'c1');

    expect(prisma.chatbotConversation.findMany).toHaveBeenCalledWith({
      where: { userId: 'u1', clientId: 'c1' },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        title: true,
        updatedAt: true,
        createdAt: true,
      },
    });
  });

  it('listMessages refuse une conversation hors scope (fuite inter-client)', async () => {
    (prisma.chatbotConversation.findFirst as jest.Mock).mockResolvedValue(null);

    await expect(
      service.listMessages('u1', 'c1', 'conv-c2'),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(prisma.chatbotMessage.findMany).not.toHaveBeenCalled();
  });

  it('listMessages lit les messages seulement si conversation scoped', async () => {
    (prisma.chatbotConversation.findFirst as jest.Mock).mockResolvedValue({
      id: 'conv-1',
    });
    (prisma.chatbotMessage.findMany as jest.Mock).mockResolvedValue([
      {
        role: ChatbotMessageRole.USER,
        content: 'hi',
        noAnswerFallbackUsed: false,
        createdAt: new Date(),
        matchedEntry: null,
      },
    ]);

    const msgs = await service.listMessages('u1', 'c1', 'conv-1');

    expect(prisma.chatbotConversation.findFirst).toHaveBeenCalledWith({
      where: { id: 'conv-1', userId: 'u1', clientId: 'c1' },
    });
    expect(msgs).toHaveLength(1);
  });
});
