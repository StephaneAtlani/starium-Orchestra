import { Controller, Get, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { MeService } from './me.service';

@Controller('email-identities')
export class EmailIdentitiesVerificationController {
  constructor(private readonly me: MeService) {}

  /**
   * GET /api/email-identities/verify?token=...
   * Route publique : aucun JWT requis.
   */
  @Get('verify')
  async verify(
    @Query('token') token: string | undefined,
    @Res() res: Response,
  ) {
    const redirectUrl = await this.me.verifyEmailIdentityVerificationToken(
      token,
    );
    return res.redirect(302, redirectUrl);
  }
}

