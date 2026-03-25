import {
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'node:fs';
import * as path from 'node:path';

const ENV_PROJECT_DOCUMENTS_STORAGE_ROOT = 'PROJECT_DOCUMENTS_STORAGE_ROOT';

/**
 * Lecture des binaires ProjectDocument STARIUM sur disque (RFC-PROJ-INT-009).
 * Racine + clientId + projectId + segments(storageKey), sans `..`.
 */
@Injectable()
export class ProjectDocumentContentService {
  constructor(private readonly config: ConfigService) {}

  private resolveRoot(): string {
    const root = this.config.get<string>(ENV_PROJECT_DOCUMENTS_STORAGE_ROOT);
    if (!root?.trim()) {
      throw new UnprocessableEntityException(
        'PROJECT_DOCUMENTS_STORAGE_ROOT non configuré : impossible de lire les fichiers STARIUM',
      );
    }
    return path.resolve(root.trim());
  }

  private safeRelativeSegments(storageKey: string): string[] {
    const norm = storageKey.replace(/\\/g, '/').trim();
    const parts = norm.split('/').filter((p) => p.length > 0);
    for (const p of parts) {
      if (p === '.' || p === '..') {
        throw new UnprocessableEntityException('storageKey invalide');
      }
    }
    if (parts.length === 0) {
      throw new UnprocessableEntityException('storageKey vide');
    }
    return parts;
  }

  /**
   * Chemin absolu attendu : `{root}/{clientId}/{projectId}/{storageKey segments...}`.
   */
  resolveAbsolutePath(
    clientId: string,
    projectId: string,
    storageKey: string,
  ): string {
    const root = path.resolve(this.resolveRoot());
    for (const id of [clientId, projectId]) {
      if (!id?.trim() || id.includes('/') || id.includes('\\')) {
        throw new UnprocessableEntityException('Identifiant client/projet invalide');
      }
    }
    const segments = this.safeRelativeSegments(storageKey);
    const full = path.resolve(path.join(root, clientId, projectId, ...segments));
    const rel = path.relative(root, full);
    if (rel.startsWith('..') || path.isAbsolute(rel)) {
      throw new UnprocessableEntityException('Chemin document hors racine');
    }
    return full;
  }

  readStariumBuffer(
    clientId: string,
    projectId: string,
    storageKey: string,
  ): Buffer {
    const full = this.resolveAbsolutePath(clientId, projectId, storageKey);
    if (!fs.existsSync(full)) {
      throw new NotFoundException('Fichier document introuvable sur le stockage');
    }
    return fs.readFileSync(full);
  }
}
