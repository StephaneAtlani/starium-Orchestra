import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import {
  MfaChallengeChannel,
  MfaChallengePurpose,
  Prisma,
} from '@prisma/client';
import bcrypt from '@/lib/bcrypt-compat';
import { randomBytes } from 'crypto';
import * as speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import { PrismaService } from '../../prisma/prisma.service';
import { RequestMeta } from '../../common/decorators/request-meta.decorator';
import { SecurityLogsService } from '../security-logs/security-logs.service';
import { MfaCryptoService } from './mfa-crypto.service';
import {
  MFA_CHALLENGE_TTL_MS,
  MFA_EMAIL_RESEND_COOLDOWN_MS,
  MFA_MAX_ATTEMPTS,
  MFA_RECOVERY_CODE_COUNT,
  MFA_TOTP_ISSUER,
} from './mfa.constants';

/** Fenêtre TOTP : ±1 pas de 30s (aligné Google Authenticator). */
const MFA_TOTP_WINDOW_STEPS = 1;

@Injectable()
export class MfaService {
  private readonly logger = new Logger(MfaService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: MfaCryptoService,
    private readonly securityLogs: SecurityLogsService,
  ) {}

  async isMfaTotpEnabled(userId: string): Promise<boolean> {
    const row = await this.prisma.userMfa.findUnique({
      where: { userId },
      select: { totpEnabledAt: true, totpPending: true, totpSecretEncrypted: true },
    });
    return !!(
      row?.totpSecretEncrypted &&
      row.totpEnabledAt &&
      !row.totpPending
    );
  }

  async createLoginChallenge(userId: string): Promise<{
    challengeId: string;
    expiresAt: Date;
  }> {
    await this.prisma.mfaChallenge.deleteMany({
      where: {
        userId,
        purpose: MfaChallengePurpose.LOGIN,
        consumedAt: null,
      },
    });
    const expiresAt = new Date(Date.now() + MFA_CHALLENGE_TTL_MS);
    const ch = await this.prisma.mfaChallenge.create({
      data: {
        userId,
        purpose: MfaChallengePurpose.LOGIN,
        channel: MfaChallengeChannel.TOTP,
        expiresAt,
      },
    });
    return { challengeId: ch.id, expiresAt: ch.expiresAt };
  }

  private async loadActiveLoginChallenge(challengeId: string) {
    const ch = await this.prisma.mfaChallenge.findFirst({
      where: {
        id: challengeId,
        purpose: MfaChallengePurpose.LOGIN,
        consumedAt: null,
      },
      include: { user: { select: { id: true, email: true } } },
    });
    if (!ch) {
      throw new UnauthorizedException('Challenge MFA invalide ou expiré');
    }
    if (ch.expiresAt < new Date()) {
      throw new UnauthorizedException('Challenge MFA expiré');
    }
    return ch;
  }

  private async bumpAttempts(challengeId: string): Promise<void> {
    const updated = await this.prisma.mfaChallenge.update({
      where: { id: challengeId },
      data: { attemptCount: { increment: 1 } },
      select: { attemptCount: true },
    });
    if (updated.attemptCount > MFA_MAX_ATTEMPTS) {
      throw new ForbiddenException('Trop de tentatives MFA');
    }
  }

  /**
   * Vérifie TOTP ou code de secours pour un challenge LOGIN ; retourne userId si OK.
   *
   * Le `channel` du challenge n'est JAMAIS vérifié ici : TOTP et recovery codes
   * restent utilisables quel que soit l'état du fallback email (RFC-SEC-001 §O3).
   *
   * Si le déchiffrement du secret TOTP échoue (clé MFA incohérente), les recovery
   * codes sont quand même testés (RFC-SEC-001 §O1).
   */
  async verifyLoginTotp(
    challengeId: string,
    otp: string,
    meta: RequestMeta,
  ): Promise<{ userId: string }> {
    const ch = await this.loadActiveLoginChallenge(challengeId);
    await this.bumpAttempts(challengeId);

    const mfa = await this.prisma.userMfa.findUnique({
      where: { userId: ch.userId },
    });
    if (!mfa?.totpSecretEncrypted || !mfa.totpEnabledAt || mfa.totpPending) {
      throw new BadRequestException('2FA non configurée');
    }

    const normalized = otp.replace(/\s/g, '');
    let ok = false;
    let decryptFailed = false;
    let usedRecovery = false;

    try {
      const secret = this.crypto.decrypt(mfa.totpSecretEncrypted);
      ok = speakeasy.totp.verify({
        secret,
        encoding: 'base32',
        token: normalized,
        window: MFA_TOTP_WINDOW_STEPS,
      });
    } catch {
      decryptFailed = true;
    }

    if (!ok && mfa.backupCodesHashes) {
      const hashes = mfa.backupCodesHashes as string[];
      if (Array.isArray(hashes)) {
        for (let i = 0; i < hashes.length; i++) {
          const match = await bcrypt.compare(normalized, hashes[i]);
          if (match) {
            const next = [...hashes];
            next.splice(i, 1);
            await this.prisma.userMfa.update({
              where: { userId: ch.userId },
              data: {
                backupCodesHashes:
                  next.length > 0
                    ? (next as unknown as Prisma.InputJsonValue)
                    : Prisma.JsonNull,
              },
            });
            ok = true;
            usedRecovery = true;
            break;
          }
        }
      }
    }

    if (!ok) {
      await this.securityLogs.create({
        event: 'auth.mfa.failure',
        userId: ch.userId,
        email: ch.user.email,
        success: false,
        reason: decryptFailed ? 'decrypt_failed_and_invalid_code' : 'invalid_totp',
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
        requestId: meta.requestId,
      });
      throw new UnauthorizedException('Code MFA invalide');
    }

    if (usedRecovery && decryptFailed) {
      this.logger.warn(
        `[MFA] User ${ch.userId} authenticated via recovery code (TOTP decrypt failed)`,
      );
    }

    await this.prisma.mfaChallenge.update({
      where: { id: challengeId },
      data: { consumedAt: new Date() },
    });

    const event = usedRecovery ? 'auth.mfa.recovery_success' : 'auth.mfa.success';
    await this.securityLogs.create({
      event,
      userId: ch.userId,
      email: ch.user.email,
      success: true,
      ...(usedRecovery
        ? { reason: decryptFailed ? 'recovery_decrypt_failed' : 'recovery' }
        : {}),
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
      requestId: meta.requestId,
    });

    return { userId: ch.userId };
  }

  /**
   * Envoie un OTP email pour le fallback (challenge LOGIN doit exister).
   */
  async sendLoginEmailOtp(challengeId: string, meta: RequestMeta): Promise<void> {
    const ch = await this.loadActiveLoginChallenge(challengeId);
    if (ch.emailSentAt) {
      const elapsed = Date.now() - ch.emailSentAt.getTime();
      if (elapsed < MFA_EMAIL_RESEND_COOLDOWN_MS) {
        throw new HttpException(
          'Réessayez dans une minute pour un nouvel envoi',
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
    }

    const code = String(Math.floor(100000 + Math.random() * 900000));
    const codeHash = await bcrypt.hash(code, 10);

    await this.prisma.mfaChallenge.update({
      where: { id: challengeId },
      data: {
        channel: MfaChallengeChannel.EMAIL,
        otpCodeHash: codeHash,
        emailSentAt: new Date(),
        attemptCount: 0,
      },
    });

    const user = await this.prisma.user.findUnique({
      where: { id: ch.userId },
      select: { email: true },
    });
    if (!user) {
      throw new NotFoundException('Utilisateur non trouvé');
    }

    await this.deliverEmailOtp(user.email, code);

    await this.securityLogs.create({
      event: 'auth.mfa.email_otp_sent',
      userId: ch.userId,
      email: user.email,
      success: true,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
      requestId: meta.requestId,
    });
  }

  async verifyLoginEmailOtp(
    challengeId: string,
    code: string,
    meta: RequestMeta,
  ): Promise<{ userId: string }> {
    const ch = await this.loadActiveLoginChallenge(challengeId);
    if (!ch.otpCodeHash || ch.channel !== MfaChallengeChannel.EMAIL) {
      throw new BadRequestException(
        'Aucun code email en attente ; demandez un envoi',
      );
    }
    await this.bumpAttempts(challengeId);

    const ok = await bcrypt.compare(code.replace(/\s/g, ''), ch.otpCodeHash);
    if (!ok) {
      await this.securityLogs.create({
        event: 'auth.mfa.failure',
        userId: ch.userId,
        email: ch.user.email,
        success: false,
        reason: 'invalid_email_otp',
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
        requestId: meta.requestId,
      });
      throw new UnauthorizedException('Code email invalide');
    }

    await this.prisma.mfaChallenge.update({
      where: { id: challengeId },
      data: { consumedAt: new Date() },
    });

    await this.securityLogs.create({
      event: 'auth.mfa.success',
      userId: ch.userId,
      email: ch.user.email,
      success: true,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
      requestId: meta.requestId,
    });

    return { userId: ch.userId };
  }

  /**
   * Vérifie un code de secours (recovery) pour un challenge LOGIN.
   * Ne vérifie JAMAIS ch.channel : les recovery codes sont toujours utilisables.
   * Ne tente PAS de déchiffrer le secret TOTP (indépendance totale).
   */
  async verifyLoginRecovery(
    challengeId: string,
    recoveryCode: string,
    meta: RequestMeta,
  ): Promise<{ userId: string }> {
    const ch = await this.loadActiveLoginChallenge(challengeId);
    await this.bumpAttempts(challengeId);

    const mfa = await this.prisma.userMfa.findUnique({
      where: { userId: ch.userId },
    });
    if (!mfa?.totpSecretEncrypted || !mfa.totpEnabledAt || mfa.totpPending) {
      throw new BadRequestException('2FA non configurée');
    }

    const normalized = recoveryCode.replace(/[\s-]/g, '').toUpperCase();
    let ok = false;

    if (mfa.backupCodesHashes) {
      const hashes = mfa.backupCodesHashes as string[];
      if (Array.isArray(hashes)) {
        for (let i = 0; i < hashes.length; i++) {
          const match = await bcrypt.compare(normalized, hashes[i]);
          if (match) {
            const next = [...hashes];
            next.splice(i, 1);
            await this.prisma.userMfa.update({
              where: { userId: ch.userId },
              data: {
                backupCodesHashes:
                  next.length > 0
                    ? (next as unknown as Prisma.InputJsonValue)
                    : Prisma.JsonNull,
              },
            });
            ok = true;
            break;
          }
        }
      }
    }

    if (!ok) {
      await this.securityLogs.create({
        event: 'auth.mfa.recovery_failure',
        userId: ch.userId,
        email: ch.user.email,
        success: false,
        reason: 'invalid_recovery_code',
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
        requestId: meta.requestId,
      });
      throw new UnauthorizedException('Code de secours invalide');
    }

    await this.prisma.mfaChallenge.update({
      where: { id: challengeId },
      data: { consumedAt: new Date() },
    });

    await this.securityLogs.create({
      event: 'auth.mfa.recovery_success',
      userId: ch.userId,
      email: ch.user.email,
      success: true,
      reason: 'recovery',
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
      requestId: meta.requestId,
    });

    return { userId: ch.userId };
  }

  private async deliverEmailOtp(to: string, code: string): Promise<void> {
    const smtpHost = process.env.SMTP_HOST?.trim();
    if (!smtpHost) {
      if (process.env.NODE_ENV === 'production') {
        throw new InternalServerErrorException(
          'SMTP_HOST non configuré — envoi email impossible',
        );
      }
      this.logger.warn(
        `[MFA] OTP email pour ${to} (définir SMTP_HOST pour envoi réel) : ${code}`,
      );
      return;
    }
    try {
      const nodemailer = await import('nodemailer');
      const port = Number(process.env.SMTP_PORT ?? '587');
      const secure = process.env.SMTP_SECURE === 'true';
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port,
        secure,
        auth: {
          user: process.env.SMTP_USER ?? '',
          pass: process.env.SMTP_PASS ?? '',
        },
      });
      await transporter.sendMail({
        from: process.env.SMTP_FROM ?? 'noreply@starium.local',
        to,
        subject: 'Code de connexion Starium Orchestra',
        text: `Votre code de connexion : ${code}\nIl expire dans 10 minutes.`,
      });
    } catch (e) {
      this.logger.error(
        `Échec envoi email OTP : ${(e as Error)?.message ?? e}`,
      );
      throw new InternalServerErrorException("Envoi de l'email impossible");
    }
  }

  async getTwoFactorStatus(userId: string): Promise<{
    enabled: boolean;
    pendingEnrollment: boolean;
  }> {
    const row = await this.prisma.userMfa.findUnique({
      where: { userId },
      select: { totpEnabledAt: true, totpPending: true },
    });
    return {
      enabled: !!(row?.totpEnabledAt && !row.totpPending),
      pendingEnrollment: !!row?.totpPending,
    };
  }

  async startTotpEnrollment(
    userId: string,
    email: string,
  ): Promise<{
    otpauthUrl: string;
    qrCodeDataUrl: string;
    secretMasked: string;
  }> {
    const existing = await this.prisma.userMfa.findUnique({
      where: { userId },
    });
    if (existing?.totpEnabledAt && !existing.totpPending) {
      throw new BadRequestException('La 2FA est déjà activée');
    }

    const gen = speakeasy.generateSecret({
      name: email,
      issuer: MFA_TOTP_ISSUER,
      length: 32,
      otpauth_url: true,
    });
    const secret = gen.base32;
    const encrypted = this.crypto.encrypt(secret);
    const keyVersion = this.crypto.getCurrentKeyVersion();

    await this.prisma.userMfa.upsert({
      where: { userId },
      create: {
        userId,
        totpSecretEncrypted: encrypted,
        keyVersion,
        totpPending: true,
      },
      update: {
        totpSecretEncrypted: encrypted,
        keyVersion,
        totpPending: true,
        totpEnabledAt: null,
        backupCodesHashes: Prisma.JsonNull,
      },
    });

    const otpauthUrl = gen.otpauth_url ?? '';
    const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);
    const secretMasked = `••••••••${secret.slice(-4)}`;

    return { otpauthUrl, qrCodeDataUrl, secretMasked };
  }

  async verifyTotpEnrollment(
    userId: string,
    otp: string,
    meta: RequestMeta,
  ): Promise<{ recoveryCodes: string[] }> {
    const mfa = await this.prisma.userMfa.findUnique({
      where: { userId },
      include: { user: { select: { email: true } } },
    });
    if (!mfa?.totpSecretEncrypted || !mfa.totpPending) {
      throw new BadRequestException('Aucun enrollment 2FA en cours');
    }

    let secret: string;
    try {
      secret = this.crypto.decrypt(mfa.totpSecretEncrypted);
    } catch {
      throw new InternalServerErrorException('Erreur lecture secret MFA');
    }

    const normalized = otp.replace(/\s/g, '');
    if (
      !speakeasy.totp.verify({
        secret,
        encoding: 'base32',
        token: normalized,
        window: MFA_TOTP_WINDOW_STEPS,
      })
    ) {
      await this.securityLogs.create({
        event: 'account.mfa.enroll_failure',
        userId,
        email: mfa.user.email,
        success: false,
        reason: 'invalid_totp',
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
        requestId: meta.requestId,
      });
      throw new UnauthorizedException('Code TOTP invalide');
    }

    const recoveryCodes: string[] = [];
    const hashes: string[] = [];
    for (let i = 0; i < MFA_RECOVERY_CODE_COUNT; i++) {
      const code = randomBytes(5).toString('hex').toUpperCase();
      recoveryCodes.push(code);
      hashes.push(await bcrypt.hash(code, 10));
    }

    await this.prisma.userMfa.update({
      where: { userId },
      data: {
        totpPending: false,
        totpEnabledAt: new Date(),
        backupCodesHashes: hashes as unknown as Prisma.InputJsonValue,
      },
    });

    await this.securityLogs.create({
      event: 'account.mfa.enabled',
      userId,
      email: mfa.user.email,
      success: true,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
      requestId: meta.requestId,
    });

    return { recoveryCodes };
  }

  async disableTotp(
    userId: string,
    currentPassword: string,
    otp: string,
    meta: RequestMeta,
  ): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { passwordHash: true, email: true },
    });
    if (!user) {
      throw new NotFoundException('Utilisateur non trouvé');
    }
    const pwdOk = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!pwdOk) {
      await this.securityLogs.create({
        event: 'account.mfa.disable_failure',
        userId,
        email: user.email,
        success: false,
        reason: 'invalid_password',
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
        requestId: meta.requestId,
      });
      throw new UnauthorizedException('Mot de passe incorrect');
    }

    const mfa = await this.prisma.userMfa.findUnique({ where: { userId } });
    if (!mfa?.totpSecretEncrypted || !mfa.totpEnabledAt || mfa.totpPending) {
      throw new BadRequestException('La 2FA n’est pas activée');
    }

    let secret: string;
    try {
      secret = this.crypto.decrypt(mfa.totpSecretEncrypted);
    } catch {
      throw new InternalServerErrorException('Erreur lecture secret MFA');
    }

    const normalized = otp.replace(/\s/g, '');
    let ok = speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token: normalized,
      window: MFA_TOTP_WINDOW_STEPS,
    });

    if (!ok && mfa.backupCodesHashes) {
      const hashes = mfa.backupCodesHashes as string[];
      if (Array.isArray(hashes)) {
        for (let i = 0; i < hashes.length; i++) {
          if (await bcrypt.compare(normalized, hashes[i])) {
            ok = true;
            break;
          }
        }
      }
    }

    if (!ok) {
      await this.securityLogs.create({
        event: 'account.mfa.disable_failure',
        userId,
        email: user.email,
        success: false,
        reason: 'invalid_otp',
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
        requestId: meta.requestId,
      });
      throw new UnauthorizedException('Code MFA invalide');
    }

    await this.prisma.trustedDevice.deleteMany({ where: { userId } });
    await this.prisma.userMfa.delete({ where: { userId } });
    await this.prisma.mfaChallenge.deleteMany({ where: { userId } });

    await this.securityLogs.create({
      event: 'account.mfa.disabled',
      userId,
      email: user.email,
      success: true,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
      requestId: meta.requestId,
    });
  }

  /**
   * Admin reset MFA : supprime toute la config MFA, sessions et devices d'un user.
   * Self-reset interdit. L'utilisateur cible devra reconfigurer sa 2FA au prochain login.
   */
  async adminResetMfa(
    targetUserId: string,
    adminUserId: string,
    meta: RequestMeta,
  ): Promise<void> {
    if (targetUserId === adminUserId) {
      throw new ForbiddenException('Impossible de réinitialiser sa propre MFA');
    }

    const mfa = await this.prisma.userMfa.findUnique({
      where: { userId: targetUserId },
    });
    if (!mfa?.totpEnabledAt || mfa.totpPending) {
      throw new BadRequestException('La 2FA n\'est pas activée pour cet utilisateur');
    }

    const targetUser = await this.prisma.user.findUnique({
      where: { id: targetUserId },
      select: { email: true },
    });

    await this.prisma.trustedDevice.deleteMany({ where: { userId: targetUserId } });
    await this.prisma.userMfa.delete({ where: { userId: targetUserId } });
    await this.prisma.mfaChallenge.deleteMany({ where: { userId: targetUserId } });
    await this.prisma.refreshToken.deleteMany({ where: { userId: targetUserId } });

    await this.securityLogs.create({
      event: 'admin.mfa.reset',
      userId: adminUserId,
      email: targetUser?.email,
      success: true,
      reason: `target:${targetUserId}`,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
      requestId: meta.requestId,
    });
  }
}
