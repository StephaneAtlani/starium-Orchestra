import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  HttpException,
  HttpStatus,
  NotFoundException,
  StreamableFile,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ClientUserStatus, RoleScope } from '@prisma/client';
import bcrypt from '@/lib/bcrypt-compat';
import { PrismaService } from '../../prisma/prisma.service';
import { SecurityLogsService } from '../security-logs/security-logs.service';
import { MfaService } from '../mfa/mfa.service';
import { RequestMeta } from '../../common/decorators/request-meta.decorator';
import { ChangeMyPasswordDto } from './dto/change-my-password.dto';
import { VerifyMfaEnrollDto } from './dto/verify-mfa-enroll.dto';
import { DisableMfaDto } from './dto/disable-mfa.dto';
import { UpdateMyProfileDto } from './dto/update-my-profile.dto';
import { CreateUserEmailIdentityDto } from './dto/create-user-email-identity.dto';
import { UpdateUserEmailIdentityDto } from './dto/update-user-email-identity.dto';
import { SetDefaultEmailIdentityDto } from './dto/set-default-email-identity.dto';
import { ModuleVisibilityService } from '../module-visibility/module-visibility.service';
import { ResourceTimesheetMonthsService } from '../resource-time-entries/resource-timesheet-months.service';
import { MeAvatarStorageService } from './me-avatar.storage';
import { ALLOWED_AVATAR_MIME, MAX_AVATAR_BYTES } from './me.constants';
import { normalizeEmail } from './email-identity.util';
import { EmailService } from '../email/email.service';
import { ConfigService } from '@nestjs/config';
import { createHash, randomBytes } from 'crypto';
import { uiPermissionHintsArray } from '@starium-orchestra/rbac-permissions';
import { FeatureFlagsService } from '../feature-flags/feature-flags.service';
import { ROLLOUT_FLAG_ENTRIES } from '../access-model/access-model.constants';

/** Rôle métier informatif (GET /me/permissions, RFC-ACL-014) — ne pas dériver les droits UI depuis ce tableau. */
export interface MeInformativeRole {
  id: string;
  name: string;
  /** Absent en schéma Prisma V1 ; réservé extension. */
  code: string | null;
  scope: import('@prisma/client').RoleScope;
  clientId: string | null;
}

/** Profil utilisateur exposé par GET /me (RFC-014-2 : inclut platformRole). */
export interface MeProfile {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  department: string | null;
  jobTitle: string | null;
  company: string | null;
  office: string | null;
  /** Indique si un fichier image est disponible via GET /me/avatar */
  hasAvatar: boolean;
  platformRole: 'PLATFORM_ADMIN' | null;
  /** false si la connexion email/mot de passe est désactivée (ex. Microsoft SSO). */
  passwordLoginEnabled: boolean;
}

/** Identité e-mail par défaut pour un client (extrait GET /me/clients). */
export interface MeDefaultEmailIdentity {
  id: string;
  email: string;
  displayName: string | null;
  isVerified: boolean;
  isActive: boolean;
}

/** Client accessible par l’utilisateur (GET /me/clients). RFC-009-1 : isDefault. */
export interface MeClient {
  id: string;
  name: string;
  slug: string;
  budgetAccountingEnabled: boolean;
  role: import('@prisma/client').ClientUserRole;
  status: import('@prisma/client').ClientUserStatus;
  isDefault: boolean;
  defaultEmailIdentityId: string | null;
  defaultEmailIdentity: MeDefaultEmailIdentity | null;
}

/** Identité e-mail (GET/PATCH /me/email-identities). */
export interface MeEmailIdentity {
  id: string;
  email: string;
  displayName: string | null;
  replyToEmail: string | null;
  isVerified: boolean;
  isActive: boolean;
  /** Alignée sur l’e-mail de connexion User.email (identité miroir / migration). */
  isAccountPrimary: boolean;
  /** Synchro annuaire (AD DS) — pas d’édition utilisateur. */
  directoryManaged: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Hors méthode d’instance : évite `this.getX is not a function` si le bundle
 * (Docker / cache) ne republie pas correctement les méthodes privées sur la classe.
 */
async function getAccountEmailNormalizedForUser(
  prisma: PrismaService,
  userId: string,
): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true },
  });
  if (!user) {
    throw new NotFoundException('Utilisateur introuvable');
  }
  return normalizeEmail(user.email);
}

/** Service profil et contexte client de l’utilisateur connecté. */
@Injectable()
export class MeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly securityLogs: SecurityLogsService,
    private readonly mfa: MfaService,
    private readonly avatarStorage: MeAvatarStorageService,
    private readonly timesheetMonths: ResourceTimesheetMonthsService,
    private readonly emailService: EmailService,
    private readonly config: ConfigService,
    private readonly moduleVisibility: ModuleVisibilityService,
    private readonly featureFlags: FeatureFlagsService,
  ) {}

  /**
   * RFC-ACL-024 — flags V2 informatifs UI pour le **client actif** uniquement.
   * Le backend (guards) reste la source de vérité.
   */
  async getAccessDecisionV2ForClient(
    clientId: string,
    httpRequest?: import('../../common/types/request-with-client').RequestWithClient,
  ): Promise<Record<string, boolean>> {
    const out: Record<string, boolean> = {};
    for (const entry of ROLLOUT_FLAG_ENTRIES) {
      out[entry.module] = await this.featureFlags.isEnabled(
        clientId,
        entry.flagKey,
        httpRequest,
      );
    }
    return out;
  }

  /** Ressource catalogue Humaine liée au compte (email membre client), pour saisie temps « mes saisies ». */
  async getHumanResourceCatalogId(
    userId: string,
    clientId: string,
  ): Promise<{ resourceId: string | null }> {
    const resourceId = await this.timesheetMonths.getHumanResourceIdForUser(clientId, userId);
    return { resourceId };
  }

  /**
   * Codes permission **bruts** (rôles + DB filtrés par modules activés) — seule source fiable pour aligner l’UI
   * sur les guards (`satisfiesPermission`). Ne pas confondre avec `uiPermissionHints` (RFC-ACL-015).
   */
  async getPermissionCodes(userId: string, clientId: string): Promise<string[]> {
    const { permissionCodes } = await this.getPermissionCodesWithUiHints(
      userId,
      clientId,
    );
    return permissionCodes;
  }

  /**
   * Bruts + hints UI (implications OWN/SCOPE/ALL pour affichage). Les hints **ne** prouvent **pas** l’accès API.
   */
  async getPermissionCodesWithUiHints(
    userId: string,
    clientId: string,
    httpRequest?: import('../../common/types/request-with-client').RequestWithClient,
  ): Promise<{
    permissionCodes: string[];
    uiPermissionHints: string[];
    accessDecisionV2: Record<string, boolean>;
  }> {
    const enabledClientModules = await this.prisma.clientModule.findMany({
      where: { clientId, status: 'ENABLED' },
      select: { moduleId: true },
    });
    const enabledModuleIds = new Set(
      enabledClientModules.map((cm) => cm.moduleId),
    );

    const userRoles = await this.prisma.userRole.findMany({
      where: {
        userId,
        role: {
          OR: [
            { scope: RoleScope.CLIENT, clientId },
            { scope: RoleScope.GLOBAL },
          ],
        },
      },
      include: {
        role: {
          include: {
            rolePermissions: {
              include: {
                permission: {
                  include: { module: true },
                },
              },
            },
          },
        },
      },
    });
    const codes = new Set<string>();
    for (const ur of userRoles) {
      for (const rp of ur.role.rolePermissions) {
        const p = rp.permission;
        if (!p?.code || !p.module) continue;
        if (!p.module.isActive) continue;
        if (!enabledModuleIds.has(p.moduleId)) continue;
        codes.add(p.code);
      }
    }
    const permissionCodes = Array.from(codes).sort((a, b) =>
      a.localeCompare(b, 'fr'),
    );
    const uiPermissionHints = uiPermissionHintsArray(permissionCodes);
    const accessDecisionV2 = await this.getAccessDecisionV2ForClient(
      clientId,
      httpRequest,
    );
    return { permissionCodes, uiPermissionHints, accessDecisionV2 };
  }

  /** Rôles UserRole liés au client (informatif uniquement). Les droits UI alignés sur les guards se lisent dans `permissionCodes` (bruts), pas dans `uiPermissionHints`. */
  async getInformativeRolesForClient(
    userId: string,
    clientId: string,
  ): Promise<MeInformativeRole[]> {
    const userRoles = await this.prisma.userRole.findMany({
      where: {
        userId,
        role: {
          OR: [
            { scope: RoleScope.CLIENT, clientId },
            { scope: RoleScope.GLOBAL },
          ],
        },
      },
      include: {
        role: { select: { id: true, name: true, scope: true, clientId: true } },
      },
    });
    const seen = new Set<string>();
    const out: MeInformativeRole[] = [];
    for (const ur of userRoles) {
      if (seen.has(ur.roleId)) continue;
      seen.add(ur.roleId);
      out.push({
        id: ur.role.id,
        name: ur.role.name,
        code: null,
        scope: ur.role.scope,
        clientId: ur.role.clientId,
      });
    }
    return out;
  }

  /**
   * Modules activés pour le client et visibles pour l’utilisateur (RFC-ACL-004),
   * pour filtrer la navigation côté frontend.
   */
  async getVisibleModuleCodes(
    userId: string,
    clientId: string,
  ): Promise<string[]> {
    return this.moduleVisibility.getVisibleModuleCodesForUser(userId, clientId);
  }

  /** Retourne le profil User (identité + champs métier + platformRole). */
  async getProfile(userId: string): Promise<MeProfile> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        department: true,
        jobTitle: true,
        company: true,
        office: true,
        avatarMimeType: true,
        platformRole: true,
        passwordLoginEnabled: true,
      },
    });
    if (!user) {
      throw new NotFoundException('Utilisateur non trouvé');
    }
    const hasAvatar = !!(
      user.avatarMimeType && this.avatarStorage.exists(userId)
    );
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      department: user.department,
      jobTitle: user.jobTitle,
      company: user.company,
      office: user.office,
      hasAvatar,
      platformRole: user.platformRole as 'PLATFORM_ADMIN' | null,
      passwordLoginEnabled: user.passwordLoginEnabled,
    };
  }

  private trimOrNull(
    v: string | null | undefined,
  ): string | null | undefined {
    if (v === undefined) return undefined;
    if (v === null) return null;
    const t = v.trim();
    return t === '' ? null : t;
  }

  /** Mise à jour des champs profil modifiables par l’utilisateur. */
  async updateProfile(
    userId: string,
    dto: UpdateMyProfileDto,
    meta: RequestMeta,
  ): Promise<MeProfile> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true },
    });
    if (!user) {
      throw new NotFoundException('Utilisateur non trouvé');
    }

    const data: Record<string, string | null> = {};
    if (dto.firstName !== undefined) {
      data.firstName = this.trimOrNull(dto.firstName) ?? null;
    }
    if (dto.lastName !== undefined) {
      data.lastName = this.trimOrNull(dto.lastName) ?? null;
    }
    if (dto.department !== undefined) {
      data.department = this.trimOrNull(dto.department) ?? null;
    }
    if (dto.jobTitle !== undefined) {
      data.jobTitle = this.trimOrNull(dto.jobTitle) ?? null;
    }
    if (dto.company !== undefined) {
      data.company = this.trimOrNull(dto.company) ?? null;
    }
    if (dto.office !== undefined) {
      data.office = this.trimOrNull(dto.office) ?? null;
    }

    if (Object.keys(data).length === 0) {
      return this.getProfile(userId);
    }

    await this.prisma.user.update({
      where: { id: userId },
      data,
    });

    await this.securityLogs.create({
      event: 'account.profile.updated',
      userId,
      email: user.email,
      success: true,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
      requestId: meta.requestId,
    });

    return this.getProfile(userId);
  }

  async saveAvatar(
    userId: string,
    file:
      | { buffer: Buffer; mimetype: string; size: number }
      | undefined,
    meta: RequestMeta,
  ): Promise<{ success: true }> {
    if (!file?.buffer?.length) {
      throw new BadRequestException('Fichier requis');
    }
    if (file.size > MAX_AVATAR_BYTES) {
      throw new BadRequestException('Photo trop volumineuse (max 2 Mo)');
    }
    const mime = file.mimetype;
    if (!mime || !ALLOWED_AVATAR_MIME.has(mime)) {
      throw new BadRequestException(
        'Format accepté : JPEG, PNG, WebP ou GIF',
      );
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });
    if (!user) {
      throw new NotFoundException('Utilisateur non trouvé');
    }

    await this.avatarStorage.write(userId, file.buffer);
    await this.prisma.user.update({
      where: { id: userId },
      data: { avatarMimeType: mime },
    });

    await this.securityLogs.create({
      event: 'account.avatar.updated',
      userId,
      email: user.email,
      success: true,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
      requestId: meta.requestId,
    });

    return { success: true };
  }

  async deleteAvatar(
    userId: string,
    meta: RequestMeta,
  ): Promise<{ success: true }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });
    if (!user) {
      throw new NotFoundException('Utilisateur non trouvé');
    }
    await this.avatarStorage.remove(userId);
    await this.prisma.user.update({
      where: { id: userId },
      data: { avatarMimeType: null },
    });
    await this.securityLogs.create({
      event: 'account.avatar.removed',
      userId,
      email: user.email,
      success: true,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
      requestId: meta.requestId,
    });
    return { success: true };
  }

  async getAvatarFile(userId: string): Promise<StreamableFile> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { avatarMimeType: true },
    });
    if (!user?.avatarMimeType || !this.avatarStorage.exists(userId)) {
      throw new NotFoundException('Aucune photo');
    }
    const stream = this.avatarStorage.createReadStream(userId);
    return new StreamableFile(stream, { type: user.avatarMimeType });
  }

  /** Liste des clients pour lesquels l’utilisateur a un ClientUser (défaut en premier). */
  async getClients(userId: string): Promise<MeClient[]> {
    const clientUsers = await this.prisma.clientUser.findMany({
      where: { userId },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            slug: true,
            budgetAccountingEnabled: true,
          },
        },
        defaultEmailIdentity: {
          select: {
            id: true,
            email: true,
            displayName: true,
            isVerified: true,
            isActive: true,
          },
        },
      },
      orderBy: [{ isDefault: 'desc' }, { client: { name: 'asc' } }],
    });
    return clientUsers
      .filter((cu) => cu.client)
      .map((cu) => ({
        id: cu.client!.id,
        name: cu.client!.name,
        slug: cu.client!.slug,
        budgetAccountingEnabled: cu.client!.budgetAccountingEnabled,
        role: cu.role,
        status: cu.status,
        isDefault: cu.isDefault,
        defaultEmailIdentityId: cu.defaultEmailIdentityId,
        defaultEmailIdentity: cu.defaultEmailIdentity
          ? {
              id: cu.defaultEmailIdentity.id,
              email: cu.defaultEmailIdentity.email,
              displayName: cu.defaultEmailIdentity.displayName,
              isVerified: cu.defaultEmailIdentity.isVerified,
              isActive: cu.defaultEmailIdentity.isActive,
            }
          : null,
      }));
  }

  /** Liste des identités e-mail du compte connecté. */
  async listEmailIdentities(userId: string): Promise<MeEmailIdentity[]> {
    const accountNorm = await getAccountEmailNormalizedForUser(
      this.prisma,
      userId,
    );
    const rows = await this.prisma.userEmailIdentity.findMany({
      where: { userId },
      orderBy: [{ createdAt: 'asc' }],
    });
    return rows.map((r) =>
      this.toMeEmailIdentity(r, accountNorm),
    );
  }

  async createEmailIdentity(
    userId: string,
    dto: CreateUserEmailIdentityDto,
  ): Promise<MeEmailIdentity> {
    const emailNormalized = normalizeEmail(dto.email);
    await this.assertEmailAvailableForUser(userId, emailNormalized);
    const replyTrimmed =
      dto.replyToEmail != null && dto.replyToEmail !== ''
        ? dto.replyToEmail.trim()
        : null;
    const row = await this.prisma.userEmailIdentity.create({
      data: {
        userId,
        email: dto.email.trim(),
        emailNormalized,
        displayName: dto.displayName ?? null,
        replyToEmail: replyTrimmed,
      },
    });

    // Vérification e-mail secondaire : token + enqueue e-mail (pas d’envoi SMTP synchrone).
    await this.issueEmailIdentityVerificationTokenAndEnqueueEmail({
      userId,
      emailIdentityId: row.id,
      email: row.email,
    });

    const accountNorm = await getAccountEmailNormalizedForUser(
      this.prisma,
      userId,
    );
    return this.toMeEmailIdentity(row, accountNorm);
  }

  private resolveEmailIdentityVerifyTtlMs(): number {
    const hoursRaw = this.config.get<string>('EMAIL_IDENTITY_VERIFY_TOKEN_TTL_HOURS');
    const hours = Number(hoursRaw);
    const ttlHours = Number.isFinite(hours) && hours > 0 ? hours : 24;
    return ttlHours * 3600_000;
  }

  private resolveEmailIdentityVerifyResendCooldownMs(): number {
    const isProd = (process.env.NODE_ENV ?? 'development') === 'production';
    const skipRaw = (
      process.env.STARIUM_SKIP_EMAIL_IDENTITY_RESEND_COOLDOWN ??
      this.config.get<string>('STARIUM_SKIP_EMAIL_IDENTITY_RESEND_COOLDOWN')
    )?.trim();
    const skipCooldown = skipRaw === '1' || skipRaw === 'true';
    if (!isProd && skipCooldown) {
      return 0;
    }

    const minutesRaw = this.config.get<string>('EMAIL_IDENTITY_VERIFY_RESEND_COOLDOWN_MINUTES');
    const minutes = Number(minutesRaw);
    const cooldownMinutes =
      Number.isFinite(minutes) && minutes >= 0 ? minutes : 15;
    return cooldownMinutes * 60_000;
  }

  /** Libellé FR pour le temps restant avant fin de cooldown (secondes entières, >= 1). */
  private formatFrenchResendCooldownRemaining(totalSeconds: number): string {
    const s = Math.max(1, Math.ceil(totalSeconds));
    if (s < 60) {
      return s === 1 ? '1 seconde' : `${s} secondes`;
    }
    const minutes = Math.floor(s / 60);
    const seconds = s % 60;
    if (seconds === 0) {
      return minutes === 1 ? '1 minute' : `${minutes} minutes`;
    }
    const minPart = minutes === 1 ? '1 minute' : `${minutes} minutes`;
    return seconds === 1
      ? `${minPart} et 1 seconde`
      : `${minPart} et ${seconds} secondes`;
  }

  private buildResendVerificationTooManyRequests(
    recentToken: { createdAt: Date },
    now: Date,
    cooldownMs: number,
    detailMessage: string,
  ): HttpException {
    const availableAt = recentToken.createdAt.getTime() + cooldownMs;
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((availableAt - now.getTime()) / 1000),
    );
    const waitFr = this.formatFrenchResendCooldownRemaining(retryAfterSeconds);
    return new HttpException(
      {
        statusCode: HttpStatus.TOO_MANY_REQUESTS,
        message: `${detailMessage} Temps restant : ${waitFr}.`,
        retryAfterSeconds,
      },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }

  private resolveVerifySuccessAndErrorUrls(): { successUrl: string; errorUrl: string } {
    const successUrl = this.config.get<string>('EMAIL_IDENTITY_VERIFY_SUCCESS_URL')?.trim();
    const errorUrl = this.config.get<string>('EMAIL_IDENTITY_VERIFY_ERROR_URL')?.trim();
    if (!successUrl || !errorUrl) {
      throw new ServiceUnavailableException(
        "Configuration de vérification e-mail manquante : définissez EMAIL_IDENTITY_VERIFY_SUCCESS_URL et EMAIL_IDENTITY_VERIFY_ERROR_URL.",
      );
    }
    return { successUrl, errorUrl };
  }

  private hashVerificationToken(tokenPlain: string): string {
    return createHash('sha256').update(tokenPlain).digest('hex');
  }

  private buildVerifyActionUrl(tokenPlain: string): string {
    const { successUrl } = this.resolveVerifySuccessAndErrorUrls();
    let origin: string;
    try {
      origin = new URL(successUrl).origin;
    } catch {
      origin = '';
    }
    if (!origin) {
      throw new ServiceUnavailableException(
        'EMAIL_IDENTITY_VERIFY_SUCCESS_URL doit être une URL absolue valide.',
      );
    }
    const token = encodeURIComponent(tokenPlain);
    return `${origin}/api/email-identities/verify?token=${token}`;
  }

  private async resolveClientIdForEmailDelivery(userId: string): Promise<string> {
    const row = await this.prisma.clientUser.findFirst({
      where: { userId, status: ClientUserStatus.ACTIVE },
      select: { clientId: true },
      orderBy: { isDefault: 'desc' },
    });
    if (!row?.clientId) {
      throw new NotFoundException(
        'Aucun client actif trouvé pour envoyer le lien de vérification.',
      );
    }
    return row.clientId;
  }

  private async issueEmailIdentityVerificationTokenAndEnqueueEmail(params: {
    userId: string;
    emailIdentityId: string;
    email: string;
  }): Promise<void> {
    const clientId = await this.resolveClientIdForEmailDelivery(params.userId);
    const tokenPlain = randomBytes(32).toString('base64url');
    const tokenHash = this.hashVerificationToken(tokenPlain);
    const expiresAt = new Date(Date.now() + this.resolveEmailIdentityVerifyTtlMs());

    await this.prisma.emailIdentityVerificationToken.create({
      data: {
        userId: params.userId,
        emailIdentityId: params.emailIdentityId,
        tokenHash,
        expiresAt,
      },
    });

    const verifyActionUrl = this.buildVerifyActionUrl(tokenPlain);
    await this.emailService.queueEmail({
      clientId,
      recipient: params.email,
      templateKey: 'email_identity_verify',
      title: 'Vérifier votre adresse e-mail',
      message: 'Cliquez sur le lien ci-dessous pour confirmer que vous contrôlez cette adresse.',
      actionUrl: verifyActionUrl,
      createdByUserId: params.userId,
    });

    await this.securityLogs.create({
      event: 'email.identity_verification.token_issued',
      userId: params.userId,
      email: params.email,
      success: true,
    });
  }

  /**
   * Resend verification: anti-spam + invalidation des anciens tokens non consommés.
   */
  async resendEmailIdentityVerification(userId: string, identityId: string): Promise<void> {
    const identity = await this.prisma.userEmailIdentity.findFirst({
      where: { id: identityId, userId },
      select: { id: true, email: true, isVerified: true, isActive: true },
    });
    if (!identity) {
      throw new NotFoundException('Identité e-mail introuvable');
    }
    if (!identity.isActive) {
      throw new BadRequestException('Identité e-mail inactive');
    }
    if (identity.isVerified) {
      throw new BadRequestException('Identité déjà vérifiée');
    }

    const now = new Date();
    const cooldownMs = this.resolveEmailIdentityVerifyResendCooldownMs();
    const cutoff = new Date(now.getTime() - cooldownMs);

    // Anti-spam identité : token valide récent => pas de resend, message dédié cooldown.
    const recentIdentityToken = await this.prisma.emailIdentityVerificationToken.findFirst({
      where: {
        emailIdentityId: identityId,
        consumedAt: null,
        expiresAt: { gt: now },
        createdAt: { gt: cutoff },
      },
      orderBy: { createdAt: 'desc' },
    });
    if (recentIdentityToken) {
      throw this.buildResendVerificationTooManyRequests(
        recentIdentityToken,
        now,
        cooldownMs,
        'Veuillez patienter avant de renvoyer le lien.',
      );
    }

    // Anti-spam user : trop de demandes récentes => rate limit.
    const recentUserToken = await this.prisma.emailIdentityVerificationToken.findFirst({
      where: {
        userId,
        consumedAt: null,
        expiresAt: { gt: now },
        createdAt: { gt: cutoff },
      },
      orderBy: { createdAt: 'desc' },
    });
    if (recentUserToken) {
      throw this.buildResendVerificationTooManyRequests(
        recentUserToken,
        now,
        cooldownMs,
        'Trop de tentatives de vérification.',
      );
    }

    const clientId = await this.resolveClientIdForEmailDelivery(userId);
    const tokenPlain = randomBytes(32).toString('base64url');
    const tokenHash = this.hashVerificationToken(tokenPlain);
    const expiresAt = new Date(now.getTime() + this.resolveEmailIdentityVerifyTtlMs());

    await this.prisma.$transaction(async (tx) => {
      // Invalidation proactive des tokens non consommés (ancien lien devient invalide).
      await tx.emailIdentityVerificationToken.updateMany({
        where: {
          emailIdentityId: identityId,
          consumedAt: null,
        },
        data: { consumedAt: now },
      });

      await tx.emailIdentityVerificationToken.create({
        data: {
          userId,
          emailIdentityId: identityId,
          tokenHash,
          expiresAt,
        },
      });
    });

    const verifyActionUrl = this.buildVerifyActionUrl(tokenPlain);
    await this.emailService.queueEmail({
      clientId,
      recipient: identity.email,
      templateKey: 'email_identity_verify',
      title: 'Vérifier votre adresse e-mail',
      message: 'Cliquez sur le lien ci-dessous pour confirmer que vous contrôlez cette adresse.',
      actionUrl: verifyActionUrl,
      createdByUserId: userId,
    });

    await this.securityLogs.create({
      event: 'email.identity_verification.token_resent',
      userId,
      email: identity.email,
      success: true,
    });
  }

  /**
   * Vérifie le token et passe l’identité en isVerified=true.
   * Retourne l’URL de redirection (succès ou erreur).
   */
  async verifyEmailIdentityVerificationToken(tokenPlain: string | undefined): Promise<string> {
    const { successUrl, errorUrl } = this.resolveVerifySuccessAndErrorUrls();
    if (!tokenPlain) return errorUrl;

    const now = new Date();
    const tokenHash = this.hashVerificationToken(tokenPlain);

    try {
      await this.prisma.$transaction(async (tx) => {
        const token = await tx.emailIdentityVerificationToken.findFirst({
          where: {
            tokenHash,
            consumedAt: null,
            expiresAt: { gt: now },
          },
          select: { emailIdentityId: true },
        });
        if (!token) {
          throw new BadRequestException('token_invalide');
        }

        const [tokenUpdated, identityUpdated] = await Promise.all([
          tx.emailIdentityVerificationToken.updateMany({
            where: { tokenHash, consumedAt: null },
            data: { consumedAt: now },
          }),
          tx.userEmailIdentity.updateMany({
            where: {
              id: token.emailIdentityId,
              isActive: true,
              isVerified: false,
            },
            data: { isVerified: true },
          }),
        ]);

        if (tokenUpdated.count !== 1 || identityUpdated.count !== 1) {
          throw new BadRequestException('token_invalide');
        }
      });

      return successUrl;
    } catch {
      return errorUrl;
    }
  }

  async updateEmailIdentity(
    userId: string,
    identityId: string,
    dto: UpdateUserEmailIdentityDto,
  ): Promise<MeEmailIdentity> {
    const existing = await this.prisma.userEmailIdentity.findFirst({
      where: { id: identityId, userId },
    });
    if (!existing) {
      throw new NotFoundException('Identité e-mail introuvable');
    }

    const accountNorm = await getAccountEmailNormalizedForUser(
      this.prisma,
      userId,
    );
    this.assertEmailIdentityUserEditable(accountNorm, existing);

    if (dto.isActive === false) {
      const used = await this.prisma.clientUser.count({
        where: { userId, defaultEmailIdentityId: identityId },
      });
      if (used > 0) {
        throw new ConflictException(
          'Cette identité est utilisée comme adresse par défaut sur au moins un client ; définissez une autre adresse par défaut avant de la désactiver.',
        );
      }
    }

    let emailNormalized = existing.emailNormalized;
    if (dto.email !== undefined) {
      emailNormalized = normalizeEmail(dto.email);
      await this.assertEmailAvailableForUser(userId, emailNormalized, identityId);
    }

    const replyToEmail =
      dto.replyToEmail === undefined
        ? undefined
        : dto.replyToEmail === null || dto.replyToEmail === ''
          ? null
          : dto.replyToEmail.trim();

    const row = await this.prisma.userEmailIdentity.update({
      where: { id: identityId },
      data: {
        ...(dto.email !== undefined
          ? { email: dto.email.trim(), emailNormalized }
          : {}),
        ...(dto.displayName !== undefined ? { displayName: dto.displayName } : {}),
        ...(replyToEmail !== undefined ? { replyToEmail } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
    });
    return this.toMeEmailIdentity(row, accountNorm);
  }

  async deleteEmailIdentity(userId: string, identityId: string): Promise<void> {
    const existing = await this.prisma.userEmailIdentity.findFirst({
      where: { id: identityId, userId },
    });
    if (!existing) {
      throw new NotFoundException('Identité e-mail introuvable');
    }
    const accountNorm = await getAccountEmailNormalizedForUser(
      this.prisma,
      userId,
    );
    this.assertEmailIdentityUserEditable(accountNorm, existing);

    const used = await this.prisma.clientUser.count({
      where: { userId, defaultEmailIdentityId: identityId },
    });
    if (used > 0) {
      throw new ConflictException(
        'Cette identité est utilisée comme adresse par défaut sur au moins un client ; définissez une autre adresse par défaut avant de supprimer.',
      );
    }
    await this.prisma.userEmailIdentity.delete({
      where: { id: identityId },
    });
  }

  async setDefaultEmailIdentityForClient(
    userId: string,
    clientId: string,
    dto: SetDefaultEmailIdentityDto,
  ): Promise<{
    success: true;
    clientId: string;
    defaultEmailIdentityId: string;
  }> {
    const cu = await this.prisma.clientUser.findUnique({
      where: { userId_clientId: { userId, clientId } },
    });
    if (!cu) {
      throw new ForbiddenException('Client not accessible');
    }
    const identity = await this.prisma.userEmailIdentity.findFirst({
      where: { id: dto.emailIdentityId, userId },
    });
    if (!identity) {
      throw new BadRequestException('Identité e-mail introuvable');
    }
    if (!identity.isActive) {
      throw new BadRequestException('Identité inactive');
    }

    await this.prisma.clientUser.update({
      where: { id: cu.id },
      data: { defaultEmailIdentityId: identity.id },
    });
    return {
      success: true,
      clientId,
      defaultEmailIdentityId: identity.id,
    };
  }

  /**
   * Identité miroir du login (migration) ou pilotée par l’annuaire : pas de modification utilisateur.
   */
  private assertEmailIdentityUserEditable(
    accountEmailNormalized: string,
    row: { emailNormalized: string; directoryManaged: boolean },
  ): void {
    if (row.emailNormalized === accountEmailNormalized) {
      throw new ForbiddenException(
        'L’adresse e-mail de connexion au compte ne peut pas être modifiée ou supprimée ici.',
      );
    }
    if (row.directoryManaged) {
      throw new ForbiddenException(
        'Cette adresse est gérée par l’annuaire d’entreprise (AD DS) et ne peut pas être modifiée ici.',
      );
    }
  }

  private toMeEmailIdentity(
    row: {
      id: string;
      email: string;
      emailNormalized: string;
      displayName: string | null;
      replyToEmail: string | null;
      isVerified: boolean;
      isActive: boolean;
      directoryManaged: boolean;
      createdAt: Date;
      updatedAt: Date;
    },
    accountEmailNormalized: string,
  ): MeEmailIdentity {
    return {
      id: row.id,
      email: row.email,
      displayName: row.displayName,
      replyToEmail: row.replyToEmail,
      isVerified: row.isVerified,
      isActive: row.isActive,
      isAccountPrimary: row.emailNormalized === accountEmailNormalized,
      directoryManaged: row.directoryManaged,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  /**
   * Évite les collisions avec le login d’un autre compte ou une identité déclarée par un autre user.
   */
  private async assertEmailAvailableForUser(
    userId: string,
    emailNormalized: string,
    excludeIdentityId?: string,
  ): Promise<void> {
    const otherLogin = await this.prisma.user.findFirst({
      where: {
        id: { not: userId },
        email: { equals: emailNormalized, mode: 'insensitive' },
      },
      select: { id: true },
    });
    if (otherLogin) {
      throw new ConflictException(
        'Cette adresse e-mail est déjà utilisée par un autre compte',
      );
    }

    const otherIdentity = await this.prisma.userEmailIdentity.findFirst({
      where: {
        userId: { not: userId },
        emailNormalized,
      },
    });
    if (otherIdentity) {
      throw new ConflictException(
        'Cette adresse e-mail est déjà enregistrée sur un autre compte',
      );
    }

    if (excludeIdentityId) {
      const dupSelf = await this.prisma.userEmailIdentity.findFirst({
        where: {
          userId,
          emailNormalized,
          id: { not: excludeIdentityId },
        },
      });
      if (dupSelf) {
        throw new ConflictException(
          'Vous avez déjà une identité avec cette adresse',
        );
      }
    }
  }

  /** Définit le client par défaut pour l’utilisateur (RFC-009-1). Un seul par user. */
  async setDefaultClient(
    userId: string,
    clientId: string,
  ): Promise<{ success: true; defaultClientId: string }> {
    const cu = await this.prisma.clientUser.findUnique({
      where: {
        userId_clientId: { userId, clientId },
      },
    });
    if (!cu) {
      throw new ForbiddenException('Client not accessible');
    }
    if (cu.status !== ClientUserStatus.ACTIVE) {
      throw new BadRequestException('Client not active');
    }
    await this.prisma.$transaction([
      this.prisma.clientUser.updateMany({
        where: { userId },
        data: { isDefault: false },
      }),
      this.prisma.clientUser.update({
        where: { id: cu.id },
        data: { isDefault: true },
      }),
    ]);
    return { success: true, defaultClientId: clientId };
  }

  /** Changement de mot de passe self-service ; révoque toutes les sessions refresh. */
  async changeMyPassword(
    userId: string,
    dto: ChangeMyPasswordDto,
    meta: RequestMeta,
  ): Promise<{ success: true }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, passwordHash: true, passwordLoginEnabled: true },
    });
    if (!user) {
      throw new NotFoundException('Utilisateur non trouvé');
    }
    if (!user.passwordLoginEnabled) {
      throw new BadRequestException(
        'Le mot de passe ne peut pas être modifié : ce compte utilise uniquement la connexion Microsoft.',
      );
    }
    const currentOk = await bcrypt.compare(
      dto.currentPassword,
      user.passwordHash,
    );
    if (!currentOk) {
      await this.securityLogs.create({
        event: 'account.password_change.failure',
        userId,
        email: user.email,
        success: false,
        reason: 'invalid_current_password',
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
        requestId: meta.requestId,
      });
      throw new UnauthorizedException('Mot de passe actuel incorrect');
    }
    if (dto.currentPassword === dto.newPassword) {
      throw new BadRequestException(
        'Le nouveau mot de passe doit être différent de l’actuel',
      );
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, 10);
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });
    await this.prisma.refreshToken.deleteMany({ where: { userId } });
    await this.prisma.trustedDevice.deleteMany({ where: { userId } });

    await this.securityLogs.create({
      event: 'account.password_change.success',
      userId,
      email: user.email,
      success: true,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
      requestId: meta.requestId,
    });

    return { success: true };
  }

  async getTwoFactorStatus(userId: string) {
    return this.mfa.getTwoFactorStatus(userId);
  }

  async enrollTwoFactor(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });
    if (!user) {
      throw new NotFoundException('Utilisateur non trouvé');
    }
    return this.mfa.startTotpEnrollment(userId, user.email);
  }

  async verifyTwoFactorEnrollment(
    userId: string,
    dto: VerifyMfaEnrollDto,
    meta: RequestMeta,
  ) {
    return this.mfa.verifyTotpEnrollment(userId, dto.otp, meta);
  }

  async disableTwoFactor(
    userId: string,
    dto: DisableMfaDto,
    meta: RequestMeta,
  ): Promise<{ success: true }> {
    await this.mfa.disableTotp(
      userId,
      dto.currentPassword,
      dto.otp,
      meta,
    );
    await this.prisma.refreshToken.deleteMany({ where: { userId } });
    return { success: true };
  }
}
