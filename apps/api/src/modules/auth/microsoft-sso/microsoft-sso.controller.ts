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
    res.redirect(HttpStatus.FOUND, result.redirectUrl);
  }
}
