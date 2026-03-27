import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { PasswordLoginEligibilityDto } from './dto/password-login-eligibility.dto';
import { RefreshDto } from './dto/refresh.dto';
import { MfaTotpVerifyDto } from './dto/mfa-totp-verify.dto';
import { MfaEmailSendDto } from './dto/mfa-email-send.dto';
import { MfaEmailVerifyDto } from './dto/mfa-email-verify.dto';
import { RequestMeta as RequestMetaDecorator, RequestMeta } from '../../common/decorators/request-meta.decorator';

/**
 * Authentification JWT (RFC-002) : login, refresh, logout.
 * Aucune route protégée ; les tokens sont émis ou révoqués ici.
 */
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  /** POST /auth/password-login-eligibility — UX : mot de passe autorisé pour cet email (compte Microsoft-only → false). */
  @Post('password-login-eligibility')
  @HttpCode(HttpStatus.OK)
  async passwordLoginEligibility(@Body() dto: PasswordLoginEligibilityDto) {
    return this.auth.getPasswordLoginEligibility(dto.email);
  }

  /** POST /auth/login — Connexion email/password ; tokens ou challenge MFA. */
  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @RequestMetaDecorator() meta: RequestMeta,
  ) {
    return this.auth.login(
      dto.email,
      dto.password,
      meta,
      dto.trustedDeviceToken,
    );
  }

  /** POST /auth/mfa/totp/verify — Finalise le login après TOTP / code de secours. */
  @Post('mfa/totp/verify')
  async verifyMfaTotp(
    @Body() dto: MfaTotpVerifyDto,
    @RequestMetaDecorator() meta: RequestMeta,
  ) {
    return this.auth.verifyMfaTotpAfterLogin(
      dto.challengeId,
      dto.otp,
      meta,
      dto.trustDevice,
    );
  }

  /** POST /auth/mfa/fallback-email/send — Envoie un OTP email pour le challenge courant. */
  @Post('mfa/fallback-email/send')
  @HttpCode(HttpStatus.NO_CONTENT)
  async sendMfaEmail(
    @Body() dto: MfaEmailSendDto,
    @RequestMetaDecorator() meta: RequestMeta,
  ): Promise<void> {
    await this.auth.sendMfaFallbackEmail(dto.challengeId, meta);
  }

  /** POST /auth/mfa/fallback-email/verify — Finalise le login avec le code email. */
  @Post('mfa/fallback-email/verify')
  async verifyMfaEmail(
    @Body() dto: MfaEmailVerifyDto,
    @RequestMetaDecorator() meta: RequestMeta,
  ) {
    return this.auth.verifyMfaEmailAfterLogin(
      dto.challengeId,
      dto.code,
      meta,
      dto.trustDevice,
    );
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
