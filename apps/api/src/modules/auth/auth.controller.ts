import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { RequestMeta as RequestMetaDecorator, RequestMeta } from '../../common/decorators/request-meta.decorator';

/**
 * Authentification JWT (RFC-002) : login, refresh, logout.
 * Aucune route protégée ; les tokens sont émis ou révoqués ici.
 */
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  /** POST /auth/login — Connexion email/password ; retourne accessToken + refreshToken. */
  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @RequestMetaDecorator() meta: RequestMeta,
  ) {
    return this.auth.login(dto.email, dto.password, meta);
  }

  /** POST /auth/refresh — Nouveau couple de tokens ; invalide l’ancien refresh token. */
  @Post('refresh')
  async refresh(
    @Body() dto: RefreshDto,
    @RequestMetaDecorator() meta: RequestMeta,
  ) {
    return this.auth.refresh(dto.refreshToken, meta);
  }

  /** POST /auth/logout — Révoque le refresh token fourni. */
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(
    @Body() dto: RefreshDto,
    @RequestMetaDecorator() meta: RequestMeta,
  ): Promise<void> {
    await this.auth.logout(dto.refreshToken, meta);
  }
}
