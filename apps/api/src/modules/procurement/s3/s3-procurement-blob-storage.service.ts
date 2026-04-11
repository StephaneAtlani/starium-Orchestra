import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import {
  CreateBucketCommand,
  GetObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { createHash, randomUUID } from 'node:crypto';
import { Readable } from 'node:stream';
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
export class S3ProcurementBlobStorageService {
  async ensureBucketExists(cfg: ResolvedProcurementS3Config): Promise<void> {
    const client = buildS3Client(cfg);
    try {
      await client.send(new HeadBucketCommand({ Bucket: cfg.bucket }));
    } catch {
      await client.send(new CreateBucketCommand({ Bucket: cfg.bucket }));
    }
  }

  async putObject(
    cfg: ResolvedProcurementS3Config,
    params: {
      body: Buffer;
      contentType: string;
      extension: string;
    },
  ): Promise<{ bucket: string; objectKey: string; checksumSha256: string }> {
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
    cfg: ResolvedProcurementS3Config,
    bucket: string,
    objectKey: string,
  ): Promise<{ stream: Readable; contentType?: string }> {
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
