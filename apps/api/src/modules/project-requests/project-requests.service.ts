import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ClientUserStatus,
  NotificationStatus,
  NotificationType,
  Prisma,
  ProjectRequest,
  ProjectRequestRoutingTarget,
  ProjectRequestStatus,
  ProjectRequestValidatorSelectionMode,
  ProjectRequestWorkflowSettings,
  RoleScope,
} from '@prisma/client';
import { satisfiesPermission } from '@starium-orchestra/rbac-permissions';
import { PrismaService } from '../../prisma/prisma.service';
import {
  AuditLogsService,
  CreateAuditLogInput,
} from '../audit-logs/audit-logs.service';
import { RequestMeta } from '../../common/decorators/request-meta.decorator';
import { EffectivePermissionsService } from '../../common/services/effective-permissions.service';
import { AccessControlService } from '../access-control/access-control.service';
import { ClientProjectRequestWorkflowSettingsService } from '../clients/client-project-request-workflow-settings.service';
import { EmailService } from '../email/email.service';
import {
  assertMembershipLicense,
  type MembershipWithSubscription,
} from './project-request-membership.util';
import {
  canReadProjectRequest,
  canWriteProjectRequest,
  filterReadableProjectRequestIds,
} from './project-request-access.helpers';
import {
  bootstrapProjectRequestAccess,
  syncValidatorAutoAcl,
} from './project-request-acl.bootstrap';
import { CreateProjectRequestDto } from './dto/create-project-request.dto';
import { UpdateProjectRequestDto } from './dto/update-project-request.dto';
import { ListProjectRequestsQueryDto } from './dto/list-project-requests-query.dto';
import { ProjectRequestDecisionDto } from './dto/project-request-decision.dto';
import { ProjectRequestRouteDto } from './dto/project-request-route.dto';
import { ProjectRequestCancelDto } from './dto/project-request-cancel.dto';
import { toUserSummary } from './project-request-user.util';
import { ProjectRequestWorkflowService } from './project-request-workflow.service';
import { ProjectRequestToProjectConverter } from './project-request-to-project.converter';
import { ProjectRequestPilotingCycleRoutingService } from './project-request-piloting-cycle-routing.service';

const userSelect = {
  select: { id: true, email: true, firstName: true, lastName: true },
} as const;

const includeDetail = {
  requester: userSelect,
  validator: userSelect,
  decidedBy: userSelect,
  convertedProject: { select: { id: true, name: true, code: true } },
} as const;

type AuditContext = { actorUserId?: string; meta?: RequestMeta };

@Injectable()
export class ProjectRequestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogs: AuditLogsService,
    private readonly accessControl: AccessControlService,
    private readonly effectivePermissions: EffectivePermissionsService,
    private readonly workflowSettings: ClientProjectRequestWorkflowSettingsService,
    private readonly workflow: ProjectRequestWorkflowService,
    private readonly converter: ProjectRequestToProjectConverter,
    private readonly emailService: EmailService,
    private readonly pilotingCycleRouting: ProjectRequestPilotingCycleRoutingService,
  ) {}

  private async loadMembership(
    clientId: string,
    userId: string,
  ): Promise<MembershipWithSubscription> {
    const membership = await this.prisma.clientUser.findUnique({
      where: { userId_clientId: { userId, clientId } },
      include: { subscription: true },
    });
    return membership as MembershipWithSubscription;
  }

  private async assertReadLicense(clientId: string, userId: string) {
    const membership = await this.loadMembership(clientId, userId);
    assertMembershipLicense(membership, 'read');
    return membership;
  }

  private async assertWriteLicense(clientId: string, userId: string) {
    const membership = await this.loadMembership(clientId, userId);
    assertMembershipLicense(membership, 'write');
    return membership;
  }

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

  private toResponse(row: Prisma.ProjectRequestGetPayload<{
    include: typeof includeDetail;
  }>) {
    return {
      ...row,
      estimatedBudget:
        row.estimatedBudget != null ? Number(row.estimatedBudget) : null,
      requesterSummary: toUserSummary(row.requester),
      validatorSummary: row.validator ? toUserSummary(row.validator) : null,
      decidedBySummary: row.decidedBy ? toUserSummary(row.decidedBy) : null,
      convertedProjectSummary: row.convertedProject
        ? {
            id: row.convertedProject.id,
            name: row.convertedProject.name,
            code: row.convertedProject.code,
          }
        : null,
    };
  }

  private async findInClientOrThrow(
    clientId: string,
    id: string,
  ): Promise<ProjectRequest> {
    const row = await this.prisma.projectRequest.findFirst({
      where: { id, clientId },
    });
    if (!row) {
      throw new NotFoundException('Demande projet introuvable');
    }
    return row;
  }

  private async assertCanRead(
    clientId: string,
    userId: string,
    resourceId: string,
  ): Promise<void> {
    const ok = await canReadProjectRequest(this.accessControl, {
      clientId,
      userId,
      resourceId,
    });
    if (!ok) {
      throw new NotFoundException('Demande projet introuvable');
    }
  }

  private async assertCanWrite(
    clientId: string,
    userId: string,
    resourceId: string,
  ): Promise<void> {
    const ok = await canWriteProjectRequest(this.accessControl, {
      clientId,
      userId,
      resourceId,
    });
    if (!ok) {
      throw new NotFoundException('Demande projet introuvable');
    }
  }

  private buildListCandidateWhere(
    clientId: string,
    actorUserId: string,
    codes: Set<string>,
    query: ListProjectRequestsQueryDto,
  ): Prisma.ProjectRequestWhereInput {
    const adminView =
      this.hasPerm(codes, 'project_requests.update') ||
      this.hasPerm(codes, 'project_requests.route');

    const base: Prisma.ProjectRequestWhereInput = { clientId };

    if (!adminView) {
      base.OR = [
        { requesterUserId: actorUserId },
        { validatorUserId: actorUserId },
      ];
    }

    if (query.status) {
      base.status = query.status;
    }
    if (query.validatorUserId) {
      base.validatorUserId = query.validatorUserId;
    }
    if (query.search?.trim()) {
      const q = query.search.trim();
      base.AND = [
        ...(Array.isArray(base.AND) ? base.AND : base.AND ? [base.AND] : []),
        {
          OR: [
            { title: { contains: q, mode: 'insensitive' } },
            { description: { contains: q, mode: 'insensitive' } },
          ],
        },
      ];
    }

    return base;
  }

  async list(
    clientId: string,
    actorUserId: string,
    query: ListProjectRequestsQueryDto,
  ) {
    await this.assertReadLicense(clientId, actorUserId);
    const codes = await this.permissionCodes(clientId, actorUserId);

    const where = this.buildListCandidateWhere(
      clientId,
      actorUserId,
      codes,
      query,
    );

    const rows = await this.prisma.projectRequest.findMany({
      where,
      select: { id: true },
      orderBy: { updatedAt: 'desc' },
    });

    const readableIds = await filterReadableProjectRequestIds(
      this.accessControl,
      {
        clientId,
        userId: actorUserId,
        resourceIds: rows.map((r) => r.id),
      },
    );

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const offset = (page - 1) * limit;
    const total = readableIds.length;
    const pagedIds = readableIds.slice(offset, offset + limit);

    const items =
      pagedIds.length === 0
        ? []
        : await this.prisma.projectRequest.findMany({
            where: { id: { in: pagedIds } },
            include: includeDetail,
          });

    const byId = new Map(items.map((i) => [i.id, i]));
    const ordered = pagedIds
      .map((id) => byId.get(id))
      .filter((x): x is NonNullable<typeof x> => Boolean(x))
      .map((row) => this.toResponse(row));

    return { items: ordered, total, page, limit };
  }

  async getById(clientId: string, actorUserId: string, id: string) {
    await this.assertReadLicense(clientId, actorUserId);
    await this.findInClientOrThrow(clientId, id);
    await this.assertCanRead(clientId, actorUserId, id);

    const row = await this.prisma.projectRequest.findFirst({
      where: { id, clientId },
      include: includeDetail,
    });
    if (!row) {
      throw new NotFoundException('Demande projet introuvable');
    }
    return this.toResponse(row);
  }

  private async assertActiveClientUser(
    clientId: string,
    userId: string,
  ): Promise<void> {
    const cu = await this.prisma.clientUser.findUnique({
      where: { userId_clientId: { userId, clientId } },
    });
    if (!cu || cu.status !== ClientUserStatus.ACTIVE) {
      throw new BadRequestException('Utilisateur validateur invalide pour ce client');
    }
  }

  private async userIdsWithPermission(
    clientId: string,
    permissionCode: string,
  ): Promise<Set<string>> {
    const perm = await this.prisma.permission.findFirst({
      where: { code: permissionCode },
      select: { id: true },
    });
    if (!perm) return new Set();

    const userRoles = await this.prisma.userRole.findMany({
      where: {
        role: {
          OR: [
            { scope: RoleScope.CLIENT, clientId },
            { scope: RoleScope.GLOBAL },
          ],
          rolePermissions: { some: { permissionId: perm.id } },
        },
      },
      select: { userId: true },
    });
    return new Set(userRoles.map((ur) => ur.userId));
  }

  async assertValidatorEligible(
    clientId: string,
    validatorUserId: string,
    settings: ProjectRequestWorkflowSettings,
  ): Promise<void> {
    await this.assertActiveClientUser(clientId, validatorUserId);

    const listUsers = settings.authorizedValidatorUserIds ?? [];
    const listRoles = settings.authorizedValidatorRoleIds ?? [];

    if (listUsers.length === 0 && listRoles.length === 0) {
      const withValidate = await this.userIdsWithPermission(
        clientId,
        'project_requests.validate',
      );
      if (!withValidate.has(validatorUserId)) {
        throw new BadRequestException(
          'Validateur non éligible (permission project_requests.validate requise)',
        );
      }
      return;
    }

    if (listUsers.includes(validatorUserId)) {
      return;
    }

    if (listRoles.length > 0) {
      const roleMatch = await this.prisma.userRole.findFirst({
        where: {
          userId: validatorUserId,
          roleId: { in: listRoles },
          role: {
            OR: [
              { scope: RoleScope.CLIENT, clientId },
              { scope: RoleScope.GLOBAL },
            ],
          },
        },
      });
      if (roleMatch) {
        return;
      }
    }

    const withValidate = await this.userIdsWithPermission(
      clientId,
      'project_requests.validate',
    );
    if (withValidate.has(validatorUserId)) {
      return;
    }

    throw new BadRequestException('Validateur non éligible selon les paramètres client');
  }

  async validatorOptions(clientId: string, actorUserId: string) {
    await this.assertReadLicense(clientId, actorUserId);
    const { stored: settings } = await this.workflowSettings.getActive(clientId);

    const clientUsers = await this.prisma.clientUser.findMany({
      where: { clientId, status: ClientUserStatus.ACTIVE },
      include: { user: userSelect },
    });

    const validatePermUsers = await this.userIdsWithPermission(
      clientId,
      'project_requests.validate',
    );

    const listUsers = settings.authorizedValidatorUserIds ?? [];
    const listRoles = settings.authorizedValidatorRoleIds ?? [];

    const eligible = new Set<string>();

    if (listUsers.length === 0 && listRoles.length === 0) {
      for (const uid of validatePermUsers) {
        eligible.add(uid);
      }
    } else {
      for (const uid of listUsers) {
        eligible.add(uid);
      }
      if (listRoles.length > 0) {
        const withRoles = await this.prisma.userRole.findMany({
          where: {
            roleId: { in: listRoles },
            role: {
              OR: [
                { scope: RoleScope.CLIENT, clientId },
                { scope: RoleScope.GLOBAL },
              ],
            },
          },
          select: { userId: true },
        });
        for (const ur of withRoles) {
          eligible.add(ur.userId);
        }
      }
      for (const uid of validatePermUsers) {
        eligible.add(uid);
      }
    }

    return clientUsers
      .filter((cu) => eligible.has(cu.userId) && cu.userId !== actorUserId)
      .map((cu) => toUserSummary(cu.user));
  }

  async create(
    clientId: string,
    actorUserId: string,
    dto: CreateProjectRequestDto,
    context?: AuditContext,
  ) {
    const membership = await this.assertWriteLicense(clientId, actorUserId);
    const { stored: settings } = await this.workflowSettings.getActive(clientId);

    if (dto.validatorUserId) {
      if (!settings.allowRequesterToSelectValidator) {
        throw new BadRequestException(
          'La sélection du validateur par le demandeur est désactivée',
        );
      }
      await this.assertValidatorEligible(
        clientId,
        dto.validatorUserId,
        settings,
      );
    }

    const created = await this.prisma.$transaction(async (tx) => {
      const request = await tx.projectRequest.create({
        data: {
          clientId,
          title: dto.title.trim(),
          description: dto.description?.trim() ?? null,
          requesterUserId: actorUserId,
          validatorUserId: dto.validatorUserId ?? null,
          urgency: dto.urgency ?? null,
          estimatedBudget:
            dto.estimatedBudget != null
              ? new Prisma.Decimal(dto.estimatedBudget)
              : null,
          expectedBenefits: dto.expectedBenefits?.trim() ?? null,
          businessContext: dto.businessContext?.trim() ?? null,
          riskIfNotDone: dto.riskIfNotDone?.trim() ?? null,
        },
      });

      await bootstrapProjectRequestAccess(tx, {
        clientId,
        projectRequestId: request.id,
        requesterUserId: actorUserId,
        validatorUserId: dto.validatorUserId ?? null,
      });

      return request;
    });

    await this.auditLogs.create({
      clientId,
      userId: context?.actorUserId ?? actorUserId,
      action: 'project_request.created',
      resourceType: 'project_request',
      resourceId: created.id,
      newValue: { title: created.title, status: created.status },
      ipAddress: context?.meta?.ipAddress,
      userAgent: context?.meta?.userAgent,
      requestId: context?.meta?.requestId,
    });

    return this.getById(clientId, actorUserId, created.id);
  }

  private assertEditableByRequester(
    request: ProjectRequest,
    actorUserId: string,
    codes: Set<string>,
  ): void {
    const isRequester = request.requesterUserId === actorUserId;
    const canUpdate = this.hasPerm(codes, 'project_requests.update');
    if (
      isRequester &&
      (request.status === ProjectRequestStatus.DRAFT ||
        request.status === ProjectRequestStatus.NEEDS_MORE_INFO)
    ) {
      return;
    }
    if (canUpdate) {
      return;
    }
    throw new ForbiddenException('Modification non autorisée');
  }

  async update(
    clientId: string,
    actorUserId: string,
    id: string,
    dto: UpdateProjectRequestDto,
    context?: AuditContext,
  ) {
    await this.assertWriteLicense(clientId, actorUserId);
    const codes = await this.permissionCodes(clientId, actorUserId);
    const existing = await this.findInClientOrThrow(clientId, id);
    await this.assertCanWrite(clientId, actorUserId, id);
    this.assertEditableByRequester(existing, actorUserId, codes);

    const { stored: settings } = await this.workflowSettings.getActive(clientId);

    const adminSelects =
      settings.validatorSelectionMode ===
      ProjectRequestValidatorSelectionMode.ADMIN_SELECTS;
    const canUpdate = this.hasPerm(codes, 'project_requests.update');

    if (dto.validatorUserId !== undefined) {
      const nextValidator = dto.validatorUserId;
      if (nextValidator) {
        await this.assertValidatorEligible(clientId, nextValidator, settings);
      }
      const requesterCannotChange =
        !adminSelects &&
        existing.requesterUserId === actorUserId &&
        !canUpdate &&
        existing.status === ProjectRequestStatus.SUBMITTED;
      if (requesterCannotChange) {
        throw new BadRequestException(
          'Le validateur ne peut pas être modifié dans cet état',
        );
      }
      if (
        !adminSelects &&
        existing.status !== ProjectRequestStatus.DRAFT &&
        existing.status !== ProjectRequestStatus.NEEDS_MORE_INFO &&
        !canUpdate
      ) {
        throw new BadRequestException(
          'Modification du validateur réservée à un administrateur',
        );
      }
    }

    const validatorChanging =
      dto.validatorUserId !== undefined &&
      dto.validatorUserId !== existing.validatorUserId;

    if (validatorChanging) {
      await this.prisma.$transaction(async (tx) => {
        await tx.projectRequest.update({
          where: { id },
          data: {
            ...(dto.title !== undefined && { title: dto.title.trim() }),
            ...(dto.description !== undefined && {
              description: dto.description?.trim() ?? null,
            }),
            validatorUserId: dto.validatorUserId ?? null,
            ...(dto.urgency !== undefined && { urgency: dto.urgency }),
            ...(dto.estimatedBudget !== undefined && {
              estimatedBudget:
                dto.estimatedBudget != null
                  ? new Prisma.Decimal(dto.estimatedBudget)
                  : null,
            }),
            ...(dto.expectedBenefits !== undefined && {
              expectedBenefits: dto.expectedBenefits?.trim() ?? null,
            }),
            ...(dto.businessContext !== undefined && {
              businessContext: dto.businessContext?.trim() ?? null,
            }),
            ...(dto.riskIfNotDone !== undefined && {
              riskIfNotDone: dto.riskIfNotDone?.trim() ?? null,
            }),
          },
        });
        await syncValidatorAutoAcl(tx, {
          clientId,
          projectRequestId: id,
          oldValidatorUserId: existing.validatorUserId,
          newValidatorUserId: dto.validatorUserId ?? null,
        });
      });
    } else {
      await this.prisma.projectRequest.update({
        where: { id },
        data: {
          ...(dto.title !== undefined && { title: dto.title.trim() }),
          ...(dto.description !== undefined && {
            description: dto.description?.trim() ?? null,
          }),
          ...(dto.urgency !== undefined && { urgency: dto.urgency }),
          ...(dto.estimatedBudget !== undefined && {
            estimatedBudget:
              dto.estimatedBudget != null
                ? new Prisma.Decimal(dto.estimatedBudget)
                : null,
          }),
          ...(dto.expectedBenefits !== undefined && {
            expectedBenefits: dto.expectedBenefits?.trim() ?? null,
          }),
          ...(dto.businessContext !== undefined && {
            businessContext: dto.businessContext?.trim() ?? null,
          }),
          ...(dto.riskIfNotDone !== undefined && {
            riskIfNotDone: dto.riskIfNotDone?.trim() ?? null,
          }),
        },
      });
    }

    await this.auditLogs.create({
      clientId,
      userId: context?.actorUserId ?? actorUserId,
      action: 'project_request.updated',
      resourceType: 'project_request',
      resourceId: id,
      newValue: dto,
      ipAddress: context?.meta?.ipAddress,
      userAgent: context?.meta?.userAgent,
      requestId: context?.meta?.requestId,
    });

    return this.getById(clientId, actorUserId, id);
  }

  async submit(
    clientId: string,
    actorUserId: string,
    id: string,
    context?: AuditContext,
  ) {
    await this.assertWriteLicense(clientId, actorUserId);
    const existing = await this.findInClientOrThrow(clientId, id);
    await this.assertCanWrite(clientId, actorUserId, id);

    if (
      existing.status !== ProjectRequestStatus.DRAFT &&
      existing.status !== ProjectRequestStatus.NEEDS_MORE_INFO
    ) {
      throw new BadRequestException('Soumission impossible dans cet état');
    }
    if (!existing.title?.trim() || !existing.description?.trim()) {
      throw new BadRequestException('Titre et description requis pour soumettre');
    }
    if (!existing.validatorUserId) {
      throw new BadRequestException('Validateur requis pour soumettre');
    }

    const { stored: settings } = await this.workflowSettings.getActive(clientId);
    await this.assertValidatorEligible(
      clientId,
      existing.validatorUserId,
      settings,
    );

    await this.prisma.projectRequest.update({
      where: { id },
      data: { status: ProjectRequestStatus.SUBMITTED },
    });

    await this.auditLogs.create({
      clientId,
      userId: actorUserId,
      action: 'project_request.submitted',
      resourceType: 'project_request',
      resourceId: id,
      newValue: { status: ProjectRequestStatus.SUBMITTED },
      ipAddress: context?.meta?.ipAddress,
      userAgent: context?.meta?.userAgent,
      requestId: context?.meta?.requestId,
    });

    await this.notifyValidatorOnSubmit(clientId, existing, actorUserId);

    return this.getById(clientId, actorUserId, id);
  }

  private assertCanDecide(request: ProjectRequest, actorUserId: string): void {
    if (request.validatorUserId !== actorUserId) {
      throw new ForbiddenException(
        'Seul le validateur désigné peut décider sur cette demande',
      );
    }
  }

  private async notifyValidatorOnSubmit(
    clientId: string,
    request: ProjectRequest,
    actorUserId: string,
  ): Promise<void> {
    const validatorUserId = request.validatorUserId;
    if (!validatorUserId) return;

    const [validator, requester] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: validatorUserId },
        select: { id: true, email: true, firstName: true, lastName: true },
      }),
      this.prisma.user.findUnique({
        where: { id: actorUserId },
        select: { id: true, email: true, firstName: true, lastName: true },
      }),
    ]);
    if (!validator?.email) return;

    const requesterLabel = requester
      ? toUserSummary(requester).displayName
      : 'Un demandeur';
    const title = 'Demande projet à valider';
    const message = `${requesterLabel} a soumis la demande « ${request.title} » pour votre validation.`;
    const actionUrl = `/projects/requests/${request.id}`;

    await this.prisma.notification.create({
      data: {
        clientId,
        userId: validator.id,
        type: NotificationType.INFO,
        title,
        message,
        status: NotificationStatus.UNREAD,
        entityType: 'project_request',
        entityId: request.id,
        entityLabel: request.title,
        actionUrl,
      },
    });

    await this.emailService.queueEmail({
      clientId,
      createdByUserId: actorUserId,
      recipient: validator.email,
      templateKey: 'generic_notification',
      title,
      message,
      actionUrl,
    });
  }

  private async notifyRequesterOnDecision(
    clientId: string,
    requestId: string,
    actorUserId: string,
    outcome: 'APPROVED' | 'REJECTED' | 'NEEDS_MORE_INFO',
    comment?: string | null,
  ): Promise<void> {
    const request = await this.prisma.projectRequest.findFirst({
      where: { id: requestId, clientId },
      select: {
        id: true,
        title: true,
        status: true,
        routingStatus: true,
        requesterUserId: true,
        convertedProject: { select: { code: true } },
      },
    });
    if (!request) return;

    const requesterUserId = request.requesterUserId;
    if (requesterUserId === actorUserId) return;

    const [requester, validator] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: requesterUserId },
        select: { id: true, email: true, firstName: true, lastName: true },
      }),
      this.prisma.user.findUnique({
        where: { id: actorUserId },
        select: { email: true, firstName: true, lastName: true },
      }),
    ]);
    if (!requester?.email) return;

    const validatorLabel = validator
      ? toUserSummary({ ...validator, id: actorUserId }).displayName
      : 'Le validateur';
    const actionUrl = `/projects/requests/${request.id}`;
    const commentSuffix = comment?.trim()
      ? ` Commentaire : ${comment.trim()}`
      : '';

    let title: string;
    let message: string;

    if (outcome === 'REJECTED') {
      title = 'Demande projet refusée';
      message = `${validatorLabel} a refusé votre demande « ${request.title} ».${commentSuffix}`;
    } else if (outcome === 'NEEDS_MORE_INFO') {
      title = 'Compléments demandés sur votre demande projet';
      message = `${validatorLabel} demande des précisions sur « ${request.title} ».${commentSuffix}`;
    } else if (request.status === ProjectRequestStatus.CONVERTED_TO_PROJECT) {
      const projectCode = request.convertedProject?.code ?? 'projet brouillon';
      title = 'Demande projet approuvée — projet créé';
      message = `${validatorLabel} a approuvé « ${request.title} ». Un projet brouillon (${projectCode}) a été créé dans le portefeuille.${commentSuffix}`;
    } else if (request.routingStatus === 'ROUTED_TO_PILOTING_CYCLE') {
      title = 'Demande projet approuvée — pool cycle de pilotage';
      message = `${validatorLabel} a approuvé « ${request.title} ». Elle a été ajoutée au pool du cycle de pilotage configuré.${commentSuffix}`;
    } else {
      title = 'Demande projet approuvée';
      message = `${validatorLabel} a approuvé « ${request.title} ». Elle est en attente de routage vers le portefeuille.${commentSuffix}`;
    }

    await this.prisma.notification.create({
      data: {
        clientId,
        userId: requester.id,
        type: NotificationType.INFO,
        title,
        message,
        status: NotificationStatus.UNREAD,
        entityType: 'project_request',
        entityId: request.id,
        entityLabel: request.title,
        actionUrl,
      },
    });

    await this.emailService.queueEmail({
      clientId,
      createdByUserId: actorUserId,
      recipient: requester.email,
      templateKey: 'generic_notification',
      title,
      message,
      actionUrl,
    });
  }

  async decision(
    clientId: string,
    actorUserId: string,
    id: string,
    dto: ProjectRequestDecisionDto,
    context?: AuditContext,
  ) {
    await this.assertWriteLicense(clientId, actorUserId);
    const existing = await this.findInClientOrThrow(clientId, id);
    await this.assertCanWrite(clientId, actorUserId, id);

    if (existing.status !== ProjectRequestStatus.SUBMITTED) {
      throw new BadRequestException('Décision possible uniquement sur demande soumise');
    }

    this.assertCanDecide(existing, actorUserId);

    const now = new Date();

    if (dto.outcome === 'NEEDS_MORE_INFO') {
      await this.prisma.projectRequest.update({
        where: { id },
        data: {
          status: ProjectRequestStatus.NEEDS_MORE_INFO,
          needsMoreInfoComment: dto.comment?.trim() ?? null,
          decidedByUserId: actorUserId,
          decidedAt: now,
        },
      });
    } else if (dto.outcome === 'REJECTED') {
      await this.prisma.projectRequest.update({
        where: { id },
        data: {
          status: ProjectRequestStatus.REJECTED,
          decisionComment: dto.comment?.trim() ?? null,
          decidedByUserId: actorUserId,
          decidedAt: now,
        },
      });
    } else {
      const { stored: settings } =
        await this.workflowSettings.getActive(clientId);
      await this.prisma.projectRequest.update({
        where: { id },
        data: {
          decisionComment: dto.comment?.trim() ?? null,
          decidedByUserId: actorUserId,
          decidedAt: now,
        },
      });
      const refreshed = await this.findInClientOrThrow(clientId, id);
      const membership = await this.loadMembership(clientId, actorUserId);
      await this.workflow.applyAfterApproval(clientId, refreshed, settings, {
        actorUserId,
        meta: context?.meta,
        membership,
      });
    }

    await this.auditLogs.create({
      clientId,
      userId: actorUserId,
      action: 'project_request.decision',
      resourceType: 'project_request',
      resourceId: id,
      newValue: { outcome: dto.outcome },
      ipAddress: context?.meta?.ipAddress,
      userAgent: context?.meta?.userAgent,
      requestId: context?.meta?.requestId,
    });

    await this.notifyRequesterOnDecision(
      clientId,
      id,
      actorUserId,
      dto.outcome,
      dto.comment,
    );

    return this.getById(clientId, actorUserId, id);
  }

  async route(
    clientId: string,
    actorUserId: string,
    id: string,
    dto: ProjectRequestRouteDto,
    context?: AuditContext,
  ) {
    const membership = await this.assertWriteLicense(clientId, actorUserId);
    const existing = await this.findInClientOrThrow(clientId, id);
    await this.assertCanWrite(clientId, actorUserId, id);

    if (existing.status !== ProjectRequestStatus.APPROVED) {
      throw new BadRequestException('Routage possible uniquement sur demande approuvée');
    }
    if (existing.convertedProjectId) {
      throw new BadRequestException('Demande déjà convertie');
    }

    if (dto.target === ProjectRequestRoutingTarget.DRAFT_PROJECT) {
      const updated = await this.converter.convertToDraftProject(
        clientId,
        id,
        { actorUserId, meta: context?.meta, membership },
      );
      return this.getById(clientId, actorUserId, updated.id);
    }

    if (dto.target === ProjectRequestRoutingTarget.PILOTING_CYCLE) {
      const { stored: settings } = await this.workflowSettings.getActive(clientId);
      const updated =
        await this.pilotingCycleRouting.routeApprovedToPilotingCycleIfEligible(
          clientId,
          existing,
          settings,
          { actorUserId, meta: context?.meta, membership },
        );
      await this.auditLogs.create({
        clientId,
        userId: actorUserId,
        action: 'project_request.routed',
        resourceType: 'project_request',
        resourceId: id,
        newValue: { target: dto.target },
        ipAddress: context?.meta?.ipAddress,
        userAgent: context?.meta?.userAgent,
        requestId: context?.meta?.requestId,
      });
      return this.getById(clientId, actorUserId, updated.id);
    }

    const routingStatus = this.workflow.routingStatusForTarget(dto.target);
    await this.prisma.projectRequest.update({
      where: { id },
      data: {
        routingTarget: dto.target,
        routingStatus,
        routedAt: new Date(),
      },
    });

    await this.auditLogs.create({
      clientId,
      userId: actorUserId,
      action: 'project_request.routed',
      resourceType: 'project_request',
      resourceId: id,
      newValue: { target: dto.target },
      ipAddress: context?.meta?.ipAddress,
      userAgent: context?.meta?.userAgent,
      requestId: context?.meta?.requestId,
    });

    return this.getById(clientId, actorUserId, id);
  }

  async cancel(
    clientId: string,
    actorUserId: string,
    id: string,
    _dto: ProjectRequestCancelDto,
    context?: AuditContext,
  ) {
    await this.assertWriteLicense(clientId, actorUserId);
    const codes = await this.permissionCodes(clientId, actorUserId);
    const existing = await this.findInClientOrThrow(clientId, id);
    await this.assertCanWrite(clientId, actorUserId, id);

    const isCancellableStatus =
      existing.status === ProjectRequestStatus.DRAFT ||
      existing.status === ProjectRequestStatus.NEEDS_MORE_INFO ||
      existing.status === ProjectRequestStatus.SUBMITTED;
    const isRequester = existing.requesterUserId === actorUserId;
    const canUpdate = this.hasPerm(codes, 'project_requests.update');

    if (isCancellableStatus) {
      if (!isRequester && !canUpdate) {
        throw new ForbiddenException('Annulation non autorisée');
      }
    } else if (
      existing.status === ProjectRequestStatus.APPROVED ||
      existing.status === ProjectRequestStatus.REJECTED ||
      existing.status === ProjectRequestStatus.CONVERTED_TO_PROJECT
    ) {
      if (!canUpdate) {
        throw new ForbiddenException('Annulation admin requise');
      }
    } else {
      throw new BadRequestException('Annulation impossible dans cet état');
    }

    await this.prisma.projectRequest.update({
      where: { id },
      data: { status: ProjectRequestStatus.CANCELLED },
    });

    await this.auditLogs.create({
      clientId,
      userId: actorUserId,
      action: 'project_request.cancelled',
      resourceType: 'project_request',
      resourceId: id,
      newValue: { status: ProjectRequestStatus.CANCELLED },
      ipAddress: context?.meta?.ipAddress,
      userAgent: context?.meta?.userAgent,
      requestId: context?.meta?.requestId,
    });

    return this.getById(clientId, actorUserId, id);
  }
}
