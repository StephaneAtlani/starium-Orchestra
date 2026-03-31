import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { ProjectMilestoneLabel } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ProjectsService } from './projects.service';
import { CreateProjectMilestoneLabelDto } from './dto/create-project-milestone-label.dto';

@Injectable()
export class ProjectMilestoneLabelsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly projects: ProjectsService,
  ) {}

  async list(clientId: string, projectId: string): Promise<ProjectMilestoneLabel[]> {
    await this.projects.getProjectForScope(clientId, projectId);
    return this.prisma.projectMilestoneLabel.findMany({
      where: { clientId, projectId },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  async create(
    clientId: string,
    projectId: string,
    dto: CreateProjectMilestoneLabelDto,
  ): Promise<ProjectMilestoneLabel> {
    await this.projects.getProjectForScope(clientId, projectId);

    const name = dto.name.trim();
    const existing = await this.prisma.projectMilestoneLabel.findFirst({
      where: { clientId, projectId, name: { equals: name, mode: 'insensitive' } },
      select: { id: true },
    });
    if (existing) throw new ConflictException('Nom d’étiquette déjà existant pour ce projet');

    const maxOrder = await this.prisma.projectMilestoneLabel.aggregate({
      where: { clientId, projectId },
      _max: { sortOrder: true },
    });
    const nextOrder = (maxOrder._max.sortOrder ?? -1) + 1;

    return this.prisma.projectMilestoneLabel.create({
      data: {
        clientId,
        projectId,
        name,
        color: dto.color ?? null,
        sortOrder: nextOrder,
      },
    });
  }

  async delete(clientId: string, projectId: string, labelId: string): Promise<void> {
    await this.projects.getProjectForScope(clientId, projectId);

    const existing = await this.prisma.projectMilestoneLabel.findFirst({
      where: { id: labelId, clientId, projectId },
      select: { id: true },
    });
    if (!existing) throw new NotFoundException('Label not found');

    await this.prisma.projectMilestoneLabel.delete({ where: { id: labelId } });
  }
}

