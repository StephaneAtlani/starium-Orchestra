import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createReadStream, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import type { ReadStream } from 'fs';

/**
 * Fichiers avatar sur disque : `{UPLOAD_DIR}/avatars/{userId}` (sans extension ; MIME en base).
 */
@Injectable()
export class MeAvatarStorageService {
  private readonly logger = new Logger(MeAvatarStorageService.name);
  readonly dir: string;

  constructor(private readonly config: ConfigService) {
    const base =
      this.config.get<string>('UPLOAD_DIR')?.trim() ||
      join(process.cwd(), 'uploads');
    this.dir = join(base, 'avatars');
    try {
      if (!existsSync(this.dir)) {
        mkdirSync(this.dir, { recursive: true });
      }
    } catch (e) {
      this.logger.warn(
        `Impossible de créer le répertoire avatars: ${(e as Error).message}`,
      );
    }
  }

  filePath(userId: string): string {
    return join(this.dir, userId);
  }

  exists(userId: string): boolean {
    return existsSync(this.filePath(userId));
  }

  async write(userId: string, buffer: Buffer): Promise<void> {
    const fs = await import('fs/promises');
    await fs.writeFile(this.filePath(userId), buffer);
  }

  async remove(userId: string): Promise<void> {
    const fs = await import('fs/promises');
    try {
      await fs.unlink(this.filePath(userId));
    } catch {
      // absent : ok
    }
  }

  createReadStream(userId: string): ReadStream {
    return createReadStream(this.filePath(userId));
  }
}
