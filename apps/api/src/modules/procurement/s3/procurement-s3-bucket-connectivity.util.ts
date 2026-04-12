import {
  HeadBucketCommand,
  ListObjectsV2Command,
  type S3Client,
} from '@aws-sdk/client-s3';

/**
 * Vérifie que le bucket est joignable avec les credentials du client.
 * Si `HeadBucket` répond 403 (certaines politiques d’endpoint / Deny ciblés), on retente
 * `ListObjectsV2` avec `MaxKeys: 1` (besoin typique : `s3:ListBucket` sur le bucket ; 1 clé max, pas 0 pour éviter tout rejet d’API).
 */
export async function assertS3BucketReachable(
  client: S3Client,
  bucket: string,
): Promise<void> {
  try {
    await client.send(new HeadBucketCommand({ Bucket: bucket }));
    return;
  } catch (headErr: unknown) {
    const status = (headErr as { $metadata?: { httpStatusCode?: number } })
      ?.$metadata?.httpStatusCode;
    if (status === 403) {
      try {
        await client.send(
          new ListObjectsV2Command({ Bucket: bucket, MaxKeys: 1 }),
        );
        return;
      } catch {
        throw headErr;
      }
    }
    throw headErr;
  }
}
