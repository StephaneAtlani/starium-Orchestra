import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { createHash, randomUUID } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { access, mkdir, writeFile } from 'node:fs/promises';
import * as path from 'node:path';
import { Readable } from 'node:stream';
import { PROCUREMENT_LOCAL_BUCKET_SENTINEL } from './procurement-storage-resolution.service';

@Injectable()
export class LocalProcurementBlobStorageService {
  assertSafeObjectKey(objectKey: string): void {
    if (!objectKey || objectKey.startsWith('/') || objectKey.includes('..')) {
      throw new ServiceUnavailableException('Clé objet invalide.');
    }
  }

  resolveFilePath(root: string, objectKey: string): string {
    this.assertSafeObjectKey(objectKey);
    const resolvedRoot = path.resolve(root);
    const full = path.resolve(path.join(resolvedRoot, objectKey));
    const relative = path.relative(resolvedRoot, full);
    if (relative.startsWith('..') || path.isAbsolute(relative)) {
      throw new ServiceUnavailableException('Chemin fichier hors racine de stockage.');
    }
    return full;
  }

  async ensureRootReady(root: string): Promise<void> {
    await mkdir(root, { recursive: true });
    await access(root);
  }

  async putObject(
    root: string,
    params: {
      body: Buffer;
      contentType: string;
      extension: string;
    },
  ): Promise<{ bucket: string; objectKey: string; checksumSha256: string }> {
    const ext =
      params.extension && params.extension.startsWith('.')
        ? params.extension
        : `.${params.extension || 'bin'}`;
    const safeExt = ext.replace(/[^.a-zA-Z0-9]/g, '') || '.bin';
    const objectKey = `procurement/${randomUUID()}/${randomUUID()}${safeExt}`;
    const checksumSha256 = createHash('sha256').update(params.body).digest('hex');
    const filePath = this.resolveFilePath(root, objectKey);
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, params.body);
    return { bucket: PROCUREMENT_LOCAL_BUCKET_SENTINEL, objectKey, checksumSha256 };
  }

  async getObjectStream(
    root: string,
    bucket: string,
    objectKey: string,
  ): Promise<{ stream: Readable; contentType?: string }> {
    if (bucket !== PROCUREMENT_LOCAL_BUCKET_SENTINEL) {
      throw new ServiceUnavailableException('Bucket incohérent pour le stockage local.');
    }
    const filePath = this.resolveFilePath(root, objectKey);
    const stream = createReadStream(filePath);
    return { stream };
  }
}
