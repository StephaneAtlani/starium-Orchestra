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
  CreateChatbotCategoryDto,
  UpdateChatbotCategoryDto,
} from './dto/create-chatbot-category.dto';

@Controller('platform/chatbot/categories')
@UseGuards(JwtAuthGuard, PlatformAdminGuard)
export class PlatformChatbotCategoriesController {
  constructor(private readonly platformChatbot: PlatformChatbotService) {}

  @Get()
  list() {
    return this.platformChatbot.listCategories();
  }

  @Post()
  create(@Body() dto: CreateChatbotCategoryDto) {
    return this.platformChatbot.createCategory(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateChatbotCategoryDto) {
    return this.platformChatbot.updateCategory(id, dto);
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
    return this.platformChatbot.archiveCategory(id, userId!, meta);
  }
}
