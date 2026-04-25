import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PlatformAdminGuard } from '../../common/guards/platform-admin.guard';
import { RequestUserId } from '../../common/decorators/request-user.decorator';
import { RequestMeta as RequestMetaDecorator } from '../../common/decorators/request-meta.decorator';
import { PlatformChatbotService } from './platform-chatbot.service';
import {
  CreateChatbotEntryDto,
  UpdateChatbotEntryDto,
} from './dto/create-chatbot-entry.dto';

@Controller('platform/chatbot/entries')
@UseGuards(JwtAuthGuard, PlatformAdminGuard)
export class PlatformChatbotEntriesController {
  constructor(private readonly platformChatbot: PlatformChatbotService) {}

  @Get()
  list() {
    return this.platformChatbot.listEntries();
  }

  @Post()
  create(
    @Body() dto: CreateChatbotEntryDto,
    @RequestUserId() userId: string | undefined,
  ) {
    return this.platformChatbot.createEntry(dto, userId!);
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.platformChatbot.getEntry(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateChatbotEntryDto,
    @RequestUserId() userId: string | undefined,
  ) {
    return this.platformChatbot.updateEntry(id, dto, userId!);
  }

  @Patch(':id/archive')
  archive(
    @Param('id') id: string,
    @RequestUserId() userId: string | undefined,
    @RequestMetaDecorator() meta: {
      ipAddress?: string;
      userAgent?: string;
      requestId?: string;
    },
  ) {
    return this.platformChatbot.archiveEntry(id, userId!, meta);
  }
}
