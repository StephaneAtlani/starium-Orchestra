import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Prisma,
  ProjectRequest,
  ProjectRequestCircuitStep,
  ProjectRequestInstructionOpinion,
  ProjectRequestStatus,
  ProjectRequestType,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { RequestMeta } from '../../common/decorators/request-meta.decorator';
import { EffectivePermissionsService } from '../../common/services/effective-permissions.service';
import { ClientProjectRequestWorkflowSettingsService } from '../clients/client-project-request-workflow-settings.service';
import { satisfiesPermission } from '@starium-orchestra/rbac-permissions';
import {
  computeCircuit,
  statusAfterInstructOk,
  statusAfterN1Approve,
  statusAfterSubmit,
} from './project-request-circuit';
import {
  ProjectRequestAgendaDto,
  ProjectRequestCommitteeDecideDto,
  ProjectRequestInstructDto,
  ProjectRequestN1DecideDto,
} from './dto/project-request-circuit-actions.dto';
import { ProjectRequestToProjectConverter } from './project-request-to-project.converter';
import { toUserSummary } from './project-request-user.util';

type AuditContext = { actorUserId?: string; meta?: RequestMeta };

@Injectable()
export class ProjectRequestCdcWorkflowService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogs: AuditLogsService,
    private readonly effectivePermissions: EffectivePermissionsService,
    private readonly workflowSettings: ClientProjectRequestWorkflowSettingsService,
    private readonly converter: ProjectRequestToProjectConverter,
  ) {}

  private async permissionCodes(
    clientId: string,
    userId: string,
  ): Promise<Set<string>> {
    return this.effectivePermissions.resolvePermissionCodesForRequest({
      clientId,
      userId,
    });
  }

  private hasPerm(codes: Set<string>, code: string): boolean {
    return satisfiesPermission(codes, code);
  }

  private async findOrThrow(
    clientId: string,
    id: string,
  ): Promise<ProjectRequest> {
    const row = await this.prisma.projectRequest.findFirst({
      where: { id, clientId },
    });
    if (!row) throw new NotFoundException('Demande introuvable');
    return row;
  }

  private async authorLabel(userId: string): Promise<string> {
    const u = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, firstName: true, lastName: true },
    });
    return u ? toUserSummary(u).displayName : 'Utilisateur';
  }

  async appendJournalSafe(
    clientId: string,
    projectRequestId: string,
    label: string,
    authorUserId: string | null,
    authorLabel: string,
  ): Promise<void> {
    await this.prisma.projectRequestJournalEntry.create({
      data: {
        clientId,
        projectRequestId,
        label,
        authorUserId: authorUserId ?? undefined,
        authorLabel,
      },
    });
  }

  async nextReferenceCode(clientId: string): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `DP-${year}-`;
    const latest = await this.prisma.projectRequest.findFirst({
      where: { clientId, referenceCode: { startsWith: prefix } },
      orderBy: { referenceCode: 'desc' },
      select: { referenceCode: true },
    });
    let seq = 1;
    if (latest?.referenceCode) {
      const n = Number(latest.referenceCode.slice(prefix.length));
      if (Number.isFinite(n)) seq = n + 1;
    }
    return `${prefix}${String(seq).padStart(3, '0')}`;
  }

  previewCircuit(
    settingsRow: Awaited<
      ReturnType<ClientProjectRequestWorkflowSettingsService['ensureRow']>
    >,
    type?: ProjectRequestType | null,
    budget?: number | null,
  ) {
    return computeCircuit(
      { type: type ?? null, estimatedBudget: budget ?? 0 },
      settingsRow,
    );
  }

  async summary(clientId: string) {
    const { stored: settings } = await this.workflowSettings.getActive(clientId);
    const rows = await this.prisma.projectRequest.findMany({
      where: { clientId },
      select: {
        status: true,
        estimatedBudget: true,
        retainedBudget: true,
      },
    });
    let toInstruct = 0;
    let inCycle = 0;
    let toConvert = 0;
    let envelope = 0;
    for (const r of rows) {
      if (r.status === ProjectRequestStatus.IN_REVIEW) toInstruct += 1;
      if (r.status === ProjectRequestStatus.IN_CYCLE) inCycle += 1;
      if (r.status === ProjectRequestStatus.APPROVED) toConvert += 1;
      if (
        r.status === ProjectRequestStatus.SUBMITTED ||
        r.status === ProjectRequestStatus.IN_REVIEW ||
        r.status === ProjectRequestStatus.IN_CYCLE ||
        r.status === ProjectRequestStatus.APPROVED
      ) {
        const b = r.retainedBudget ?? r.estimatedBudget;
        envelope += b ? Number(b) : 0;
      }
    }
    return {
      toInstruct,
      inCycle,
      toConvert,
      envelopeInCircuit: envelope,
      copilThresholdAmount: Number(settings.copilThresholdAmount),
      codirThresholdAmount: Number(settings.codirThresholdAmount),
      requireN1Validation: settings.requireN1Validation,
      requirePmoInstruction: settings.requirePmoInstruction,
      autoCreateProjectOnApproval: settings.autoCreateProjectOnApproval,
      exemptRequestTypes: settings.exemptRequestTypes,
      instructionSlaBusinessDays: settings.instructionSlaBusinessDays,
    };
  }

  async submitCdc(
    clientId: string,
    actorUserId: string,
    id: string,
    context?: AuditContext,
  ) {
    const existing = await this.findOrThrow(clientId, id);
    if (
      existing.status !== ProjectRequestStatus.DRAFT &&
      existing.status !== ProjectRequestStatus.NEEDS_MORE_INFO
    ) {
      throw new BadRequestException('Soumission impossible dans cet état');
    }
    if (!existing.title?.trim()) {
      throw new BadRequestException('Donnez un intitulé à la demande');
    }
    if (!existing.requestingDirection?.trim()) {
      throw new BadRequestException('Indiquez la direction demandeuse');
    }

    const { stored: settings } = await this.workflowSettings.getActive(clientId);
    const nextStatus = statusAfterSubmit(settings) as ProjectRequestStatus;
    const who = await this.authorLabel(actorUserId);

    await this.prisma.projectRequest.update({
      where: { id },
      data: {
        status: nextStatus,
        arbitrationInstance: computeCircuit(existing, settings).instance,
      },
    });
    await this.appendJournalSafe(
      clientId,
      id,
      nextStatus === ProjectRequestStatus.SUBMITTED
        ? `Demande « ${existing.title} » soumise · validation N+1 attendue`
        : 'Demande soumise',
      actorUserId,
      who,
    );
    await this.auditLogs.create({
      clientId,
      userId: actorUserId,
      action: 'project_request.submitted',
      resourceType: 'project_request',
      resourceId: id,
      newValue: { status: nextStatus },
      ipAddress: context?.meta?.ipAddress,
      userAgent: context?.meta?.userAgent,
      requestId: context?.meta?.requestId,
    });
  }

  async n1Decide(
    clientId: string,
    actorUserId: string,
    id: string,
    dto: ProjectRequestN1DecideDto,
    context?: AuditContext,
  ) {
    const codes = await this.permissionCodes(clientId, actorUserId);
    if (!this.hasPerm(codes, 'project_requests.validate')) {
      throw new ForbiddenException('Permission validate requise');
    }
    const existing = await this.findOrThrow(clientId, id);
    if (existing.status !== ProjectRequestStatus.SUBMITTED) {
      throw new BadRequestException('Décision N+1 impossible dans cet état');
    }
    const { stored: settings } = await this.workflowSettings.getActive(clientId);
    const who = await this.authorLabel(actorUserId);

    if (dto.outcome === 'REJECT') {
      await this.prisma.projectRequest.update({
        where: { id },
        data: {
          status: ProjectRequestStatus.REJECTED,
          failedAtStep: ProjectRequestCircuitStep.N1,
          decisionComment: dto.comment?.trim() ?? null,
          decidedByUserId: actorUserId,
          decidedAt: new Date(),
        },
      });
      await this.appendJournalSafe(
        clientId,
        id,
        dto.comment?.trim()
          ? `Refusée par le N+1 — ${dto.comment.trim()}`
          : 'Refusée par le N+1',
        actorUserId,
        who,
      );
    } else {
      const next = statusAfterN1Approve(settings, existing) as ProjectRequestStatus;
      await this.prisma.projectRequest.update({
        where: { id },
        data: {
          status: next,
          decisionComment: dto.comment?.trim() ?? null,
          decidedByUserId: actorUserId,
          decidedAt: new Date(),
          arbitrationInstance: computeCircuit(existing, settings).instance,
        },
      });
      await this.appendJournalSafe(
        clientId,
        id,
        next === ProjectRequestStatus.IN_REVIEW
          ? 'Validation N+1 enregistrée · instruction affectée au PMO'
          : 'Validation N+1 enregistrée',
        actorUserId,
        who,
      );
    }
    await this.auditLogs.create({
      clientId,
      userId: actorUserId,
      action: 'project_request.n1_decided',
      resourceType: 'project_request',
      resourceId: id,
      newValue: { outcome: dto.outcome },
      ipAddress: context?.meta?.ipAddress,
      userAgent: context?.meta?.userAgent,
      requestId: context?.meta?.requestId,
    });
  }

  async instruct(
    clientId: string,
    actorUserId: string,
    id: string,
    dto: ProjectRequestInstructDto,
    context?: AuditContext,
  ) {
    const codes = await this.permissionCodes(clientId, actorUserId);
    if (
      !this.hasPerm(codes, 'project_requests.instruct') &&
      !this.hasPerm(codes, 'project_requests.route')
    ) {
      throw new ForbiddenException('Permission instruct requise');
    }
    const existing = await this.findOrThrow(clientId, id);
    if (existing.status !== ProjectRequestStatus.IN_REVIEW) {
      throw new BadRequestException('Instruction impossible dans cet état');
    }
    const { stored: settings } = await this.workflowSettings.getActive(clientId);
    const who = await this.authorLabel(actorUserId);
    const retainedBudget =
      dto.retainedBudget != null
        ? new Prisma.Decimal(dto.retainedBudget)
        : existing.estimatedBudget;
    const demand = {
      ...existing,
      retainedBudget,
      estimatedBudget: existing.estimatedBudget,
    };

    if (dto.opinion === ProjectRequestInstructionOpinion.UNFAVORABLE) {
      await this.prisma.projectRequest.update({
        where: { id },
        data: {
          status: ProjectRequestStatus.REJECTED,
          failedAtStep: ProjectRequestCircuitStep.INSTRUCTION,
          instructionOpinion: dto.opinion,
          instructionSummary: dto.summary?.trim() ?? null,
          retainedBudget,
          retainedEffortDays:
            dto.retainedEffortDays != null
              ? new Prisma.Decimal(dto.retainedEffortDays)
              : existing.estimatedEffortDays,
        },
      });
      await this.appendJournalSafe(
        clientId,
        id,
        'Instruction conclue · demande refusée',
        actorUserId,
        who,
      );
    } else {
      const next = statusAfterInstructOk(settings, demand) as ProjectRequestStatus;
      const circuit = computeCircuit(demand, settings);
      await this.prisma.projectRequest.update({
        where: { id },
        data: {
          status: next,
          instructionOpinion: dto.opinion,
          instructionSummary: dto.summary?.trim() ?? null,
          retainedBudget,
          retainedEffortDays:
            dto.retainedEffortDays != null
              ? new Prisma.Decimal(dto.retainedEffortDays)
              : existing.estimatedEffortDays,
          arbitrationInstance: circuit.instance,
        },
      });
      const msg =
        next === ProjectRequestStatus.IN_CYCLE
          ? `Instruction conclue · arbitrage en ${circuit.instance ?? 'COPIL'} requis`
          : 'Instruction conclue · demande validée hors cycle';
      await this.appendJournalSafe(clientId, id, msg, actorUserId, who);

      if (
        next === ProjectRequestStatus.APPROVED &&
        settings.autoCreateProjectOnApproval
      ) {
        await this.convertInternal(clientId, actorUserId, id, context);
        return;
      }
    }
    await this.auditLogs.create({
      clientId,
      userId: actorUserId,
      action: 'project_request.instructed',
      resourceType: 'project_request',
      resourceId: id,
      newValue: { opinion: dto.opinion },
      ipAddress: context?.meta?.ipAddress,
      userAgent: context?.meta?.userAgent,
      requestId: context?.meta?.requestId,
    });
  }

  async agenda(
    clientId: string,
    actorUserId: string,
    id: string,
    dto: ProjectRequestAgendaDto,
    context?: AuditContext,
  ) {
    const codes = await this.permissionCodes(clientId, actorUserId);
    if (
      !this.hasPerm(codes, 'project_requests.instruct') &&
      !this.hasPerm(codes, 'project_requests.route')
    ) {
      throw new ForbiddenException('Permission instruct requise');
    }
    const existing = await this.findOrThrow(clientId, id);
    if (existing.status !== ProjectRequestStatus.IN_CYCLE) {
      throw new BadRequestException('Inscription ODJ impossible dans cet état');
    }
    const who = await this.authorLabel(actorUserId);
    await this.prisma.projectRequest.update({
      where: { id },
      data: {
        meetingLabel: dto.meetingLabel.trim(),
        meetingRef: dto.meetingRef?.trim() ?? null,
        agendaItemId: dto.agendaItemId?.trim() ?? null,
      },
    });
    await this.appendJournalSafe(
      clientId,
      id,
      `Point inscrit à l'ordre du jour · ${dto.meetingLabel.trim()}`,
      actorUserId,
      who,
    );
    await this.auditLogs.create({
      clientId,
      userId: actorUserId,
      action: 'project_request.agenda_registered',
      resourceType: 'project_request',
      resourceId: id,
      newValue: { meetingLabel: dto.meetingLabel },
      ipAddress: context?.meta?.ipAddress,
      userAgent: context?.meta?.userAgent,
      requestId: context?.meta?.requestId,
    });
  }

  async committeeDecide(
    clientId: string,
    actorUserId: string,
    id: string,
    dto: ProjectRequestCommitteeDecideDto,
    context?: AuditContext,
  ) {
    const codes = await this.permissionCodes(clientId, actorUserId);
    if (
      !this.hasPerm(codes, 'project_requests.instruct') &&
      !this.hasPerm(codes, 'project_requests.route')
    ) {
      throw new ForbiddenException('Permission instruct requise');
    }
    const existing = await this.findOrThrow(clientId, id);
    if (existing.status !== ProjectRequestStatus.IN_CYCLE) {
      throw new BadRequestException('Décision comité impossible dans cet état');
    }
    if (
      (dto.outcome === 'POSTPONE' || dto.outcome === 'REJECT') &&
      !dto.motivation?.trim()
    ) {
      throw new BadRequestException(
        'Une motivation est attendue pour un ajournement ou un refus',
      );
    }
    const { stored: settings } = await this.workflowSettings.getActive(clientId);
    const who = await this.authorLabel(actorUserId);
    const committeeLabel = existing.meetingLabel ?? 'Comité';

    if (dto.outcome === 'APPROVE') {
      await this.prisma.projectRequest.update({
        where: { id },
        data: {
          status: ProjectRequestStatus.APPROVED,
          decisionComment: dto.motivation?.trim() ?? null,
          decidedByUserId: actorUserId,
          decidedAt: new Date(),
        },
      });
      await this.appendJournalSafe(
        clientId,
        id,
        'Arbitrage favorable enregistré · demande prête à devenir un projet',
        actorUserId,
        committeeLabel,
      );
      if (settings.autoCreateProjectOnApproval) {
        await this.convertInternal(clientId, actorUserId, id, context);
        return;
      }
    } else if (dto.outcome === 'POSTPONE') {
      await this.prisma.projectRequest.update({
        where: { id },
        data: {
          status: ProjectRequestStatus.POSTPONED,
          failedAtStep: ProjectRequestCircuitStep.ARBITRATION,
          decisionComment: dto.motivation?.trim() ?? null,
          decidedByUserId: actorUserId,
          decidedAt: new Date(),
        },
      });
      await this.appendJournalSafe(
        clientId,
        id,
        `Demande ajournée · ${dto.motivation!.trim()}`,
        actorUserId,
        committeeLabel,
      );
    } else {
      await this.prisma.projectRequest.update({
        where: { id },
        data: {
          status: ProjectRequestStatus.REJECTED,
          failedAtStep: ProjectRequestCircuitStep.ARBITRATION,
          decisionComment: dto.motivation?.trim() ?? null,
          decidedByUserId: actorUserId,
          decidedAt: new Date(),
        },
      });
      await this.appendJournalSafe(
        clientId,
        id,
        'Demande refusée en comité',
        actorUserId,
        committeeLabel,
      );
    }
    await this.auditLogs.create({
      clientId,
      userId: actorUserId,
      action: 'project_request.committee_decided',
      resourceType: 'project_request',
      resourceId: id,
      newValue: { outcome: dto.outcome },
      ipAddress: context?.meta?.ipAddress,
      userAgent: context?.meta?.userAgent,
      requestId: context?.meta?.requestId,
    });
  }

  async convert(
    clientId: string,
    actorUserId: string,
    id: string,
    context?: AuditContext,
  ) {
    const codes = await this.permissionCodes(clientId, actorUserId);
    if (
      !this.hasPerm(codes, 'project_requests.instruct') &&
      !this.hasPerm(codes, 'project_requests.route')
    ) {
      throw new ForbiddenException('Permission instruct requise');
    }
    await this.convertInternal(clientId, actorUserId, id, context);
  }

  private async convertInternal(
    clientId: string,
    actorUserId: string,
    id: string,
    context?: AuditContext,
  ) {
    const existing = await this.findOrThrow(clientId, id);
    if (existing.status !== ProjectRequestStatus.APPROVED) {
      // Allow if already approved path via auto — re-read after approve may still be APPROVED
      if (existing.status === ProjectRequestStatus.CONVERTED_TO_PROJECT) {
        return;
      }
      throw new BadRequestException(
        'La conversion n’est proposée qu’au statut Validée',
      );
    }
    // Ensure APPROVED for converter (MVP converter expects APPROVED)
    await this.converter.convertToDraftProject(clientId, id, {
      actorUserId,
      meta: context?.meta,
    });
    const who = await this.authorLabel(actorUserId);
    const after = await this.findOrThrow(clientId, id);
    const projectName = after.convertedProjectId
      ? (
          await this.prisma.project.findUnique({
            where: { id: after.convertedProjectId },
            select: { name: true },
          })
        )?.name
      : existing.title;
    await this.appendJournalSafe(
      clientId,
      id,
      `Projet « ${projectName ?? existing.title} » créé · fiche projet initialisée`,
      actorUserId,
      who,
    );
  }

  async reopen(
    clientId: string,
    actorUserId: string,
    id: string,
    context?: AuditContext,
  ) {
    const codes = await this.permissionCodes(clientId, actorUserId);
    if (
      !this.hasPerm(codes, 'project_requests.instruct') &&
      !this.hasPerm(codes, 'project_requests.route')
    ) {
      throw new ForbiddenException('Permission instruct requise');
    }
    const existing = await this.findOrThrow(clientId, id);
    if (
      existing.status !== ProjectRequestStatus.REJECTED &&
      existing.status !== ProjectRequestStatus.POSTPONED
    ) {
      throw new BadRequestException('Réouverture impossible dans cet état');
    }
    const who = await this.authorLabel(actorUserId);
    await this.prisma.projectRequest.update({
      where: { id },
      data: {
        status: ProjectRequestStatus.DRAFT,
        failedAtStep: null,
        meetingLabel: null,
        meetingRef: null,
        agendaItemId: null,
        arbitrationInstance: null,
      },
    });
    await this.appendJournalSafe(
      clientId,
      id,
      'Demande rouverte pour complément de dossier',
      actorUserId,
      who,
    );
    await this.auditLogs.create({
      clientId,
      userId: actorUserId,
      action: 'project_request.reopened',
      resourceType: 'project_request',
      resourceId: id,
      ipAddress: context?.meta?.ipAddress,
      userAgent: context?.meta?.userAgent,
      requestId: context?.meta?.requestId,
    });
  }
}
