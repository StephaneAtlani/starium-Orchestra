import {
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Readable } from 'node:stream';
import { ProcurementObjectStorageService } from '../procurement/s3/procurement-object-storage.service';

/**
 * Binaires ProjectDocument STARIUM via le stockage documents client (LOCAL/S3 plateforme),
 * domaine `projets` — même modèle que contrats / commandes / factures.
 */
@Injectable()
export class ProjectDocumentContentService {
  constructor(private readonly storage: ProcurementObjectStorageService) {}

  async writeStariumObject(params: {
    clientId: string;
    body: Buffer;
    contentType: string;
    extension: string;
  }): Promise<{ storageBucket: string; storageKey: string; checksumSha256: string }> {
    const { bucket, objectKey, checksumSha256 } = await this.storage.putObject({
      clientId: params.clientId,
      domain: 'projets',
      body: params.body,
      contentType: params.contentType,
      extension: params.extension,
    });
    return {
      storageBucket: bucket,
      storageKey: objectKey,
      checksumSha256,
    };
  }

  async openStariumReadStream(
    storageBucket: string | null | undefined,
    storageKey: string | null | undefined,
  ): Promise<{ stream: Readable; contentType?: string }> {
    const bucket = storageBucket?.trim();
    const key = storageKey?.trim();
    if (!bucket || !key) {
      throw new UnprocessableEntityException(
        'Document STARIUM incomplet : bucket ou clé de stockage manquants (configurer le stockage documents client).',
      );
    }
    return this.storage.getObjectStream(bucket, key);
  }

  async readStariumBuffer(
    storageBucket: string | null | undefined,
    storageKey: string | null | undefined,
  ): Promise<Buffer> {
    const { stream } = await this.openStariumReadStream(storageBucket, storageKey);
    return this.readableToBuffer(stream);
  }

  private async readableToBuffer(stream: Readable): Promise<Buffer> {
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    if (chunks.length === 0) {
      throw new NotFoundException('Fichier document introuvable sur le stockage');
    }
    return Buffer.concat(chunks);
  }
}
