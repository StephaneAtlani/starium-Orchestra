import type {
  BucketLocationConstraint,
  CreateBucketCommandInput,
} from '@aws-sdk/client-s3';
import { S3Client } from '@aws-sdk/client-s3';

export type ProcurementS3ClientParams = {
  region: string;
  /** Vide après trim : résolution AWS standard pour la région (virtual-hosted, `forcePathStyle: false`). */
  endpoint: string;
  accessKey: string;
  secretKey: string;
  /** Utilisé uniquement si `endpoint` est un hôte sans schéma (ex. minio:9000). */
  useSsl: boolean;
  /** Pour endpoints personnalisés (MinIO, etc.). Ignoré si endpoint vide (AWS public). */
  forcePathStyle: boolean;
};

/**
 * Sans endpoint explicite → client AWS régional sans path-style forcé (évite les échecs HeadBucket avec endpoint régional + path-style).
 * Avec endpoint (MinIO, custom) → schéma HTTP(S) et `forcePathStyle` appliqués.
 */
export function createProcurementS3Client(params: ProcurementS3ClientParams): S3Client {
  const region = params.region.trim() || 'us-east-1';
  const raw = params.endpoint.trim();
  const credentials = {
    accessKeyId: params.accessKey.trim(),
    secretAccessKey: params.secretKey,
  };

  if (!raw) {
    return new S3Client({
      region,
      credentials,
      forcePathStyle: false,
    });
  }

  const endpointUrl = /^https?:\/\//i.test(raw)
    ? raw
    : `${params.useSsl ? 'https' : 'http'}://${raw}`;
  return new S3Client({
    region,
    endpoint: endpointUrl,
    forcePathStyle: params.forcePathStyle,
    credentials,
  });
}

/** Création de bucket : contrainte de région requise sur AWS hors us-east-1 si endpoint implicite. */
export function procurementCreateBucketInput(
  bucket: string,
  region: string,
  awsImplicitEndpoint: boolean,
): CreateBucketCommandInput {
  const r = region.trim() || 'us-east-1';
  if (!awsImplicitEndpoint) {
    return { Bucket: bucket };
  }
  if (r === 'us-east-1') {
    return { Bucket: bucket };
  }
  return {
    Bucket: bucket,
    CreateBucketConfiguration: {
      LocationConstraint: r as BucketLocationConstraint,
    },
  };
}
