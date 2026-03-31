import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createReadStream, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import type { ReadStream } from 'fs';

@Injectable()
export class SuppliersLogoStorageService {
  private readonly logger = new Logger(SuppliersLogoStorageService.name);
  readonly dir: string;

  constructor(private readonly config: ConfigService) {
    const base =
      this.config.get<string>('UPLOAD_DIR')?.trim() ||
      join(process.cwd(), 'uploads');
    this.dir = join(base, 'suppliers-logos');
    try {
      if (!existsSync(this.dir)) {
        mkdirSync(this.dir, { recursive: true });
      }
    } catch (e) {
      this.logger.warn(
        `Impossible de créer le répertoire suppliers-logos: ${(e as Error).message}`,
      );
    }
  }

  private fileName(clientId: string, supplierId: string): string {
    return `${clientId}__${supplierId}`;
  }

  filePath(clientId: string, supplierId: string): string {
    return join(this.dir, this.fileName(clientId, supplierId));
  }

  exists(clientId: string, supplierId: string): boolean {
    return existsSync(this.filePath(clientId, supplierId));
  }

  async write(clientId: string, supplierId: string, buffer: Buffer): Promise<void> {
    const fs = await import('fs/promises');
    await fs.writeFile(this.filePath(clientId, supplierId), buffer);
  }

  async remove(clientId: string, supplierId: string): Promise<void> {
    const fs = await import('fs/promises');
    try {
      await fs.unlink(this.filePath(clientId, supplierId));
    } catch {
      // absent: ok
    }
  }

  createReadStream(clientId: string, supplierId: string): ReadStream {
    return createReadStream(this.filePath(clientId, supplierId));
  }
}
