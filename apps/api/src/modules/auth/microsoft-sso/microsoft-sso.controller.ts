import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { RequestMeta as RequestMetaDecorator } from '../../../common/decorators/request-meta.decorator';
import type { RequestMeta } from '../../../common/decorators/request-meta.decorator';
import { RequestUserId } from '../../../common/decorators/request-user.decorator';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { MicrosoftSsoService } from './microsoft-sso.service';
import { MicrosoftCallbackQueryDto } from './dto/microsoft-callback-query.dto';
import { MicrosoftSsoCompleteDto } from './dto/microsoft-sso-complete.dto';

@Controller('auth/microsoft')
export class MicrosoftSsoController {
  constructor(private readonly microsoftSso: MicrosoftSsoService) {}

  @Get('url')
  getAuthorizationUrl() {
    return this.microsoftSso.getAuthorizationUrl();
  }

  /** Après OAuth : verrouille le mot de passe pour le JWT courant (redondant avec le callback, même DB que le navigateur). */
  @Post('disable-password-login')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async disablePasswordLoginAfterMicrosoft(
    @RequestUserId() userId: string | undefined,
  ): Promise<void> {
    if (!userId) {
      throw new UnauthorizedException();
    }
    await this.microsoftSso.ensurePasswordLoginDisabledForUser(userId);
  }

  /**
   * Échange le code handoff opaque (query /login?handoff=) contre access + refresh.
   * Remplace l’ancien passage des jetons dans le #fragment (pattern phishing Safe Browsing).
   */
  @Post('complete')
  @HttpCode(HttpStatus.OK)
  async complete(@Body() dto: MicrosoftSsoCompleteDto) {
    return this.microsoftSso.completeHandoff(dto.handoff);
  }

  @Get('callback')
  async callback(
    @Query() query: MicrosoftCallbackQueryDto,
    @RequestMetaDecorator() meta: RequestMeta,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    const result = await this.microsoftSso.handleCallback(query, {
      ipAddress:
        meta.ipAddress ||
        req.socket?.remoteAddress ||
        req.ip ||
        'unknown',
      userAgent: meta.userAgent,
      requestId: meta.requestId,
    });
    // Toujours 302 (pas de HTML + script) — Location courte vers /login.
    res.redirect(HttpStatus.FOUND, result.redirectUrl);
  }
}
