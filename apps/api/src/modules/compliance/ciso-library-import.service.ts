import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { execFile } from 'node:child_process';
import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import { promisify } from 'node:util';
import { parse as parseYaml } from 'yaml';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import {
  COMPLIANCE_AUDIT_ACTION,
  COMPLIANCE_AUDIT_RESOURCE_TYPE,
} from './compliance-audit.constants';

const execFileAsync = promisify(execFile);

const REPO_URL = 'https://github.com/intuitem/ciso-assistant-community.git';
const LIBRARIES_REL = path.join('backend', 'library', 'libraries');
const REPO_PATH_PREFIX = 'backend/library/libraries/';
const LIST_CACHE_TTL_MS = 30 * 60 * 1000;
const REPO_SYNC_TTL_MS = 60 * 60 * 1000;
const NEW_LIBRARY_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

export type CisoLibraryTranslation = {
  locale: string;
  name: string | null;
  description: string | null;
};

export type CisoLibraryListItem = {
  path: string;
  fileName: string;
  name: string;
  description: string | null;
  version: string;
  locale: string | null;
  refId: string | null;
  publicationDate: string | null;
  provider: string | null;
  languages: string[];
  translations: CisoLibraryTranslation[];
  hasFramework: boolean;
  alreadyImported: boolean;
  size: number;
  /** Dernier commit git local touchant le fichier. */
  updatedAt: string | null;
  /** `updatedAt` datant de moins d’un mois. */
  isNew: boolean;
};

type PlatformAuditMeta = {
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
};

type CachedList = {
  at: number;
  items: Omit<CisoLibraryListItem, 'alreadyImported'>[];
};

function isExcludedLibraryFileName(fileName: string): boolean {
  const base = fileName.replace(/\.ya?ml$/i, '').toLowerCase();
  return base.startsWith('mapping') || base.startsWith('workflow');
}

function asString(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value === 'string') {
    const t = value.trim();
    return t || null;
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  return null;
}

@Injectable()
export class CisoLibraryImportService {
  private readonly logger = new Logger(CisoLibraryImportService.name);
  private listCache: CachedList | null = null;
  private lastRepoSyncAt = 0;
  private syncPromise: Promise<string> | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogs: AuditLogsService,
  ) {}

  async listRemoteLibraries(): Promise<CisoLibraryListItem[]> {
    const remote = await this.fetchLocalCatalog();
    const existing = await this.prisma.complianceFramework.findMany({
      where: { clientId: null },
      select: { name: true, version: true, sourceLibraryPath: true },
    });
    const existingPaths = new Set(
      existing
        .map((e) => e.sourceLibraryPath)
        .filter((p): p is string => Boolean(p)),
    );
    const existingNames = new Set(
      existing.map((e) => e.name.trim().toLowerCase()),
    );

    return remote.map((item) => {
      const nameCandidates = [
        item.name,
        ...item.translations.map((t) => t.name).filter((n): n is string => Boolean(n)),
      ].map((n) => n.trim().toLowerCase());
      const alreadyImported =
        existingPaths.has(item.path) ||
        nameCandidates.some((n) => existingNames.has(n));
      return { ...item, alreadyImported };
    });
  }

  async importLibraries(
    paths: string[],
    actorUserId?: string,
    meta?: PlatformAuditMeta,
    preferredLocale?: string | null,
  ) {
    const uniquePaths = [...new Set(paths.map((p) => p.trim()).filter(Boolean))];
    if (uniquePaths.length === 0) {
      throw new BadRequestException('Aucun référentiel sélectionné');
    }
    if (uniquePaths.length > 30) {
      throw new BadRequestException('Maximum 30 référentiels par import');
    }

    const locale = preferredLocale?.trim().toLowerCase() || null;

    await this.ensureLocalRepo();

    const results: Array<{
      path: string;
      status: 'imported' | 'skipped' | 'error';
      name?: string;
      version?: string;
      requirementCount?: number;
      message?: string;
    }> = [];

    for (const repoPath of uniquePaths) {
      if (
        !repoPath.startsWith(REPO_PATH_PREFIX) ||
        !repoPath.endsWith('.yaml') ||
        repoPath.includes('..') ||
        isExcludedLibraryFileName(path.basename(repoPath))
      ) {
        results.push({
          path: repoPath,
          status: 'error',
          message: 'Chemin de bibliothèque invalide',
        });
        continue;
      }

      try {
        const yamlText = await this.readLibraryFile(repoPath);
        const parsed = this.parseLibraryYaml(yamlText, locale);
        if (!parsed.framework) {
          results.push({
            path: repoPath,
            status: 'skipped',
            name: parsed.libraryName,
            version: parsed.libraryVersion,
            message: 'Pas de cadre (framework) dans ce fichier',
          });
          continue;
        }

        const name = parsed.framework.name;
        const version = parsed.framework.version;
        const existingByPath = await this.prisma.complianceFramework.findFirst({
          where: { clientId: null, sourceLibraryPath: repoPath },
        });
        if (existingByPath) {
          results.push({
            path: repoPath,
            status: 'skipped',
            name: existingByPath.name,
            version: existingByPath.version,
            message: 'Déjà présent dans le catalogue plateforme (même source CISO)',
          });
          continue;
        }

        const existing = await this.prisma.complianceFramework.findFirst({
          where: { clientId: null, name, version },
        });
        if (existing) {
          // Rattache le chemin source si import historique sans sourceLibraryPath.
          if (!existing.sourceLibraryPath) {
            await this.prisma.complianceFramework.update({
              where: { id: existing.id },
              data: { sourceLibraryPath: repoPath },
            });
          }
          results.push({
            path: repoPath,
            status: 'skipped',
            name,
            version,
            message: 'Déjà présent dans le catalogue plateforme',
          });
          continue;
        }

        const requirements = parsed.framework.requirements;
        const created = await this.prisma.$transaction(async (tx) => {
          const fw = await tx.complianceFramework.create({
            data: {
              clientId: null,
              name,
              version,
              isActive: true,
              sourceLibraryPath: repoPath,
            },
          });
          if (requirements.length > 0) {
            await tx.complianceRequirement.createMany({
              data: requirements.map((r, i) => ({
                frameworkId: fw.id,
                code: r.code,
                title: r.title,
                description: r.description,
                category: r.category,
                sortOrder: i,
              })),
            });
          }
          return fw;
        });

        await this.auditLogs.createPlatform({
          userId: actorUserId,
          action: COMPLIANCE_AUDIT_ACTION.FRAMEWORK_CREATED,
          resourceType: COMPLIANCE_AUDIT_RESOURCE_TYPE.COMPLIANCE_FRAMEWORK,
          resourceId: created.id,
          newValue: {
            name,
            version,
            source: 'ciso-assistant-community',
            path: repoPath,
            requirementCount: requirements.length,
          },
          ipAddress: meta?.ipAddress,
          userAgent: meta?.userAgent,
          requestId: meta?.requestId,
        });

        results.push({
          path: repoPath,
          status: 'imported',
          name,
          version,
          requirementCount: requirements.length,
        });
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Échec d’import';
        this.logger.warn(`Import CISO échoué pour ${repoPath}: ${message}`);
        results.push({ path: repoPath, status: 'error', message });
      }
    }

    return {
      imported: results.filter((r) => r.status === 'imported').length,
      skipped: results.filter((r) => r.status === 'skipped').length,
      errors: results.filter((r) => r.status === 'error').length,
      results,
    };
  }

  private getRepoRoot(): string {
    const fromEnv = process.env.CISO_ASSISTANT_CACHE_DIR?.trim();
    if (fromEnv) return path.resolve(fromEnv);
    return path.join(process.cwd(), '.cache', 'ciso-assistant-community');
  }

  private getLibrariesDir(): string {
    return path.join(this.getRepoRoot(), LIBRARIES_REL);
  }

  private async ensureLocalRepo(): Promise<string> {
    if (this.syncPromise) return this.syncPromise;
    this.syncPromise = this.syncLocalRepo().finally(() => {
      this.syncPromise = null;
    });
    return this.syncPromise;
  }

  private async librariesPresent(librariesDir: string): Promise<boolean> {
    try {
      const entries = await fs.readdir(librariesDir);
      return entries.some((name) => name.endsWith('.yaml'));
    } catch {
      return false;
    }
  }

  private async hasGitBinary(): Promise<boolean> {
    try {
      await execFileAsync('git', ['--version'], { timeout: 5_000 });
      return true;
    } catch {
      return false;
    }
  }

  private async syncLocalRepo(): Promise<string> {
    const root = this.getRepoRoot();
    const librariesDir = this.getLibrariesDir();
    const now = Date.now();

    // Cache déjà peuplé (ex. clone host + volume Docker) → on s’en sert sans exiger git.
    if (await this.librariesPresent(librariesDir)) {
      const stale = now - this.lastRepoSyncAt >= REPO_SYNC_TTL_MS;
      if (stale && (await this.hasGitBinary())) {
        try {
          this.logger.log('Mise à jour git du cache CISO Assistant…');
          await execFileAsync(
            'git',
            ['-C', root, 'fetch', '--depth', '100', 'origin', 'main'],
            { timeout: 120_000 },
          );
          await execFileAsync(
            'git',
            ['-C', root, 'checkout', '-B', 'main', 'FETCH_HEAD'],
            { timeout: 60_000 },
          );
          this.listCache = null;
        } catch (err) {
          this.logger.warn(
            `Pull CISO ignoré (cache local conservé): ${
              err instanceof Error ? err.message : 'erreur'
            }`,
          );
        }
      }
      this.lastRepoSyncAt = now;
      return librariesDir;
    }

    if (await this.hasGitBinary()) {
      this.logger.log('Clone sparse CISO Assistant (libraries)…');
      await fs.mkdir(path.dirname(root), { recursive: true });
      await fs.rm(root, { recursive: true, force: true });
      await execFileAsync(
        'git',
        [
          'clone',
          '--filter=blob:none',
          '--sparse',
          '--depth',
          '100',
          '--branch',
          'main',
          REPO_URL,
          root,
        ],
        { timeout: 180_000 },
      );
      await execFileAsync(
        'git',
        ['-C', root, 'sparse-checkout', 'set', 'backend/library/libraries'],
        { timeout: 60_000 },
      );
      if (!(await this.librariesPresent(librariesDir))) {
        throw new ServiceUnavailableException(
          'Clone CISO Assistant incomplet (dossier libraries manquant)',
        );
      }
      this.lastRepoSyncAt = now;
      this.listCache = null;
      return librariesDir;
    }

    // Pas de git : téléchargement tar.gz GitHub + extraction (busybox tar).
    this.logger.log('Téléchargement archive CISO Assistant (sans git)…');
    await this.downloadLibrariesArchive();
    if (!(await this.librariesPresent(librariesDir))) {
      throw new ServiceUnavailableException(
        'Impossible d’obtenir les bibliothèques CISO (ni git ni archive)',
      );
    }
    this.lastRepoSyncAt = now;
    this.listCache = null;
    return librariesDir;
  }

  /** Fallback sans git : archive GitHub + `tar` (busybox Alpine). */
  private async downloadLibrariesArchive(): Promise<void> {
    const librariesDir = this.getLibrariesDir();
    const work = path.join(
      path.dirname(this.getRepoRoot()),
      'ciso-assistant-download',
    );
    await fs.rm(work, { recursive: true, force: true });
    await fs.mkdir(work, { recursive: true });

    const archiveUrl =
      'https://codeload.github.com/intuitem/ciso-assistant-community/tar.gz/refs/heads/main';
    const res = await fetch(archiveUrl, {
      headers: { 'User-Agent': 'Starium-Orchestra-Compliance-Import' },
    });
    if (!res.ok) {
      throw new Error(`Téléchargement archive GitHub ${res.status}`);
    }
    const tgzPath = path.join(work, 'main.tar.gz');
    await fs.writeFile(tgzPath, Buffer.from(await res.arrayBuffer()));

    await execFileAsync('tar', ['-xzf', tgzPath, '-C', work], {
      timeout: 180_000,
    });

    const nested = path.join(
      work,
      'ciso-assistant-community-main',
      'backend',
      'library',
      'libraries',
    );
    await fs.mkdir(path.dirname(librariesDir), { recursive: true });
    await fs.rm(librariesDir, { recursive: true, force: true });
    await fs.cp(nested, librariesDir, { recursive: true });
    await fs.rm(work, { recursive: true, force: true });
  }

  private async fetchLocalCatalog(): Promise<
    Omit<CisoLibraryListItem, 'alreadyImported'>[]
  > {
    if (this.listCache && Date.now() - this.listCache.at < LIST_CACHE_TTL_MS) {
      return this.listCache.items;
    }

    let librariesDir: string;
    try {
      librariesDir = await this.ensureLocalRepo();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'clone impossible';
      this.logger.error(`Sync CISO échouée: ${message}`);
      throw new ServiceUnavailableException(
        `Impossible de synchroniser CISO Assistant (${message})`,
      );
    }

    const entries = await fs.readdir(librariesDir, { withFileTypes: true });
    const yamlFiles = entries
      .filter(
        (e) =>
          e.isFile() &&
          e.name.endsWith('.yaml') &&
          !isExcludedLibraryFileName(e.name),
      )
      .map((e) => e.name)
      .sort((a, b) => a.localeCompare(b, 'fr'));

    const repoRoot = this.getRepoRoot();
    const canGit = await this.hasGitBinary();
    const items: Omit<CisoLibraryListItem, 'alreadyImported'>[] = [];

    for (const fileName of yamlFiles) {
      const absolute = path.join(librariesDir, fileName);
      const repoPath = `${REPO_PATH_PREFIX}${fileName}`;
      try {
        const [stat, yamlText] = await Promise.all([
          fs.stat(absolute),
          fs.readFile(absolute, 'utf8'),
        ]);
        const updatedAt = canGit
          ? (await this.gitFileUpdatedAt(repoRoot, repoPath)) ??
            stat.mtime.toISOString()
          : stat.mtime.toISOString();
        const meta = this.extractLibraryMeta(yamlText, fileName);
        const isNew =
          Date.now() - new Date(updatedAt).getTime() < NEW_LIBRARY_MAX_AGE_MS;
        items.push({
          path: repoPath,
          fileName,
          name: meta.name,
          description: meta.description,
          version: meta.version,
          locale: meta.locale,
          refId: meta.refId,
          publicationDate: meta.publicationDate,
          provider: meta.provider,
          languages: meta.languages,
          translations: meta.translations,
          hasFramework: meta.hasFramework,
          size: stat.size,
          updatedAt,
          isNew,
        });
      } catch (err) {
        this.logger.warn(
          `Lecture ${fileName} ignorée: ${
            err instanceof Error ? err.message : 'erreur'
          }`,
        );
      }
    }

    const withFramework = items.filter((i) => i.hasFramework);
    withFramework.sort((a, b) => a.name.localeCompare(b.name, 'fr'));
    this.listCache = { at: Date.now(), items: withFramework };
    return withFramework;
  }

  private async gitFileUpdatedAt(
    repoRoot: string,
    repoPath: string,
  ): Promise<string | null> {
    try {
      const { stdout } = await execFileAsync(
        'git',
        ['-C', repoRoot, 'log', '-1', '--format=%cI', '--', repoPath],
        { timeout: 10_000 },
      );
      const date = stdout.trim();
      return date || null;
    } catch {
      return null;
    }
  }

  private async readLibraryFile(repoPath: string): Promise<string> {
    const absolute = path.join(this.getRepoRoot(), repoPath);
    return fs.readFile(absolute, 'utf8');
  }

  private extractLibraryMeta(
    yamlText: string,
    fileName: string,
  ): {
    name: string;
    description: string | null;
    version: string;
    locale: string | null;
    refId: string | null;
    publicationDate: string | null;
    provider: string | null;
    languages: string[];
    translations: CisoLibraryTranslation[];
    hasFramework: boolean;
  } {
    const fallback = fileName.replace(/\.yaml$/i, '');
    const doc = parseYaml(yamlText) as Record<string, unknown>;

    const locale = asString(doc.locale);
    const refId = asString(doc.ref_id);
    const name = asString(doc.name) ?? fallback;
    const description = asString(doc.description);
    const version = asString(doc.version) ?? '—';
    const publicationDate = asString(doc.publication_date);
    const provider = asString(doc.provider);

    const rawTranslations = doc.translations as
      | Record<string, Record<string, unknown>>
      | undefined;
    const translations: CisoLibraryTranslation[] = [];
    if (rawTranslations && typeof rawTranslations === 'object') {
      for (const [lang, payload] of Object.entries(rawTranslations)) {
        if (!payload || typeof payload !== 'object') continue;
        translations.push({
          locale: lang,
          name: asString(payload.name),
          description: asString(payload.description),
        });
      }
    }
    translations.sort((a, b) => a.locale.localeCompare(b.locale, 'fr'));

    const languageSet = new Set<string>();
    if (locale) languageSet.add(locale);
    for (const t of translations) languageSet.add(t.locale);
    const languages = [...languageSet].sort((a, b) => a.localeCompare(b, 'fr'));

    const objects = doc.objects as Record<string, unknown> | undefined;
    const hasFramework = Boolean(objects && objects.framework);

    return {
      name: name.slice(0, 200),
      description: description?.slice(0, 2000) ?? null,
      version: version.slice(0, 80),
      locale,
      refId,
      publicationDate,
      provider,
      languages,
      translations,
      hasFramework,
    };
  }

  private pickLocalizedText(
    baseName: string | null,
    baseDescription: string | null,
    translations:
      | Record<string, { name?: unknown; description?: unknown }>
      | undefined,
    preferredLocale: string | null,
  ): { name: string | null; description: string | null } {
    if (preferredLocale && translations?.[preferredLocale]) {
      const t = translations[preferredLocale]!;
      return {
        name: asString(t.name) ?? baseName,
        description: asString(t.description) ?? baseDescription,
      };
    }
    return { name: baseName, description: baseDescription };
  }

  private parseLibraryYaml(
    yamlText: string,
    preferredLocale: string | null = null,
  ): {
    libraryName: string;
    libraryVersion: string;
    framework: {
      name: string;
      version: string;
      requirements: Array<{
        code: string;
        title: string;
        description: string | null;
        category: string | null;
      }>;
    } | null;
  } {
    const doc = parseYaml(yamlText) as Record<string, unknown>;
    const translations = doc.translations as
      | Record<string, { name?: unknown; description?: unknown }>
      | undefined;
    const docLocale = typeof doc.locale === 'string' ? doc.locale : null;
    const effectiveLocale =
      preferredLocale ||
      (docLocale && docLocale !== 'fr' ? 'fr' : docLocale) ||
      null;

    const libraryLocalized = this.pickLocalizedText(
      asString(doc.name),
      asString(doc.description),
      translations,
      effectiveLocale,
    );
    const libraryName = libraryLocalized.name || 'Référentiel importé';
    const libraryVersion =
      doc.version !== undefined && doc.version !== null
        ? String(doc.version)
        : '1';

    const objects = doc.objects as Record<string, unknown> | undefined;
    const fw = objects?.framework as Record<string, unknown> | undefined;
    if (!fw) {
      return { libraryName, libraryVersion, framework: null };
    }

    const fwTranslations = fw.translations as
      | Record<string, { name?: unknown; description?: unknown }>
      | undefined;
    const fwLocalized = this.pickLocalizedText(
      asString(fw.name),
      asString(fw.description),
      fwTranslations,
      effectiveLocale,
    );
    const frameworkName = fwLocalized.name || libraryName;
    const frameworkVersion =
      fw.version !== undefined && fw.version !== null
        ? String(fw.version)
        : libraryVersion;

    const nodes = Array.isArray(fw.requirement_nodes)
      ? (fw.requirement_nodes as Array<Record<string, unknown>>)
      : [];

    const nameByUrn = new Map<string, string>();
    for (const node of nodes) {
      if (typeof node.urn !== 'string') continue;
      const nodeTr = node.translations as
        | Record<string, { name?: unknown; description?: unknown }>
        | undefined;
      const localized = this.pickLocalizedText(
        asString(node.name),
        asString(node.description),
        nodeTr,
        effectiveLocale,
      );
      if (localized.name) nameByUrn.set(node.urn, localized.name);
    }

    const requirements: Array<{
      code: string;
      title: string;
      description: string | null;
      category: string | null;
    }> = [];
    const usedCodes = new Set<string>();

    for (const node of nodes) {
      if (node.assessable !== true) continue;

      let code =
        typeof node.ref_id === 'string' && node.ref_id.trim()
          ? node.ref_id.trim()
          : typeof node.urn === 'string'
            ? node.urn.split(':').pop() || `REQ-${requirements.length + 1}`
            : `REQ-${requirements.length + 1}`;
      code = code.slice(0, 120);
      let unique = code;
      let n = 2;
      while (usedCodes.has(unique)) {
        unique = `${code}-${n++}`.slice(0, 120);
      }
      usedCodes.add(unique);

      const nodeTr = node.translations as
        | Record<string, { name?: unknown; description?: unknown }>
        | undefined;
      const localized = this.pickLocalizedText(
        asString(node.name),
        asString(node.description),
        nodeTr,
        effectiveLocale,
      );
      const titleRaw = localized.name || localized.description || unique;
      const title = titleRaw.slice(0, 500);
      const description = localized.description?.slice(0, 4000) ?? null;
      const parentUrn =
        typeof node.parent_urn === 'string' ? node.parent_urn : null;
      const category = parentUrn ? nameByUrn.get(parentUrn) ?? null : null;

      requirements.push({
        code: unique,
        title,
        description,
        category: category?.slice(0, 200) ?? null,
      });
    }

    return {
      libraryName,
      libraryVersion,
      framework: {
        name: frameworkName.slice(0, 200),
        version: frameworkVersion.slice(0, 80),
        requirements,
      },
    };
  }
}
