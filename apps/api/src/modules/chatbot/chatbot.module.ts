import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { AlertsModule } from '../alerts/alerts.module';
import { ChatbotController } from './chatbot.controller';
import { ChatbotService } from './chatbot.service';
import { ChatbotEntryFilterService } from './chatbot-entry-filter.service';
import { ChatbotMatchingService } from './chatbot-matching.service';
import { PlatformChatbotService } from './platform-chatbot.service';
import { PlatformChatbotEntriesController } from './platform-chatbot-entries.controller';
import { PlatformChatbotCategoriesController } from './platform-chatbot-categories.controller';
import { PlatformChatbotConversationsController } from './platform-chatbot-conversations.controller';
import { PlatformChatbotSupportController } from './platform-chatbot-support.controller';
import { UserClientAccessService } from './user-client-access.service';
import { ActiveClientGuard } from '../../common/guards/active-client.guard';
import { PlatformAdminGuard } from '../../common/guards/platform-admin.guard';

@Module({
  imports: [PrismaModule, AuthModule, AuditLogsModule, AlertsModule],
  exports: [UserClientAccessService, ChatbotEntryFilterService, ChatbotService],
  controllers: [
    ChatbotController,
    PlatformChatbotEntriesController,
    PlatformChatbotCategoriesController,
    PlatformChatbotConversationsController,
    PlatformChatbotSupportController,
  ],
  providers: [
    UserClientAccessService,
    ChatbotEntryFilterService,
    ChatbotMatchingService,
    ChatbotService,
    PlatformChatbotService,
    ActiveClientGuard,
    PlatformAdminGuard,
  ],
})
export class ChatbotModule {}
