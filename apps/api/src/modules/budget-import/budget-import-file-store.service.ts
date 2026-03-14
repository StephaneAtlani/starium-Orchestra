import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { FILE_TOKEN_TTL_MS } from './constants';

export interface BudgetImportFileStoreMeta {
  fileToken: string;
  clientId: string;
  uploadedByUserId: string;
  fileName: string;
  sourceType: 'CSV' | 'XLSX';
  createdAt: string; // ISO
  expiresAt: string; // ISO
}

export interface BudgetImportFileStoreEntry {
  buffer: Buffer;
  meta: BudgetImportFileStoreMeta;
}

const TOKEN_BYTES = 24; // 32 chars hex

@Injectable()
export class BudgetImportFileStoreService {
  private readonly baseDir: string;

  constructor() {
    this.baseDir = path.join(process.cwd(), 'temp', 'imports');
    this.ensureDir();
  }

  private ensureDir(): void {
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
    }
  }

  private tokenPath(fileToken: string): string {
    return path.join(this.baseDir, `${fileToken}`);
  }

  private metaPath(fileToken: string): string {
    return path.join(this.baseDir, `${fileToken}.meta.json`);
  }

  generateToken(): string {
    return randomBytes(TOKEN_BYTES).toString('hex');
  }

  save(
    fileToken: string,
    buffer: Buffer,
    meta: Omit<BudgetImportFileStoreMeta, 'fileToken' | 'createdAt' | 'expiresAt'>,
  ): void {
    this.ensureDir();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + FILE_TOKEN_TTL_MS);
    const fullMeta: BudgetImportFileStoreMeta = {
      ...meta,
      fileToken,
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
    };
    fs.writeFileSync(this.tokenPath(fileToken), buffer);
    fs.writeFileSync(this.metaPath(fileToken), JSON.stringify(fullMeta, null, 0));
  }

  /**
   * Returns buffer and meta. Validates: token exists, not expired, clientId matches, uploadedByUserId matches (MVP: only uploader can preview/execute).
   */
  get(
    fileToken: string,
    clientId: string,
    userId: string,
  ): BudgetImportFileStoreEntry {
    const metaPath = this.metaPath(fileToken);
    const filePath = this.tokenPath(fileToken);
    if (!fs.existsSync(metaPath) || !fs.existsSync(filePath)) {
      throw new NotFoundException('Import file not found or expired');
    }
    const meta: BudgetImportFileStoreMeta = JSON.parse(
      fs.readFileSync(metaPath, 'utf-8'),
    );
    const now = new Date();
    if (new Date(meta.expiresAt) < now) {
      this.delete(fileToken);
      throw new NotFoundException('Import file not found or expired');
    }
    if (meta.clientId !== clientId) {
      throw new ForbiddenException('Import file does not belong to this client');
    }
    if (meta.uploadedByUserId !== userId) {
      throw new ForbiddenException(
        'Only the user who uploaded the file can preview or execute this import',
      );
    }
    const buffer = fs.readFileSync(filePath);
    return { buffer, meta };
  }

  delete(fileToken: string): void {
    const p = this.tokenPath(fileToken);
    const m = this.metaPath(fileToken);
    try {
      if (fs.existsSync(p)) fs.unlinkSync(p);
      if (fs.existsSync(m)) fs.unlinkSync(m);
    } catch {
      // ignore
    }
  }

  getMetaOnly(fileToken: string): BudgetImportFileStoreMeta | null {
    const metaPath = this.metaPath(fileToken);
    if (!fs.existsSync(metaPath)) return null;
    try {
      return JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
    } catch {
      return null;
    }
  }
}
