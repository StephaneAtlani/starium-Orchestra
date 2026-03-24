import {
  Controller,
  Get,
  HttpStatus,
  Logger,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { MicrosoftOAuthService } from './microsoft-oauth.service';
import { MicrosoftCallbackRateLimitService } from './microsoft-callback-rate-limit.service';

@Controller('microsoft')
export class MicrosoftOAuthCallbackController {
  private readonly logger = new Logger(MicrosoftOAuthCallbackController.name);

  constructor(
    private readonly microsoftOAuth: MicrosoftOAuthService,
    private readonly rateLimit: MicrosoftCallbackRateLimitService,
  ) {}

  /** GET /api/microsoft/auth/callback — redirect Microsoft (sans JWT). */
  @Get('auth/callback')
  async oauthCallback(
    @Query() query: Record<string, string | undefined>,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    const ip =
      (typeof req.ip === 'string' && req.ip) ||
      (typeof req.headers['x-forwarded-for'] === 'string'
        ? req.headers['x-forwarded-for'].split(',')[0]?.trim()
        : null) ||
      req.socket?.remoteAddress ||
      'unknown';

    if (!this.rateLimit.tryConsume(ip)) {
      this.logger.warn(`Callback OAuth rate limited ip=${ip}`);
      res.redirect(
        HttpStatus.FOUND,
        this.microsoftOAuth.redirectUrlForRateLimit(),
      );
      return;
    }

    const { redirectUrl } = await this.microsoftOAuth.handleOAuthCallback(
      query,
    );
    res.redirect(HttpStatus.FOUND, redirectUrl);
  }
}
