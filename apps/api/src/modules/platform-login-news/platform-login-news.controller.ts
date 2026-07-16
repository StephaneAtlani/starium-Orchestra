import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PlatformAdminGuard } from '../../common/guards/platform-admin.guard';
import { UpdatePlatformLoginNewsDto } from './dto/update-platform-login-news.dto';
import { PlatformLoginNewsService } from './platform-login-news.service';

/**
 * Message d’actualité sur l’écran de connexion — administration plateforme.
 */
@Controller('platform/login-news')
@UseGuards(JwtAuthGuard, PlatformAdminGuard)
export class PlatformLoginNewsController {
  constructor(private readonly loginNews: PlatformLoginNewsService) {}

  @Get()
  get() {
    return this.loginNews.getAdmin();
  }

  @Patch()
  patch(@Body() dto: UpdatePlatformLoginNewsDto) {
    return this.loginNews.patch(dto);
  }
}
