import {
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ProjectsService } from './projects.service';
import { CreateProjectTaskBucketDto } from './dto/create-project-task-bucket.dto';
import { UpdateProjectTaskBucketDto } from './dto/update-project-task-bucket.dto';

@Injectable()
export class ProjectTaskBucketsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly projects: ProjectsService,
  ) {}

  async list(clientId: string, projectId: string) {
    await this.projects.getProjectForScope(clientId, projectId);
    const link = await this.prisma.projectMicrosoftLink.findFirst({
      where: { projectId, clientId },
      select: { useMicrosoftPlannerBuckets: true },
    });
    const items = await this.prisma.projectTaskBucket.findMany({
      where: { clientId, projectId },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
    return {
      items,
      useMicrosoftPlannerBuckets: link?.useMicrosoftPlannerBuckets ?? false,
    };
  }

  async create(
    clientId: string,
    projectId: string,
    dto: CreateProjectTaskBucketDto,
  ) {
    await this.projects.getProjectForScope(clientId, projectId);
    const link = await this.prisma.projectMicrosoftLink.findFirst({
      where: { projectId, clientId },
      select: { useMicrosoftPlannerBuckets: true },
    });
    if (link?.useMicrosoftPlannerBuckets === true) {
      throw new UnprocessableEntityException(
        'Les buckets Starium sont remplacés par ceux de Microsoft Planner pour ce projet',
      );
    }
    const maxOrder = await this.prisma.projectTaskBucket.aggregate({
      where: { clientId, projectId },
      _max: { sortOrder: true },
    });
    const nextOrder =
      dto.sortOrder ?? ((maxOrder._max.sortOrder ?? -1) + 1);
    return this.prisma.projectTaskBucket.create({
      data: {
        clientId,
        projectId,
        name: dto.name.trim(),
        sortOrder: nextOrder,
        plannerBucketId: null,
      },
    });
  }

  async update(
    clientId: string,
    projectId: string,
    bucketId: string,
    dto: UpdateProjectTaskBucketDto,
  ) {
    await this.projects.getProjectForScope(clientId, projectId);
    const existing = await this.prisma.projectTaskBucket.findFirst({
      where: { id: bucketId, clientId, projectId },
    });
    if (!existing) {
      throw new NotFoundException('Bucket not found');
    }
    const link = await this.prisma.projectMicrosoftLink.findFirst({
      where: { projectId, clientId },
      select: { useMicrosoftPlannerBuckets: true },
    });
    if (link?.useMicrosoftPlannerBuckets === true || existing.plannerBucketId) {
      throw new UnprocessableEntityException(
        'Ce bucket est géré par Microsoft Planner ; modifiez le plan dans Teams.',
      );
    }
    return this.prisma.projectTaskBucket.update({
      where: { id: bucketId },
      data: {
        ...(dto.name !== undefined && { name: dto.name.trim() }),
        ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
      },
    });
  }

  async delete(clientId: string, projectId: string, bucketId: string) {
    await this.projects.getProjectForScope(clientId, projectId);
    const existing = await this.prisma.projectTaskBucket.findFirst({
      where: { id: bucketId, clientId, projectId },
    });
    if (!existing) {
      throw new NotFoundException('Bucket not found');
    }
    const link = await this.prisma.projectMicrosoftLink.findFirst({
      where: { projectId, clientId },
      select: { useMicrosoftPlannerBuckets: true },
    });
    if (link?.useMicrosoftPlannerBuckets === true || existing.plannerBucketId) {
      throw new UnprocessableEntityException(
        'Ce bucket est géré par Microsoft Planner ; supprimez-le dans Teams.',
      );
    }
    await this.prisma.projectTaskBucket.delete({ where: { id: bucketId } });
  }
}
