import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MeetingTemplate, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import {
  CreateMeetingTemplateDto,
  DuplicateMeetingTemplateDto,
  ListMeetingTemplatesQueryDto,
  MeetingTemplateSectionInputDto,
  PutMeetingTemplateSectionsDto,
  UpdateMeetingTemplateDto,
} from './dto/meeting.dto';
import { MEETING_ERROR_CODES } from './lib/meeting-error-codes';
import {
  findDuplicateNonRepeatableSections,
  meetingSectionDefaultTitle,
} from './lib/meeting-section-catalog';

/**
 * RFC-MEET-001 §4.3 — modèles de rituel.
 *
 * Les modèles système (`isSystem`) sont livrés par le seed : non modifiables et
 * non supprimables, mais **masquables**. Un client qui veut les adapter les
 * duplique.
 */
@Injectable()
export class MeetingTemplatesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogs: AuditLogsService,
  ) {}

  async list(clientId: string, query: ListMeetingTemplatesQueryDto) {
    return this.prisma.meetingTemplate.findMany({
      where: {
        clientId,
        ...(query.scope ? { scope: query.scope } : {}),
        ...(query.kind ? { kind: query.kind } : {}),
        ...(query.includeHidden ? {} : { isHidden: false }),
      },
      include: { sections: { orderBy: { sortOrder: 'asc' } } },
      orderBy: [{ isSystem: 'desc' }, { name: 'asc' }],
    });
  }

  async getOrThrow(clientId: string, templateId: string) {
    const template = await this.prisma.meetingTemplate.findFirst({
      where: { id: templateId, clientId },
      include: { sections: { orderBy: { sortOrder: 'asc' } } },
    });
    if (!template) {
      throw new NotFoundException('Modèle de réunion introuvable');
    }
    return template;
  }

  async create(
    clientId: string,
    userId: string | undefined,
    dto: CreateMeetingTemplateDto,
  ) {
    this.assertSectionComposition(dto.sections);
    await this.assertCodeAvailable(clientId, dto.code);

    const template = await this.prisma.meetingTemplate.create({
      data: {
        clientId,
        code: dto.code,
        name: dto.name,
        description: dto.description ?? null,
        kind: dto.kind,
        scope: dto.scope,
        isSystem: false,
        defaultDurationMinutes: dto.defaultDurationMinutes ?? null,
        createdByUserId: userId ?? null,
        sections: {
          create: dto.sections.map((section, index) =>
            this.sectionCreateInput(clientId, section, index),
          ),
        },
      },
      include: { sections: { orderBy: { sortOrder: 'asc' } } },
    });

    await this.auditLogs.create({
      clientId,
      userId,
      action: 'meeting_template.created',
      resourceType: 'MEETING_TEMPLATE',
      resourceId: template.id,
      newValue: { code: template.code, name: template.name, scope: template.scope },
    });

    return template;
  }

  async update(
    clientId: string,
    userId: string | undefined,
    templateId: string,
    dto: UpdateMeetingTemplateDto,
  ) {
    const template = await this.getOrThrow(clientId, templateId);

    // Un modèle système reste masquable : c'est la seule modification permise.
    const touchesMoreThanVisibility =
      dto.name !== undefined ||
      dto.description !== undefined ||
      dto.defaultDurationMinutes !== undefined;
    if (template.isSystem && touchesMoreThanVisibility) {
      throw new ConflictException({
        code: MEETING_ERROR_CODES.TEMPLATE_SYSTEM_READONLY,
        message:
          'Modèle fourni par Starium : dupliquez-le pour l’adapter. Seul le masquage est permis.',
      });
    }

    const updated = await this.prisma.meetingTemplate.update({
      where: { id: template.id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.description !== undefined
          ? { description: dto.description }
          : {}),
        ...(dto.defaultDurationMinutes !== undefined
          ? { defaultDurationMinutes: dto.defaultDurationMinutes }
          : {}),
        ...(dto.isHidden !== undefined ? { isHidden: dto.isHidden } : {}),
      },
      include: { sections: { orderBy: { sortOrder: 'asc' } } },
    });

    await this.auditLogs.create({
      clientId,
      userId,
      action: 'meeting_template.updated',
      resourceType: 'MEETING_TEMPLATE',
      resourceId: template.id,
      oldValue: { name: template.name, isHidden: template.isHidden },
      newValue: { name: updated.name, isHidden: updated.isHidden },
    });

    return updated;
  }

  async remove(
    clientId: string,
    userId: string | undefined,
    templateId: string,
  ) {
    const template = await this.getOrThrow(clientId, templateId);
    if (template.isSystem) {
      throw new ConflictException({
        code: MEETING_ERROR_CODES.TEMPLATE_SYSTEM_READONLY,
        message:
          'Un modèle fourni par Starium ne peut pas être supprimé. Masquez-le si vous ne l’utilisez pas.',
      });
    }

    const usage = await this.prisma.meeting.count({
      where: { clientId, templateId: template.id },
    });
    if (usage > 0) {
      throw new ConflictException({
        code: MEETING_ERROR_CODES.TEMPLATE_SYSTEM_READONLY,
        message: `Ce modèle est utilisé par ${usage} réunion(s). Masquez-le plutôt que de le supprimer.`,
      });
    }

    await this.prisma.meetingTemplate.delete({ where: { id: template.id } });
    await this.auditLogs.create({
      clientId,
      userId,
      action: 'meeting_template.deleted',
      resourceType: 'MEETING_TEMPLATE',
      resourceId: template.id,
      oldValue: { code: template.code, name: template.name },
    });
  }

  /** Duplication : point d'entrée pour adapter un modèle système. */
  async duplicate(
    clientId: string,
    userId: string | undefined,
    templateId: string,
    dto: DuplicateMeetingTemplateDto,
  ) {
    const source = await this.getOrThrow(clientId, templateId);
    await this.assertCodeAvailable(clientId, dto.code);

    const copy = await this.prisma.meetingTemplate.create({
      data: {
        clientId,
        code: dto.code,
        name: dto.name,
        description: source.description,
        kind: source.kind,
        scope: source.scope,
        isSystem: false,
        defaultDurationMinutes: source.defaultDurationMinutes,
        cadence: source.cadence,
        defaultAgenda: source.defaultAgenda ?? Prisma.JsonNull,
        createdByUserId: userId ?? null,
        sections: {
          create: source.sections.map((section) => ({
            clientId,
            sectionType: section.sectionType,
            sortOrder: section.sortOrder,
            titleOverride: section.titleOverride,
            isEnabled: section.isEnabled,
            config: section.config ?? Prisma.JsonNull,
          })),
        },
      },
      include: { sections: { orderBy: { sortOrder: 'asc' } } },
    });

    await this.auditLogs.create({
      clientId,
      userId,
      action: 'meeting_template.duplicated',
      resourceType: 'MEETING_TEMPLATE',
      resourceId: copy.id,
      newValue: { sourceTemplateId: source.id, code: copy.code },
    });

    return copy;
  }

  /** Remplace intégralement la composition de sections d'un modèle. */
  async putSections(
    clientId: string,
    userId: string | undefined,
    templateId: string,
    dto: PutMeetingTemplateSectionsDto,
  ) {
    const template = await this.getOrThrow(clientId, templateId);
    if (template.isSystem) {
      throw new ConflictException({
        code: MEETING_ERROR_CODES.TEMPLATE_SYSTEM_READONLY,
        message:
          'La composition d’un modèle fourni par Starium n’est pas modifiable. Dupliquez-le.',
      });
    }
    this.assertSectionComposition(dto.sections);

    await this.prisma.$transaction([
      this.prisma.meetingTemplateSection.deleteMany({
        where: { clientId, templateId: template.id },
      }),
      this.prisma.meetingTemplateSection.createMany({
        data: dto.sections.map((section, index) => ({
          templateId: template.id,
          ...this.sectionCreateInput(clientId, section, index),
        })),
      }),
    ]);

    await this.auditLogs.create({
      clientId,
      userId,
      action: 'meeting_template.updated',
      resourceType: 'MEETING_TEMPLATE',
      resourceId: template.id,
      newValue: { sections: dto.sections.map((s) => s.sectionType) },
    });

    return this.getOrThrow(clientId, template.id);
  }

  /**
   * Le changement de portée est refusé : il casserait l'inscription des projets
   * et le pont vers les points projet (RFC-MEET-001 §8-12).
   */
  assertScopeUnchanged(template: MeetingTemplate, requestedScope?: string) {
    if (requestedScope !== undefined && requestedScope !== template.scope) {
      throw new ConflictException({
        code: MEETING_ERROR_CODES.TEMPLATE_SCOPE_IMMUTABLE,
        message:
          'La portée d’un modèle n’est pas modifiable. Créez un second modèle pour l’autre portée.',
      });
    }
  }

  private sectionCreateInput(
    clientId: string,
    section: MeetingTemplateSectionInputDto,
    index: number,
  ) {
    return {
      clientId,
      sectionType: section.sectionType,
      sortOrder: index,
      titleOverride: section.titleOverride ?? null,
      isEnabled: section.isEnabled ?? true,
      config: (section.config ?? Prisma.JsonNull) as Prisma.InputJsonValue,
    };
  }

  private assertSectionComposition(
    sections: readonly MeetingTemplateSectionInputDto[],
  ) {
    const duplicates = findDuplicateNonRepeatableSections(
      sections.map((section) => section.sectionType),
    );
    if (duplicates.length > 0) {
      const labels = duplicates.map(meetingSectionDefaultTitle).join(', ');
      throw new BadRequestException(
        `Ces sections ne peuvent apparaître qu’une fois dans un modèle : ${labels}. Utilisez un bloc libre pour un contenu additionnel.`,
      );
    }
  }

  private async assertCodeAvailable(clientId: string, code: string) {
    const existing = await this.prisma.meetingTemplate.findFirst({
      where: { clientId, code },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictException({
        code: MEETING_ERROR_CODES.TEMPLATE_CODE_TAKEN,
        message: `Le code « ${code} » est déjà utilisé par un autre modèle.`,
      });
    }
  }
}
