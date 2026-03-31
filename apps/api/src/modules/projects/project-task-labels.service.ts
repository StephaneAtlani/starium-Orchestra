import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ProjectTaskLabel } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ProjectsService } from './projects.service';
import { CreateProjectTaskLabelDto } from './dto/create-project-task-label.dto';

@Injectable()
export class ProjectTaskLabelsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly projects: ProjectsService,
  ) {}

  private async isMicrosoftPlannerLabelsEnabled(clientId: string, projectId: string) {
    const link = await this.prisma.projectMicrosoftLink.findFirst({
      where: { clientId, projectId },
      select: { useMicrosoftPlannerLabels: true },
    });
    return link?.useMicrosoftPlannerLabels ?? false;
  }

  async list(clientId: string, projectId: string): Promise<ProjectTaskLabel[]> {
    await this.projects.getProjectForScope(clientId, projectId);
    return this.prisma.projectTaskLabel.findMany({
      where: { clientId, projectId },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  async create(
    clientId: string,
    projectId: string,
    dto: CreateProjectTaskLabelDto,
  ): Promise<ProjectTaskLabel> {
    await this.projects.getProjectForScope(clientId, projectId);
    if (await this.isMicrosoftPlannerLabelsEnabled(clientId, projectId)) {
      throw new UnprocessableEntityException(
        'Les étiquettes Starium sont remplacées par celles de Microsoft Planner pour ce projet',
      );
    }

    const name = dto.name.trim();
    const existing = await this.prisma.projectTaskLabel.findFirst({
      where: { clientId, projectId, name: { equals: name, mode: 'insensitive' } },
      select: { id: true },
    });
    if (existing) throw new ConflictException('Nom d’étiquette déjà existant pour ce projet');

    const maxOrder = await this.prisma.projectTaskLabel.aggregate({
      where: { clientId, projectId },
      _max: { sortOrder: true },
    });
    const nextOrder = (maxOrder._max.sortOrder ?? -1) + 1;

    return this.prisma.projectTaskLabel.create({
      data: {
        clientId,
        projectId,
        name,
        color: dto.color ?? null,
        sortOrder: nextOrder,
        plannerCategoryId: null,
      },
    });
  }

  async delete(clientId: string, projectId: string, labelId: string): Promise<void> {
    await this.projects.getProjectForScope(clientId, projectId);
    if (await this.isMicrosoftPlannerLabelsEnabled(clientId, projectId)) {
      throw new UnprocessableEntityException(
        'Les étiquettes Starium sont remplacées par celles de Microsoft Planner pour ce projet',
      );
    }

    const existing = await this.prisma.projectTaskLabel.findFirst({
      where: { id: labelId, clientId, projectId },
      select: { id: true },
    });
    if (!existing) throw new NotFoundException('Label not found');

    await this.prisma.projectTaskLabel.delete({ where: { id: labelId } });
  }
}

