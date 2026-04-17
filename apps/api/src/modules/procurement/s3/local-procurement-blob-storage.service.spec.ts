import { ServiceUnavailableException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { mkdtemp } from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { LocalProcurementBlobStorageService } from './local-procurement-blob-storage.service';

describe('LocalProcurementBlobStorageService', () => {
  let service: LocalProcurementBlobStorageService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [LocalProcurementBlobStorageService],
    }).compile();
    service = module.get(LocalProcurementBlobStorageService);
  });

  it('rejects objectKey with path traversal', async () => {
    const root = os.tmpdir();
    await expect(
      service.getObjectStream(root, 'local', 'procurement/../etc/passwd'),
    ).rejects.toThrow(ServiceUnavailableException);
  });

  it('putObject and getObjectStream roundtrip', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'proc-local-'));
    const body = Buffer.from('hello');
    const put = await service.putObject(root, {
      body,
      contentType: 'text/plain',
      objectKey: 'c1/Commandes/a/b/hello.txt',
    });
    const { stream } = await service.getObjectStream(root, put.bucket, put.objectKey);
    const chunks: Buffer[] = [];
    for await (const c of stream) {
      chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c));
    }
    expect(Buffer.concat(chunks).toString()).toBe('hello');
  });
});
