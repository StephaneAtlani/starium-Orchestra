import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { ProjectsService } from '../projects.service';
import { CreateProjectReviewPrepareTemplateDto } from './dto/project-review-prepare-template.dto';
import { UpdateProjectReviewPrepareTemplateDto } from './dto/project-review-prepare-template.dto';

@Injectable()
export class ProjectReviewPrepareTemplatesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly projects: ProjectsService,
  ) {}

  private map(row: {
    id: string;
    clientId: string;
    name: string;
    typeCode: string;
    payload: Prisma.JsonValue;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: row.id,
      name: row.name,
      typeCode: row.typeCode,
      payload: row.payload,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  async list(
    clientId: string,
    projectId: string,
    typeCode?: string,
  ) {
    await this.projects.getProjectForScope(clientId, projectId);
    const items = await this.prisma.projectReviewPrepareTemplate.findMany({
      where: {
        clientId,
        ...(typeCode?.trim()
          ? { typeCode: typeCode.trim().toUpperCase() }
          : {}),
      },
      orderBy: [{ name: 'asc' }],
    });
    return { items: items.map((r) => this.map(r)) };
  }

  async create(
    clientId: string,
    projectId: string,
    dto: CreateProjectReviewPrepareTemplateDto,
  ) {
    await this.projects.getProjectForScope(clientId, projectId);
    const created = await this.prisma.projectReviewPrepareTemplate.create({
      data: {
        clientId,
        name: dto.name.trim(),
        typeCode: dto.typeCode.trim().toUpperCase(),
        payload: dto.payload as Prisma.InputJsonValue,
      },
    });
    return this.map(created);
  }

  async update(
    clientId: string,
    projectId: string,
    templateId: string,
    dto: UpdateProjectReviewPrepareTemplateDto,
  ) {
    await this.projects.getProjectForScope(clientId, projectId);
    const existing = await this.prisma.projectReviewPrepareTemplate.findFirst({
      where: { id: templateId, clientId },
    });
    if (!existing) throw new NotFoundException('Modèle introuvable');

    const updated = await this.prisma.projectReviewPrepareTemplate.update({
      where: { id: existing.id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.payload !== undefined
          ? { payload: dto.payload as Prisma.InputJsonValue }
          : {}),
      },
    });
    return this.map(updated);
  }

  async remove(clientId: string, projectId: string, templateId: string) {
    await this.projects.getProjectForScope(clientId, projectId);
    const existing = await this.prisma.projectReviewPrepareTemplate.findFirst({
      where: { id: templateId, clientId },
    });
    if (!existing) throw new NotFoundException('Modèle introuvable');
    await this.prisma.projectReviewPrepareTemplate.delete({
      where: { id: existing.id },
    });
    return { ok: true };
  }
}
