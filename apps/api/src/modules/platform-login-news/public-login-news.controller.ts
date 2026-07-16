import { Controller, Get } from '@nestjs/common';
import { PlatformLoginNewsService } from './platform-login-news.service';

/**
 * Lecture publique du message de connexion (écran login, sans authentification).
 */
@Controller('auth/login-news')
export class PublicLoginNewsController {
  constructor(private readonly loginNews: PlatformLoginNewsService) {}

  @Get()
  get() {
    return this.loginNews.getPublic();
  }
}
