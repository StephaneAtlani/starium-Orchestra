import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface CreateSecurityLogInput {
  event: string;
  userId?: string;
  email?: string;
  success: boolean;
  reason?: string;
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
}

@Injectable()
export class SecurityLogsService {
  private readonly logger = new Logger(SecurityLogsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateSecurityLogInput): Promise<void> {
    try {
      await (this.prisma as any).securityLog.create({
        data: {
          event: data.event,
          userId: data.userId ?? null,
          email: data.email ?? null,
          success: data.success,
          reason: data.reason ?? null,
          ipAddress: data.ipAddress ?? null,
          userAgent: data.userAgent ?? null,
          requestId: data.requestId ?? null,
        },
      });
    } catch (error) {
      this.logger.error(
        `Failed to write security log "${data.event}" for user "${data.userId ?? data.email ?? 'unknown'}": ${
          (error as Error)?.message ?? error
        }`,
      );
    }
  }
}

