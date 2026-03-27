import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createReadStream, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import type { ReadStream } from 'fs';

@Injectable()
export class SupplierContactsPhotoStorageService {
  private readonly logger = new Logger(SupplierContactsPhotoStorageService.name);
  readonly dir: string;

  constructor(private readonly config: ConfigService) {
    const base =
      this.config.get<string>('UPLOAD_DIR')?.trim() || join(process.cwd(), 'uploads');
    this.dir = join(base, 'supplier-contacts-photos');
    try {
      if (!existsSync(this.dir)) {
        mkdirSync(this.dir, { recursive: true });
      }
    } catch (e) {
      this.logger.warn(
        `Impossible de créer le répertoire supplier-contacts-photos: ${(e as Error).message}`,
      );
    }
  }

  private fileName(clientId: string, supplierId: string, contactId: string): string {
    return `${clientId}__${supplierId}__${contactId}`;
  }

  filePath(clientId: string, supplierId: string, contactId: string): string {
    return join(this.dir, this.fileName(clientId, supplierId, contactId));
  }

  exists(clientId: string, supplierId: string, contactId: string): boolean {
    return existsSync(this.filePath(clientId, supplierId, contactId));
  }

  async write(
    clientId: string,
    supplierId: string,
    contactId: string,
    buffer: Buffer,
  ): Promise<void> {
    const fs = await import('fs/promises');
    await fs.writeFile(this.filePath(clientId, supplierId, contactId), buffer);
  }

  async remove(clientId: string, supplierId: string, contactId: string): Promise<void> {
    const fs = await import('fs/promises');
    try {
      await fs.unlink(this.filePath(clientId, supplierId, contactId));
    } catch {
      // absent: ok
    }
  }

  createReadStream(clientId: string, supplierId: string, contactId: string): ReadStream {
    return createReadStream(this.filePath(clientId, supplierId, contactId));
  }
}
