import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ActiveClientGuard } from '../../common/guards/active-client.guard';
import { ActiveClientId } from '../../common/decorators/active-client.decorator';
import { RequestUserId } from '../../common/decorators/request-user.decorator';
import { RequestMeta } from '../../common/decorators/request-meta.decorator';
import { SetDefaultClientDto } from './dto/set-default-client.dto';
import { ChangeMyPasswordDto } from './dto/change-my-password.dto';
import { VerifyMfaEnrollDto } from './dto/verify-mfa-enroll.dto';
import { DisableMfaDto } from './dto/disable-mfa.dto';
import { UpdateMyProfileDto } from './dto/update-my-profile.dto';
import { CreateUserEmailIdentityDto } from './dto/create-user-email-identity.dto';
import { UpdateUserEmailIdentityDto } from './dto/update-user-email-identity.dto';
import { SetDefaultEmailIdentityDto } from './dto/set-default-email-identity.dto';
import { MeService } from './me.service';
import { MAX_AVATAR_BYTES } from './me.constants';

/**
 * Profil et contexte de l’utilisateur connecté (RFC-008, RFC-009-1).
 * Toutes les routes exigent un JWT valide.
 */
@Controller('me')
@UseGuards(JwtAuthGuard)
export class MeController {
  constructor(private readonly me: MeService) {}

  /** GET /me/permissions — Codes de permission pour le client actif (X-Client-Id requis). */
  @Get('permissions')
  @UseGuards(ActiveClientGuard)
  async getPermissions(
    @RequestUserId() userId: string | undefined,
    @ActiveClientId() clientId: string | undefined,
  ) {
    const codes = await this.me.getPermissionCodes(userId!, clientId!);
    return { permissionCodes: codes };
  }

  /** GET /me/human-resource — Ressource catalogue Humaine alignée sur l’utilisateur (email), pour saisie des temps. */
  @Get('human-resource')
  @UseGuards(ActiveClientGuard)
  getHumanResource(
    @RequestUserId() userId: string | undefined,
    @ActiveClientId() clientId: string | undefined,
  ) {
    return this.me.getHumanResourceCatalogId(userId!, clientId!);
  }

  /** GET /me — Profil global. */
  @Get()
  getProfile(@RequestUserId() userId?: string) {
    return this.me.getProfile(userId!);
  }

  /** PATCH /me/profile — Prénom, nom, service, poste, société, bureau. */
  @Patch('profile')
  updateProfile(
    @RequestUserId() userId: string | undefined,
    @Body() dto: UpdateMyProfileDto,
    @RequestMeta() meta: import('../../common/decorators/request-meta.decorator').RequestMeta,
  ) {
    return this.me.updateProfile(userId!, dto, meta);
  }

  /** GET /me/avatar — Photo de profil (JWT requis). */
  @Get('avatar')
  getAvatar(@RequestUserId() userId: string | undefined) {
    return this.me.getAvatarFile(userId!);
  }

  /** POST /me/avatar — Envoi photo (multipart field `file`). */
  @Post('avatar')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: MAX_AVATAR_BYTES } }),
  )
  uploadAvatar(
    @RequestUserId() userId: string | undefined,
    @UploadedFile() file: Express.Multer.File | undefined,
    @RequestMeta() meta: import('../../common/decorators/request-meta.decorator').RequestMeta,
  ) {
    return this.me.saveAvatar(userId!, file, meta);
  }

  /** DELETE /me/avatar — Supprime la photo. */
  @Delete('avatar')
  @HttpCode(HttpStatus.OK)
  removeAvatar(
    @RequestUserId() userId: string | undefined,
    @RequestMeta() meta: import('../../common/decorators/request-meta.decorator').RequestMeta,
  ) {
    return this.me.deleteAvatar(userId!, meta);
  }

  /** GET /me/clients — Liste des clients auxquels l’utilisateur a accès. */
  @Get('clients')
  getClients(@RequestUserId() userId?: string) {
    return this.me.getClients(userId!);
  }

  /** PATCH /me/clients/:clientId/default-email-identity — Adresse e-mail par défaut pour ce client. */
  @Patch('clients/:clientId/default-email-identity')
  setDefaultEmailIdentityForClient(
    @RequestUserId() userId: string | undefined,
    @Param('clientId') clientId: string,
    @Body() dto: SetDefaultEmailIdentityDto,
  ) {
    return this.me.setDefaultEmailIdentityForClient(userId!, clientId, dto);
  }

  /** GET /me/email-identities — Identités e-mail du compte. */
  @Get('email-identities')
  listEmailIdentities(@RequestUserId() userId?: string) {
    return this.me.listEmailIdentities(userId!);
  }

  /** POST /me/email-identities — Ajoute une identité e-mail. */
  @Post('email-identities')
  createEmailIdentity(
    @RequestUserId() userId: string | undefined,
    @Body() dto: CreateUserEmailIdentityDto,
  ) {
    return this.me.createEmailIdentity(userId!, dto);
  }

  /** PATCH /me/email-identities/:id — Met à jour une identité e-mail. */
  @Patch('email-identities/:id')
  updateEmailIdentity(
    @RequestUserId() userId: string | undefined,
    @Param('id') identityId: string,
    @Body() dto: UpdateUserEmailIdentityDto,
  ) {
    return this.me.updateEmailIdentity(userId!, identityId, dto);
  }

  /** DELETE /me/email-identities/:id — Supprime une identité e-mail. */
  @Delete('email-identities/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteEmailIdentity(
    @RequestUserId() userId: string | undefined,
    @Param('id') identityId: string,
  ) {
    await this.me.deleteEmailIdentity(userId!, identityId);
  }

  /** PATCH /me/default-client — Définit le client par défaut (RFC-009-1). */
  @Patch('default-client')
  setDefaultClient(
    @RequestUserId() userId: string | undefined,
    @Body() dto: SetDefaultClientDto,
  ) {
    return this.me.setDefaultClient(userId!, dto.clientId);
  }

  /** PATCH /me/password — Changement mot de passe (révoque les sessions). */
  @Patch('password')
  changePassword(
    @RequestUserId() userId: string | undefined,
    @Body() dto: ChangeMyPasswordDto,
    @RequestMeta() meta: import('../../common/decorators/request-meta.decorator').RequestMeta,
  ) {
    return this.me.changeMyPassword(userId!, dto, meta);
  }

  /** GET /me/2fa — État 2FA. */
  @Get('2fa')
  getTwoFactor(@RequestUserId() userId: string | undefined) {
    return this.me.getTwoFactorStatus(userId!);
  }

  /** POST /me/2fa/enroll — Démarre enrollment TOTP (QR + secret masqué). */
  @Post('2fa/enroll')
  enrollTwoFactor(@RequestUserId() userId: string | undefined) {
    return this.me.enrollTwoFactor(userId!);
  }

  /** POST /me/2fa/verify-enroll — Confirme le TOTP et retourne les codes de secours. */
  @Post('2fa/verify-enroll')
  verifyTwoFactorEnrollment(
    @RequestUserId() userId: string | undefined,
    @Body() dto: VerifyMfaEnrollDto,
    @RequestMeta() meta: import('../../common/decorators/request-meta.decorator').RequestMeta,
  ) {
    return this.me.verifyTwoFactorEnrollment(userId!, dto, meta);
  }

  /** POST /me/2fa/disable — Désactive la 2FA (révoque les sessions). */
  @Post('2fa/disable')
  @HttpCode(HttpStatus.OK)
  disableTwoFactor(
    @RequestUserId() userId: string | undefined,
    @Body() dto: DisableMfaDto,
    @RequestMeta() meta: import('../../common/decorators/request-meta.decorator').RequestMeta,
  ) {
    return this.me.disableTwoFactor(userId!, dto, meta);
  }
}
