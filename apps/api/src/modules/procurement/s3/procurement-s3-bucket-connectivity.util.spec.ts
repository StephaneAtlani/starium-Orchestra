import {
  HeadBucketCommand,
  ListObjectsV2Command,
  type S3Client,
} from '@aws-sdk/client-s3';
import { assertS3BucketReachable } from './procurement-s3-bucket-connectivity.util';

function http403(): Error & { $metadata: { httpStatusCode: number } } {
  const e = new Error('Forbidden') as Error & {
    $metadata: { httpStatusCode: number };
  };
  e.$metadata = { httpStatusCode: 403 };
  return e;
}

describe('assertS3BucketReachable', () => {
  it('réussit si HeadBucket réussit', async () => {
    const client = {
      send: jest.fn().mockResolvedValue({}),
    } as unknown as S3Client;
    await assertS3BucketReachable(client, 'my-bucket');
    expect(client.send).toHaveBeenCalledTimes(1);
    expect(client.send).toHaveBeenCalledWith(
      expect.objectContaining({
        input: { Bucket: 'my-bucket' },
      }),
    );
    const cmd = (client.send as jest.Mock).mock.calls[0][0];
    expect(cmd).toBeInstanceOf(HeadBucketCommand);
  });

  it('retente ListObjectsV2 si HeadBucket renvoie 403', async () => {
    const client = {
      send: jest
        .fn()
        .mockRejectedValueOnce(http403())
        .mockResolvedValueOnce({}),
    } as unknown as S3Client;
    await assertS3BucketReachable(client, 'b');
    expect(client.send).toHaveBeenCalledTimes(2);
    const second = (client.send as jest.Mock).mock.calls[1][0];
    expect(second).toBeInstanceOf(ListObjectsV2Command);
    expect((second as ListObjectsV2Command).input).toEqual({
      Bucket: 'b',
      MaxKeys: 1,
    });
  });

  it('propage l’erreur HeadBucket si ListObjects échoue après 403', async () => {
    const headErr = http403();
    const client = {
      send: jest
        .fn()
        .mockRejectedValueOnce(headErr)
        .mockRejectedValueOnce(new Error('also denied')),
    } as unknown as S3Client;
    await expect(assertS3BucketReachable(client, 'b')).rejects.toBe(headErr);
  });

  it('ne retente pas si HeadBucket n’est pas 403', async () => {
    const notFound = new Error('NotFound') as Error & {
      name: string;
      $metadata: { httpStatusCode: number };
    };
    notFound.name = 'NotFound';
    notFound.$metadata = { httpStatusCode: 404 };
    const client = {
      send: jest.fn().mockRejectedValueOnce(notFound),
    } as unknown as S3Client;
    await expect(assertS3BucketReachable(client, 'b')).rejects.toBe(notFound);
    expect(client.send).toHaveBeenCalledTimes(1);
  });
});
