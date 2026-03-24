import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  StreamableFile,
  UnauthorizedException,
} from '@nestjs/common';
import { ClientUserStatus, RoleScope } from '@prisma/client';
import * as bcrypt from 'bcrypt';
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
import { MeAvatarStorageService } from './me-avatar.storage';
import { ALLOWED_AVATAR_MIME, MAX_AVATAR_BYTES } from './me.constants';
import { normalizeEmail } from './email-identity.util';

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
  createdAt: Date;
  updatedAt: Date;
}

/** Service profil et contexte client de l’utilisateur connecté. */
@Injectable()
export class MeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly securityLogs: SecurityLogsService,
    private readonly mfa: MfaService,
    private readonly avatarStorage: MeAvatarStorageService,
  ) {}

  /**
   * Liste des codes de permission de l'utilisateur pour le client donné
   * (via UserRole → Role → RolePermission → Permission.code). Utilisé par le frontend pour afficher/masquer les actions.
   */
  async getPermissionCodes(userId: string, clientId: string): Promise<string[]> {
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
    return Array.from(codes);
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
    const rows = await this.prisma.userEmailIdentity.findMany({
      where: { userId },
      orderBy: [{ createdAt: 'asc' }],
    });
    return rows.map((r) => ({
      id: r.id,
      email: r.email,
      displayName: r.displayName,
      replyToEmail: r.replyToEmail,
      isVerified: r.isVerified,
      isActive: r.isActive,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    }));
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
    return this.toMeEmailIdentity(row);
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
    return this.toMeEmailIdentity(row);
  }

  async deleteEmailIdentity(userId: string, identityId: string): Promise<void> {
    const existing = await this.prisma.userEmailIdentity.findFirst({
      where: { id: identityId, userId },
    });
    if (!existing) {
      throw new NotFoundException('Identité e-mail introuvable');
    }
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

  private toMeEmailIdentity(row: {
    id: string;
    email: string;
    displayName: string | null;
    replyToEmail: string | null;
    isVerified: boolean;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  }): MeEmailIdentity {
    return {
      id: row.id,
      email: row.email,
      displayName: row.displayName,
      replyToEmail: row.replyToEmail,
      isVerified: row.isVerified,
      isActive: row.isActive,
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
      select: { id: true, email: true, passwordHash: true },
    });
    if (!user) {
      throw new NotFoundException('Utilisateur non trouvé');
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
