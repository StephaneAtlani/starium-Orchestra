import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { ChatbotModule } from '../chatbot/chatbot.module';
import { BudgetSearchAdapter } from './adapters/budget-search.adapter';
import { ChatbotSearchAdapter } from './adapters/chatbot-search.adapter';
import { ProjectSearchAdapter } from './adapters/project-search.adapter';
import type { SearchAdapter } from './search.adapter';
import { SearchController } from './search.controller';
import { SearchService } from './search.service';
import { SEARCH_ADAPTERS } from './search.tokens';

@Module({
  imports: [PrismaModule, ChatbotModule],
  controllers: [SearchController],
  providers: [
    SearchService,
    ProjectSearchAdapter,
    BudgetSearchAdapter,
    ChatbotSearchAdapter,
    {
      provide: SEARCH_ADAPTERS,
      useFactory: (
        projects: ProjectSearchAdapter,
        budgets: BudgetSearchAdapter,
        help: ChatbotSearchAdapter,
      ): SearchAdapter[] => [projects, budgets, help],
      inject: [ProjectSearchAdapter, BudgetSearchAdapter, ChatbotSearchAdapter],
    },
  ],
})
export class SearchModule {}
