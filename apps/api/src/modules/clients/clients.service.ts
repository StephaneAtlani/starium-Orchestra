import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  AuditLogsService,
  CreateAuditLogInput,
} from '../audit-logs/audit-logs.service';
import { RequestMeta } from '../../common/decorators/request-meta.decorator';
import { DefaultProfilesService } from '../roles/default-profiles.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { ProjectTeamService } from '../projects/project-team.service';
import { ResourcesModuleBootstrapService } from '../resources/resources-module-bootstrap.service';
import { RiskTaxonomyService } from '../risk-taxonomy/risk-taxonomy.service';
import { ActivityTypesService } from '../activity-types/activity-types.service';
import { ClientDocumentsStorageProvisionerService } from '../procurement/s3/client-documents-storage-provisioner.service';
import { ProcurementS3ConfigResolverService } from '../procurement/s3/procurement-s3-config.resolver.service';
import { ProcurementLocalDocumentsS3MigrationService } from '../procurement/s3/procurement-local-documents-s3-migration.service';
import { PROCUREMENT_LOCAL_BUCKET_SENTINEL } from '../procurement/s3/procurement-storage-resolution.service';

/** Réponse client pour GET /clients (liste). */
export interface ClientListItem {
  id: string;
  name: string;
  slug: string;
  createdAt: Date;
  /** Pièces procurement dont le stockage n’est pas encore S3 (`storageBucket` sentinel `local`). */
  procurementAttachmentsNotOnS3Count: number;
  /** Config S3 procurement résolue (permet la migration). */
  procurementS3Configured: boolean;
}

/** Réponse client pour POST /clients et PATCH /clients/:id. */
export interface ClientResponse {
  id: string;
  name: string;
  slug: string;
}

/**
 * Service de gestion des clients (RFC-009).
 * Réservé aux administrateurs plateforme (PlatformAdminGuard).
 */
@Injectable()
export class ClientsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogs: AuditLogsService,
    private readonly defaultProfiles: DefaultProfilesService,
    private readonly projectTeam: ProjectTeamService,
    private readonly resourcesBootstrap: ResourcesModuleBootstrapService,
    private readonly riskTaxonomy: RiskTaxonomyService,
    private readonly activityTypes: ActivityTypesService,
    private readonly clientDocumentsStorageProvisioner: ClientDocumentsStorageProvisionerService,
    private readonly procurementS3ConfigResolver: ProcurementS3ConfigResolverService,
    private readonly procurementLocalDocumentsS3Migration: ProcurementLocalDocumentsS3MigrationService,
  ) {}

  /**
   * Retourne tous les clients, sans pagination ni filtre, triés par createdAt desc.
   */
  async findAll(): Promise<ClientListItem[]> {
    const [s3Cfg, clients, counts] = await Promise.all([
      this.procurementS3ConfigResolver.resolve(),
      this.prisma.client.findMany({
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          slug: true,
          createdAt: true,
        },
      }),
      this.prisma.procurementAttachment.groupBy({
        by: ['clientId'],
        where: { storageBucket: PROCUREMENT_LOCAL_BUCKET_SENTINEL },
        _count: { id: true },
      }),
    ]);
    const countMap = new Map(
      counts.map((c) => [c.clientId, c._count.id]),
    );
    const procurementS3Configured = s3Cfg != null;
    return clients.map((c) => ({
      ...c,
      procurementAttachmentsNotOnS3Count: countMap.get(c.id) ?? 0,
      procurementS3Configured,
    }));
  }

  /**
   * Migre les pièces jointes procurement encore sur disque vers le bucket S3 du client.
   * Plateforme admin uniquement (contrôleur).
   */
  async migrateProcurementLocalDocumentsToS3(
    clientId: string,
    context: { actorUserId: string; meta: RequestMeta },
  ): Promise<{ migratedCount: number }> {
    return this.procurementLocalDocumentsS3Migration.migrateClientProcurementLocalDocumentsToS3(
      clientId,
      context,
    );
  }

  /**
   * Crée un client.
   * Vérifie explicitement l'unicité du slug avant création.
   * Réponse strictement { id, name, slug }.
   */
  async create(
    dto: CreateClientDto,
    context?: { actorUserId?: string; meta?: RequestMeta },
  ): Promise<ClientResponse> {
    const existingSlug = await this.prisma.client.findUnique({
      where: { slug: dto.slug },
    });
    if (existingSlug) {
      throw new ConflictException('Un client avec ce slug existe déjà');
    }

    const client = await this.prisma.client.create({
      data: {
        name: dto.name,
        slug: dto.slug,
      },
    });

    try {
      await this.clientDocumentsStorageProvisioner.provisionClientDocumentStorage(client.id);
      await this.enableDefaultModulesForClient(client.id);
      await this.defaultProfiles.applyForClient(client.id);
      await this.projectTeam.seedDefaultRolesForClient(client.id);
      await this.resourcesBootstrap.bootstrapForClient(client.id);
      await this.riskTaxonomy.ensureForClient(client.id);
      await this.activityTypes.ensureDefaultsForClient(client.id);
    } catch (error) {
      // Evite un client partiellement initialisé (rôles/permissions incomplets).
      await this.prisma.client.delete({ where: { id: client.id } }).catch(() => undefined);
      throw error;
    }

    await this.logClientEvent('client.created', {
      clientId: client.id,
      payload: { name: client.name, slug: client.slug },
      context,
    });

    return { id: client.id, name: client.name, slug: client.slug };
  }

  /**
   * Met à jour un client. Si slug fourni, vérifie l'unicité (autre client uniquement).
   * Réponse strictement { id, name, slug }.
   */
  async update(
    id: string,
    dto: UpdateClientDto,
    context?: { actorUserId?: string; meta?: RequestMeta },
  ): Promise<ClientResponse> {
    const client = await this.prisma.client.findUnique({
      where: { id },
    });
    if (!client) {
      throw new NotFoundException('Client non trouvé');
    }

    if (dto.slug !== undefined) {
      const otherWithSlug = await this.prisma.client.findFirst({
        where: {
          slug: dto.slug,
          id: { not: id },
        },
      });
      if (otherWithSlug) {
        throw new ConflictException('Un client avec ce slug existe déjà');
      }
    }

    const data: { name?: string; slug?: string } = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.slug !== undefined) data.slug = dto.slug;

    if (Object.keys(data).length === 0) {
      return { id: client.id, name: client.name, slug: client.slug };
    }

    const updated = await this.prisma.client.update({
      where: { id },
      data,
    });
    await this.logClientEvent('client.updated', {
      clientId: updated.id,
      payload: { name: updated.name, slug: updated.slug },
      context,
    });
    return { id: updated.id, name: updated.name, slug: updated.slug };
  }

  /**
   * Suppression physique du client. Les ClientUser liés sont supprimés (cascade).
   * Ne supprime jamais de User.
   */
  async remove(id: string): Promise<void> {
    const client = await this.prisma.client.findUnique({
      where: { id },
    });
    if (!client) {
      throw new NotFoundException('Client non trouvé');
    }
    await this.prisma.client.delete({
      where: { id },
    });
  }

  private async logClientEvent(
    action: string,
    params: {
      clientId: string;
      payload: Record<string, unknown>;
      context?: { actorUserId?: string; meta?: RequestMeta };
    },
  ): Promise<void> {
    const { clientId, payload, context } = params;
    const input: CreateAuditLogInput = {
      clientId,
      userId: context?.actorUserId,
      action,
      resourceType: 'client',
      resourceId: clientId,
      newValue: payload,
      ipAddress: context?.meta?.ipAddress,
      userAgent: context?.meta?.userAgent,
      requestId: context?.meta?.requestId,
    };
    await this.auditLogs.create(input);
  }

  private async enableDefaultModulesForClient(clientId: string): Promise<void> {
    const modules = await (this.prisma as any).module.findMany({
      where: { isActive: true },
      select: { id: true },
    });
    if (modules.length === 0) {
      return;
    }

    await (this.prisma as any).clientModule.createMany({
      data: modules.map((module: { id: string }) => ({
        clientId,
        moduleId: module.id,
        status: 'ENABLED',
      })),
      skipDuplicates: true,
    });
  }
}
