import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';

/**
 * Authentification JWT (RFC-002) : login, refresh, logout.
 * Aucune route protégée ; les tokens sont émis ou révoqués ici.
 */
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  /** POST /auth/login — Connexion email/password ; retourne accessToken + refreshToken. */
  @Post('login')
  async login(@Body() dto: LoginDto) {
    return this.auth.login(dto.email, dto.password);
  }

  /** POST /auth/refresh — Nouveau couple de tokens ; invalide l’ancien refresh token. */
  @Post('refresh')
  async refresh(@Body() dto: RefreshDto) {
    return this.auth.refresh(dto.refreshToken);
  }

  /** POST /auth/logout — Révoque le refresh token fourni. */
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@Body() dto: RefreshDto): Promise<void> {
    await this.auth.logout(dto.refreshToken);
  }
}
