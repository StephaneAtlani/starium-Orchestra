/**
 * Seed kickoff Guide « Premiers pas » (GLOBAL, featured).
 * Inventaire : catégories auto-module (runtime) vs ce pack éditorial.
 * Suite contenu : B1.4 budget, B2.6 projets/capa, B3.1 pack 7 articles.
 */
import {
  ChatbotKnowledgeEntryType,
  ChatbotKnowledgeScope,
  PlatformRole,
  PrismaClient,
} from '@prisma/client';
import {
  PREMIERS_PAS_CATEGORY,
  PREMIERS_PAS_ENTRIES,
} from '../src/modules/chatbot/guide-premiers-pas.constants';

export {
  PREMIERS_PAS_CATEGORY,
  PREMIERS_PAS_ENTRIES,
} from '../src/modules/chatbot/guide-premiers-pas.constants';

export async function seedChatbotGuidePremiersPas(
  prisma: PrismaClient,
): Promise<void> {
  const admin = await prisma.user.findFirst({
    where: { platformRole: PlatformRole.PLATFORM_ADMIN },
    orderBy: { createdAt: 'asc' },
    select: { id: true },
  });
  if (!admin) {
    console.warn(
      '⏭️  Guide Premiers pas : aucun PLATFORM_ADMIN — seed chatbot ignoré',
    );
    return;
  }

  let category = await prisma.chatbotCategory.findFirst({
    where: {
      scope: ChatbotKnowledgeScope.GLOBAL,
      clientId: null,
      slug: PREMIERS_PAS_CATEGORY.slug,
    },
  });

  if (!category) {
    category = await prisma.chatbotCategory.create({
      data: {
        name: PREMIERS_PAS_CATEGORY.name,
        slug: PREMIERS_PAS_CATEGORY.slug,
        description: PREMIERS_PAS_CATEGORY.description,
        isFeatured: true,
        scope: ChatbotKnowledgeScope.GLOBAL,
        clientId: null,
        isActive: true,
        order: 0,
      },
    });
  } else {
    category = await prisma.chatbotCategory.update({
      where: { id: category.id },
      data: {
        name: PREMIERS_PAS_CATEGORY.name,
        description: PREMIERS_PAS_CATEGORY.description,
        isFeatured: true,
        isActive: true,
        archivedAt: null,
      },
    });
  }

  for (const entry of PREMIERS_PAS_ENTRIES) {
    const existing = await prisma.chatbotKnowledgeEntry.findFirst({
      where: {
        scope: ChatbotKnowledgeScope.GLOBAL,
        clientId: null,
        slug: entry.slug,
      },
    });

    const data = {
      title: entry.title,
      question: entry.question,
      answer: entry.answer,
      keywords: [...entry.keywords],
      tags: ['premiers-pas', 'onboarding'],
      type: ChatbotKnowledgeEntryType.FAQ,
      scope: ChatbotKnowledgeScope.GLOBAL,
      clientId: null,
      isActive: true,
      archivedAt: null,
      priority: 100,
      isFeatured: true,
      isPopular: true,
      content: entry.content,
      structuredLinks: entry.structuredLinks,
      categoryId: category.id,
      updatedByUserId: admin.id,
    };

    if (!existing) {
      await prisma.chatbotKnowledgeEntry.create({
        data: {
          ...data,
          slug: entry.slug,
          createdByUserId: admin.id,
        },
      });
    } else {
      await prisma.chatbotKnowledgeEntry.update({
        where: { id: existing.id },
        data,
      });
    }
  }

  console.log(
    `✅ Guide Premiers pas : catégorie « ${PREMIERS_PAS_CATEGORY.slug} » + ${PREMIERS_PAS_ENTRIES.length} articles`,
  );
}
