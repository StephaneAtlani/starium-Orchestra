import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ActiveClientGuard } from '../../common/guards/active-client.guard';
import { ActiveClientId } from '../../common/decorators/active-client.decorator';
import { RequestUserId } from '../../common/decorators/request-user.decorator';
import { ChatbotService } from './chatbot.service';
import { PostChatbotMessageDto } from './dto/post-chatbot-message.dto';

@Controller('chatbot')
@UseGuards(JwtAuthGuard, ActiveClientGuard)
export class ChatbotController {
  constructor(private readonly chatbot: ChatbotService) {}

  @Post('message')
  postMessage(
    @RequestUserId() userId: string | undefined,
    @ActiveClientId() clientId: string | undefined,
    @Body() dto: PostChatbotMessageDto,
  ) {
    return this.chatbot.postMessage(
      userId!,
      clientId!,
      dto.text,
      dto.conversationId,
      dto.activeModuleCode,
    );
  }

  @Get('conversations')
  listConversations(
    @RequestUserId() userId: string | undefined,
    @ActiveClientId() clientId: string | undefined,
  ) {
    return this.chatbot.listConversations(userId!, clientId!);
  }

  @Get('conversations/:conversationId/messages')
  listMessages(
    @RequestUserId() userId: string | undefined,
    @ActiveClientId() clientId: string | undefined,
    @Param('conversationId') conversationId: string,
  ) {
    return this.chatbot.listMessages(userId!, clientId!, conversationId);
  }

  @Get('categories')
  listCategories(
    @RequestUserId() userId: string | undefined,
    @ActiveClientId() clientId: string | undefined,
  ) {
    return this.chatbot.listCategoriesPublic(userId!, clientId!);
  }

  @Get('categories/:slug/entries')
  listCategoryEntries(
    @RequestUserId() userId: string | undefined,
    @ActiveClientId() clientId: string | undefined,
    @Param('slug') slug: string,
  ) {
    return this.chatbot.listCategoryEntries(userId!, clientId!, slug);
  }

  @Get('entries/:slug')
  getEntry(
    @RequestUserId() userId: string | undefined,
    @ActiveClientId() clientId: string | undefined,
    @Param('slug') slug: string,
  ) {
    return this.chatbot.getEntryPublicBySlug(userId!, clientId!, slug);
  }

  @Get('explore')
  explore(
    @RequestUserId() userId: string | undefined,
    @ActiveClientId() clientId: string | undefined,
    @Query('q') q?: string,
  ) {
    return this.chatbot.explore(userId!, clientId!, q);
  }
}
