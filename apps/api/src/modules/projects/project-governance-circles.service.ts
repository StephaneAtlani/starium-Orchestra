import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ProjectsService } from './projects.service';
import { CreateProjectGovernanceCircleDto } from './dto/create-project-governance-circle.dto';
import {
  mapGovernanceCircle,
  type ProjectGovernanceCircleResponse,
} from './lib/project-governance-circles.defaults';
import {
  assertGovernanceCircleIdsBelongToProject,
  ensureDefaultGovernanceCirclesForProject,
} from './lib/project-governance-circles.db';

@Injectable()
export class ProjectGovernanceCirclesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly projects: ProjectsService,
  ) {}

  async ensureDefaultCirclesForProject(
    clientId: string,
    projectId: string,
  ): Promise<void> {
    await ensureDefaultGovernanceCirclesForProject(this.prisma, clientId, projectId);
  }

  async list(
    clientId: string,
    projectId: string,
  ): Promise<{ items: ProjectGovernanceCircleResponse[] }> {
    await this.projects.getProjectForScope(clientId, projectId);
    await this.ensureDefaultCirclesForProject(clientId, projectId);
    const rows = await this.prisma.projectGovernanceCircle.findMany({
      where: { clientId, projectId },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
    return { items: rows.map(mapGovernanceCircle) };
  }

  async create(
    clientId: string,
    projectId: string,
    dto: CreateProjectGovernanceCircleDto,
  ): Promise<ProjectGovernanceCircleResponse> {
    await this.projects.getProjectForScope(clientId, projectId);
    await this.ensureDefaultCirclesForProject(clientId, projectId);
    const name = dto.name.trim();
    if (!name.length) {
      throw new BadRequestException('Le nom du cercle est requis');
    }
    const maxOrder = await this.prisma.projectGovernanceCircle.aggregate({
      where: { clientId, projectId },
      _max: { sortOrder: true },
    });
    try {
      const created = await this.prisma.projectGovernanceCircle.create({
        data: {
          clientId,
          projectId,
          name,
          sortOrder: dto.sortOrder ?? (maxOrder._max.sortOrder ?? -1) + 1,
          systemKind: null,
        },
      });
      return mapGovernanceCircle(created);
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        throw new ConflictException('Un cercle porte déjà ce nom sur ce projet');
      }
      throw e;
    }
  }

  async delete(
    clientId: string,
    projectId: string,
    circleId: string,
  ): Promise<void> {
    await this.projects.getProjectForScope(clientId, projectId);
    const existing = await this.prisma.projectGovernanceCircle.findFirst({
      where: { id: circleId, clientId, projectId },
      include: { _count: { select: { memberships: true } } },
    });
    if (!existing) {
      throw new NotFoundException('Cercle de gouvernance introuvable');
    }
    if (existing.systemKind != null) {
      throw new BadRequestException(
        'Les cercles système (Comité de pilotage, Comité de projet) ne peuvent pas être supprimés',
      );
    }
    if (existing._count.memberships > 0) {
      throw new BadRequestException(
        'Retirez les appartenances à ce cercle avant de le supprimer',
      );
    }
    await this.prisma.projectGovernanceCircle.delete({ where: { id: circleId } });
  }

  async assertCircleIdsBelongToProject(
    clientId: string,
    projectId: string,
    circleIds: string[],
  ): Promise<void> {
    await assertGovernanceCircleIdsBelongToProject(
      this.prisma,
      clientId,
      projectId,
      circleIds,
    );
  }
}
