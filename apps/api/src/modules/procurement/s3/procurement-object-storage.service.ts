import {
  Injectable,
  Logger,
  OnModuleInit,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  CreateBucketCommand,
  GetObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { createHash, randomUUID } from 'node:crypto';
import { Readable } from 'node:stream';
import { ProcurementS3ConfigResolverService } from './procurement-s3-config.resolver.service';
import type { ResolvedProcurementS3Config } from './procurement-s3.types';

function buildS3Client(cfg: ResolvedProcurementS3Config): S3Client {
  const raw = cfg.endpoint.trim();
  const endpointUrl = /^https?:\/\//i.test(raw)
    ? raw
    : `${cfg.useSsl ? 'https' : 'http'}://${raw}`;
  return new S3Client({
    region: cfg.region,
    endpoint: endpointUrl,
    forcePathStyle: cfg.forcePathStyle,
    credentials: {
      accessKeyId: cfg.accessKey,
      secretAccessKey: cfg.secretKey,
    },
  });
}

@Injectable()
export class ProcurementObjectStorageService implements OnModuleInit {
  private readonly logger = new Logger(ProcurementObjectStorageService.name);

  constructor(
    private readonly resolver: ProcurementS3ConfigResolverService,
  ) {}

  async onModuleInit(): Promise<void> {
    const cfg = await this.resolver.resolve();
    if (!cfg) {
      this.logger.warn(
        'Procurement S3: aucune configuration (DB activée + champs ou variables PROCUREMENT_S3_*). Bucket non créé au démarrage.',
      );
      return;
    }
    try {
      await this.ensureBucketExists(cfg);
    } catch (e) {
      this.logger.warn(
        `Procurement S3: ensureBucket au démarrage a échoué (${(e as Error).message}). Nouvel essai à l'usage.`,
      );
    }
  }

  private async ensureBucketExists(cfg: ResolvedProcurementS3Config): Promise<void> {
    const client = buildS3Client(cfg);
    try {
      await client.send(new HeadBucketCommand({ Bucket: cfg.bucket }));
    } catch {
      await client.send(new CreateBucketCommand({ Bucket: cfg.bucket }));
    }
  }

  async requireConfig(): Promise<ResolvedProcurementS3Config> {
    const cfg = await this.resolver.resolve();
    if (!cfg) {
      throw new ServiceUnavailableException(
        'Stockage des pièces procurement indisponible : configurer S3/MinIO (plateforme ou variables PROCUREMENT_S3_*).',
      );
    }
    return cfg;
  }

  async putObject(params: {
    body: Buffer;
    contentType: string;
    extension: string;
  }): Promise<{ bucket: string; objectKey: string; checksumSha256: string }> {
    const cfg = await this.requireConfig();
    const client = buildS3Client(cfg);
    await this.ensureBucketExists(cfg);
    const ext =
      params.extension && params.extension.startsWith('.')
        ? params.extension
        : `.${params.extension || 'bin'}`;
    const safeExt = ext.replace(/[^.a-zA-Z0-9]/g, '') || '.bin';
    const objectKey = `procurement/${randomUUID()}/${randomUUID()}${safeExt}`;
    const checksumSha256 = createHash('sha256').update(params.body).digest('hex');
    await client.send(
      new PutObjectCommand({
        Bucket: cfg.bucket,
        Key: objectKey,
        Body: params.body,
        ContentType: params.contentType,
      }),
    );
    return { bucket: cfg.bucket, objectKey, checksumSha256 };
  }

  async getObjectStream(
    bucket: string,
    objectKey: string,
  ): Promise<{ stream: Readable; contentType?: string }> {
    const cfg = await this.requireConfig();
    if (bucket !== cfg.bucket) {
      throw new ServiceUnavailableException('Bucket incohérent avec la configuration active.');
    }
    const client = buildS3Client(cfg);
    const out = await client.send(
      new GetObjectCommand({ Bucket: bucket, Key: objectKey }),
    );
    const body = out.Body;
    if (!body) {
      throw new ServiceUnavailableException('Corps de réponse S3 vide.');
    }
    const stream = body as unknown as Readable;
    return {
      stream,
      contentType: out.ContentType ?? undefined,
    };
  }
}
