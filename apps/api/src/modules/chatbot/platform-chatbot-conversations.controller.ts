import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PlatformAdminGuard } from '../../common/guards/platform-admin.guard';
import { PlatformChatbotService } from './platform-chatbot.service';
import { ListPlatformChatbotConversationsQueryDto } from './dto/list-platform-chatbot-conversations.query.dto';

@Controller('platform/chatbot/conversations')
@UseGuards(JwtAuthGuard, PlatformAdminGuard)
export class PlatformChatbotConversationsController {
  constructor(private readonly platformChatbot: PlatformChatbotService) {}

  @Get()
  list(@Query() query: ListPlatformChatbotConversationsQueryDto) {
    return this.platformChatbot.listPlatformConversations(query);
  }

  @Get(':id/messages')
  messages(@Param('id') id: string) {
    return this.platformChatbot.listPlatformConversationMessages(id);
  }
}
