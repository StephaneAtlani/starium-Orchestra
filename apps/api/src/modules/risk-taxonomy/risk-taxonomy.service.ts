import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  ensureRiskTaxonomyForClient,
  getRiskDomainUiFamily,
  isRiskDomainVisibleInV1Catalog,
} from './risk-taxonomy-defaults';

@Injectable()
export class RiskTaxonomyService {
  constructor(private readonly prisma: PrismaService) {}

  async ensureForClient(clientId: string): Promise<void> {
    await ensureRiskTaxonomyForClient(this.prisma, clientId);
  }

  /** Formulaires / filtres : domaines et types actifs uniquement. */
  async getCatalog(clientId: string, includeLegacy = false) {
    await this.ensureForClient(clientId);
    const domainsRaw = await this.prisma.riskDomain.findMany({
      where: includeLegacy
        ? { clientId, isActive: true }
        : { clientId, isActive: true, isVisibleInCatalog: true },
      orderBy: [{ code: 'asc' }],
      include: {
        types: {
          where: includeLegacy
            ? { isActive: true }
            : { isActive: true, isVisibleInCatalog: true },
          orderBy: [{ isRecommended: 'desc' }, { name: 'asc' }, { code: 'asc' }],
          select: {
            id: true,
            code: true,
            name: true,
            isActive: true,
            isRecommended: true,
            isVisibleInCatalog: true,
          },
        },
      },
    });
    const domains = domainsRaw
      .filter((d) => includeLegacy || isRiskDomainVisibleInV1Catalog(d.code))
      .map((d) => {
        const family = getRiskDomainUiFamily(d.code);
        return {
          ...d,
          familyCode: family.code,
          familyLabel: family.label,
          isVisibleInCatalog: d.isVisibleInCatalog,
        };
      });
    return { domains };
  }

  /** Administration : tous les domaines (types inclus). */
  async listDomainsAdmin(clientId: string, activeOnly?: boolean) {
    await this.ensureForClient(clientId);
    const where: Prisma.RiskDomainWhereInput = { clientId };
    if (activeOnly === true) where.isActive = true;
    return this.prisma.riskDomain.findMany({
      where,
      orderBy: [{ code: 'asc' }],
      include: {
        types: { orderBy: [{ code: 'asc' }] },
      },
    });
  }

  private async countRisksForDomain(domainId: string): Promise<number> {
    return this.prisma.projectRisk.count({
      where: { riskType: { domainId } },
    });
  }

  private async countRisksForType(typeId: string): Promise<number> {
    return this.prisma.projectRisk.count({ where: { riskTypeId: typeId } });
  }

  async createDomain(
    clientId: string,
    dto: { code: string; name: string; description?: string | null; isActive?: boolean },
  ) {
    const code = dto.code.trim().toUpperCase();
    return this.prisma.riskDomain.create({
      data: {
        clientId,
        code,
        name: dto.name.trim(),
        description: dto.description?.trim() ?? null,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async updateDomain(
    clientId: string,
    domainId: string,
    dto: {
      code?: string;
      name?: string;
      description?: string | null;
      isActive?: boolean;
    },
  ) {
    const existing = await this.prisma.riskDomain.findFirst({
      where: { id: domainId, clientId },
    });
    if (!existing) throw new NotFoundException('Domaine introuvable');

    if (dto.code !== undefined && dto.code.trim().toUpperCase() !== existing.code) {
      const n = await this.countRisksForDomain(domainId);
      if (n > 0) {
        throw new BadRequestException(
          'Le code du domaine ne peut pas être modifié : des risques y sont rattachés.',
        );
      }
    }

    return this.prisma.riskDomain.update({
      where: { id: domainId },
      data: {
        ...(dto.code !== undefined && { code: dto.code.trim().toUpperCase() }),
        ...(dto.name !== undefined && { name: dto.name.trim() }),
        ...(dto.description !== undefined && {
          description: dto.description?.trim() ?? null,
        }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    });
  }

  async createType(
    clientId: string,
    dto: {
      domainId: string;
      code: string;
      name: string;
      isActive?: boolean;
    },
  ) {
    const domain = await this.prisma.riskDomain.findFirst({
      where: { id: dto.domainId, clientId },
    });
    if (!domain) {
      throw new BadRequestException('Domaine invalide pour ce client');
    }
    const code = dto.code.trim().toUpperCase();
    return this.prisma.riskType.create({
      data: {
        clientId,
        domainId: dto.domainId,
        code,
        name: dto.name.trim(),
        isActive: dto.isActive ?? true,
      },
    });
  }

  async updateType(
    clientId: string,
    typeId: string,
    dto: {
      code?: string;
      name?: string;
      isActive?: boolean;
    },
  ) {
    const existing = await this.prisma.riskType.findFirst({
      where: { id: typeId, clientId },
      include: { domain: true },
    });
    if (!existing) throw new NotFoundException('Type introuvable');

    if (dto.code !== undefined && dto.code.trim().toUpperCase() !== existing.code) {
      const n = await this.countRisksForType(typeId);
      if (n > 0) {
        throw new BadRequestException(
          'Le code du type ne peut pas être modifié : des risques y sont rattachés.',
        );
      }
    }

    return this.prisma.riskType.update({
      where: { id: typeId },
      data: {
        ...(dto.code !== undefined && { code: dto.code.trim().toUpperCase() }),
        ...(dto.name !== undefined && { name: dto.name.trim() }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    });
  }

  /**
   * Validation create/update risque projet : type du bon client, actif, domaine parent actif.
   */
  async assertUsableRiskTypeForWrite(
    clientId: string,
    riskTypeId: string,
  ): Promise<void> {
    const rt = await this.prisma.riskType.findFirst({
      where: { id: riskTypeId, clientId },
      include: { domain: true },
    });
    if (!rt) {
      throw new BadRequestException('Type de risque invalide pour ce client');
    }
    if (!rt.isActive || !rt.domain.isActive) {
      throw new BadRequestException(
        'Ce type (ou son domaine) est inactif : choisissez un type actif.',
      );
    }
  }
}
