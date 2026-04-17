import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import {
  CreateBucketCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { createHash } from 'node:crypto';
import { Readable } from 'node:stream';
import { assertS3BucketReachable } from './procurement-s3-bucket-connectivity.util';
import {
  createProcurementS3Client,
  procurementCreateBucketInput,
} from './procurement-s3-client.factory';
import type { ResolvedProcurementS3Config } from './procurement-s3.types';
import { formatAwsSdkErrorDetail } from './procurement-s3-error.util';

function buildS3Client(cfg: ResolvedProcurementS3Config): S3Client {
  return createProcurementS3Client({
    region: cfg.region,
    endpoint: cfg.endpoint,
    accessKey: cfg.accessKey,
    secretKey: cfg.secretKey,
    useSsl: cfg.useSsl,
    forcePathStyle: cfg.forcePathStyle,
  });
}

@Injectable()
export class S3ProcurementBlobStorageService {
  private readonly logger = new Logger(S3ProcurementBlobStorageService.name);

  /**
   * @param bucketOverride — si renseigné, vérifie / crée ce bucket (ex. bucket dédié client).
   */
  async ensureBucketExists(
    cfg: ResolvedProcurementS3Config,
    bucketOverride?: string,
  ): Promise<void> {
    const bucket = bucketOverride?.trim() || cfg.bucket;
    const client = buildS3Client(cfg);
    const awsImplicit = !cfg.endpoint.trim();
    try {
      await assertS3BucketReachable(client, bucket);
      this.logger.debug(`S3 bucket « ${bucket} » déjà joignable (HeadBucket/List OK).`);
    } catch (headErr: unknown) {
      this.logger.log(
        `S3 création bucket « ${bucket} » (région ${cfg.region}) après échec Head/List : ${formatAwsSdkErrorDetail(headErr)}`,
      );
      try {
        await client.send(
          new CreateBucketCommand(
            procurementCreateBucketInput(bucket, cfg.region, awsImplicit),
          ),
        );
        this.logger.log(`S3 bucket « ${bucket} » créé (région ${cfg.region}).`);
      } catch (createErr: unknown) {
        this.logger.error(
          `S3 CreateBucket « ${bucket} » échoué : ${formatAwsSdkErrorDetail(createErr)}`,
        );
        throw createErr;
      }
    }
  }

  async putObject(
    cfg: ResolvedProcurementS3Config,
    params: {
      bucket: string;
      objectKey: string;
      body: Buffer;
      contentType: string;
    },
  ): Promise<{ bucket: string; objectKey: string; checksumSha256: string }> {
    const client = buildS3Client(cfg);
    await this.ensureBucketExists(cfg, params.bucket);
    const checksumSha256 = createHash('sha256').update(params.body).digest('hex');
    await client.send(
      new PutObjectCommand({
        Bucket: params.bucket,
        Key: params.objectKey,
        Body: params.body,
        ContentType: params.contentType,
      }),
    );
    return {
      bucket: params.bucket,
      objectKey: params.objectKey,
      checksumSha256,
    };
  }

  async getObjectStream(
    cfg: ResolvedProcurementS3Config,
    bucket: string,
    objectKey: string,
  ): Promise<{ stream: Readable; contentType?: string }> {
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
