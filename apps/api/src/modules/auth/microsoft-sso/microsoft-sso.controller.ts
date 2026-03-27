import { Controller, Get, HttpStatus, Query, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { RequestMeta as RequestMetaDecorator } from '../../../common/decorators/request-meta.decorator';
import type { RequestMeta } from '../../../common/decorators/request-meta.decorator';
import { MicrosoftSsoService } from './microsoft-sso.service';
import { MicrosoftCallbackQueryDto } from './dto/microsoft-callback-query.dto';

@Controller('auth/microsoft')
export class MicrosoftSsoController {
  constructor(private readonly microsoftSso: MicrosoftSsoService) {}

  @Get('url')
  getAuthorizationUrl() {
    return this.microsoftSso.getAuthorizationUrl();
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
    this.sendOAuthResult(res, result.redirectUrl);
  }

  /**
   * Les en-têtes HTTP `Location` des 3xx ne doivent pas contenir de `#fragment`.
   * Le succès SSO met les jetons dans le fragment → page HTML + `location.replace`.
   */
  private sendOAuthResult(res: Response, redirectUrl: string): void {
    if (redirectUrl.includes('#')) {
      const safe = JSON.stringify(redirectUrl);
      res
        .status(200)
        .type('html')
        .send(
          `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"/><title>Connexion</title></head><body><script>location.replace(${safe});</script><p>Redirection…</p></body></html>`,
        );
      return;
    }
    res.redirect(HttpStatus.FOUND, redirectUrl);
  }
}
