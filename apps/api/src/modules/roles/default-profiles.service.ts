import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { PrismaService } from '../../prisma/prisma.service';

export interface DefaultProfileDefinition {
  name: string;
  description: string;
  permissionCodes: string[];
}

const DEFAULT_PROFILES_PATH = path.join(
  process.cwd(),
  'prisma',
  'default-profiles.json',
);

@Injectable()
export class DefaultProfilesService {
  constructor(private readonly prisma: PrismaService) {}

  getProfilesDefinition(): DefaultProfileDefinition[] {
    const resolved = fs.existsSync(DEFAULT_PROFILES_PATH)
      ? DEFAULT_PROFILES_PATH
      : path.join(__dirname, '..', '..', '..', 'prisma', 'default-profiles.json');
    const raw = fs.readFileSync(resolved, 'utf-8');
    return JSON.parse(raw) as DefaultProfileDefinition[];
  }

  /**
   * Compat legacy: plus de création automatique de rôles client par défaut.
   * Les profils par défaut sont gérés en GLOBAL.
   */
  async applyForClient(clientId: string): Promise<void> {
    void clientId;
    return;
  }
}
