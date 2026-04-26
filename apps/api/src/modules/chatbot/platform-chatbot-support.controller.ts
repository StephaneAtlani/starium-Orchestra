import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PlatformAdminGuard } from '../../common/guards/platform-admin.guard';
import { RequestUserId } from '../../common/decorators/request-user.decorator';
import { PlatformChatbotService } from './platform-chatbot.service';
import { PostStariumFeedbackReplyDto } from './dto/post-starium-feedback-reply.dto';

@Controller('platform/chatbot/support')
@UseGuards(JwtAuthGuard, PlatformAdminGuard)
export class PlatformChatbotSupportController {
  constructor(private readonly platformChatbot: PlatformChatbotService) {}

  @Get('threads/:auditLogId')
  getThread(@Param('auditLogId') auditLogId: string) {
    return this.platformChatbot.getStariumFeedbackThread(auditLogId);
  }

  @Post('threads/:auditLogId/replies')
  postReply(
    @Param('auditLogId') auditLogId: string,
    @Body() dto: PostStariumFeedbackReplyDto,
    @RequestUserId() userId: string | undefined,
  ) {
    return this.platformChatbot.postStariumFeedbackReply(
      auditLogId,
      userId!,
      dto.message,
    );
  }

  @Get()
  list() {
    return this.platformChatbot.listAssistanceSupportRequests();
  }
}
