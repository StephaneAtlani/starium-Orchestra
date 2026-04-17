import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ProcurementStorageDriver } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { ProcurementS3ConfigResolverService } from './procurement-s3-config.resolver.service';
import type { ResolvedProcurementS3Config } from './procurement-s3.types';

const SETTINGS_ID = 'default';

/** Valeur de `storageBucket` côté DB pour les pièces stockées sur disque (RFC-035). */
export const PROCUREMENT_LOCAL_BUCKET_SENTINEL = 'local';

export type ProcurementOperationContext =
  | { driver: 'LOCAL'; root: string }
  | { driver: 'S3'; config: ResolvedProcurementS3Config };

@Injectable()
export class ProcurementStorageResolutionService {
  private readonly logger = new Logger(ProcurementStorageResolutionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly s3Resolver: ProcurementS3ConfigResolverService,
  ) {}

  parseDriverFromEnv(): 'local' | 's3' | null {
    const raw = this.config.get<string>('PROCUREMENT_STORAGE_DRIVER')?.trim().toLowerCase();
    if (!raw) {
      return null;
    }
    if (raw === 'local') {
      return 'local';
    }
    if (raw === 's3') {
      return 's3';
    }
    this.logger.warn(
      `PROCUREMENT_STORAGE_DRIVER="${raw}" ignoré (attendu local ou s3).`,
    );
    return null;
  }

  /**
   * Driver runtime : la configuration admin (ligne plateforme) prime.
   * `PROCUREMENT_STORAGE_DRIVER` ne sert qu’en repli si aucune ligne n’existe (bootstrap / tests).
   */
  effectiveDriverFromRow(
    row: { storageDriver: ProcurementStorageDriver } | null,
  ): ProcurementStorageDriver {
    if (row) {
      return row.storageDriver;
    }
    const env = this.parseDriverFromEnv();
    if (env === 'local') {
      return ProcurementStorageDriver.LOCAL;
    }
    if (env === 's3') {
      return ProcurementStorageDriver.S3;
    }
    return ProcurementStorageDriver.S3;
  }

  resolveLocalRootFromRow(row: {
    enabled: boolean;
    localRoot: string | null;
  } | null): { path: string; source: 'env' | 'db' } | null {
    const envRoot = this.config.get<string>('PROCUREMENT_LOCAL_ROOT')?.trim();
    if (envRoot) {
      return { path: envRoot, source: 'env' };
    }
    if (row?.enabled && row.localRoot?.trim()) {
      return { path: row.localRoot.trim(), source: 'db' };
    }
    return null;
  }

  async resolveForOperations(): Promise<ProcurementOperationContext> {
    const row = await this.prisma.platformProcurementS3Settings.findUnique({
      where: { id: SETTINGS_ID },
    });
    const driver = this.effectiveDriverFromRow(row);
    if (driver === ProcurementStorageDriver.LOCAL) {
      const lr = this.resolveLocalRootFromRow(row);
      if (!lr) {
        throw new ServiceUnavailableException(
          'Stockage procurement (disque local) indisponible : définir PROCUREMENT_LOCAL_ROOT ou activer la config plateforme avec localRoot.',
        );
      }
      return { driver: 'LOCAL', root: lr.path };
    }
    const cfg = await this.s3Resolver.resolve();
    if (!cfg) {
      throw new ServiceUnavailableException(
        'Stockage des pièces procurement indisponible : configurer S3 (plateforme ou variables PROCUREMENT_S3_*).',
      );
    }
    return { driver: 'S3', config: cfg };
  }

  async getEffectiveMetadataForRow(row: {
    storageDriver: ProcurementStorageDriver;
    enabled: boolean;
    localRoot: string | null;
  }): Promise<{
    effectiveDriver: 'local' | 's3';
    effectiveLocalRootSource: 'env' | 'db' | 'none';
    effectiveSource: 'db' | 'env' | 'none';
  }> {
    const driver = this.effectiveDriverFromRow(row);
    const lr = this.resolveLocalRootFromRow(row);
    const s3 = await this.s3Resolver.resolve();
    return {
      effectiveDriver: driver === ProcurementStorageDriver.LOCAL ? 'local' : 's3',
      effectiveLocalRootSource:
        driver === ProcurementStorageDriver.LOCAL ? lr?.source ?? 'none' : 'none',
      effectiveSource: s3 ? s3.source : 'none',
    };
  }
}
