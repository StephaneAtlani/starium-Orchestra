import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  Patch,
  Post,
  Put,
  Query,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ActiveClientGuard } from '../../common/guards/active-client.guard';
import { ModuleAccessGuard } from '../../common/guards/module-access.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { ActiveClientId } from '../../common/decorators/active-client.decorator';
import { RequestUserId } from '../../common/decorators/request-user.decorator';
import { RequestMeta } from '../../common/decorators/request-meta.decorator';
import type { AuditContext } from '../budget-management/types/audit-context';
import { ComplianceService } from './compliance.service';
import { ComplianceRemindersService } from './compliance-reminders.service';
import { CreateComplianceFrameworkDto } from './dto/create-compliance-framework.dto';
import { CreateComplianceRequirementDto } from './dto/create-compliance-requirement.dto';
import { CreateComplianceEvidenceDto } from './dto/create-compliance-evidence.dto';
import { PatchComplianceStatusDto } from './dto/patch-compliance-status.dto';
import { ListComplianceRequirementsQueryDto } from './dto/list-compliance-requirements.query.dto';
import { ListComplianceStatusQueryDto } from './dto/list-compliance-status.query.dto';

import { ActivateComplianceFrameworkDto } from './dto/activate-compliance-framework.dto';
import { PatchClientComplianceFrameworkDto } from './dto/patch-client-compliance-framework.dto';
import { CreateComplianceCampaignDto } from './dto/create-compliance-campaign.dto';
import { CloseComplianceCampaignDto } from './dto/close-compliance-campaign.dto';
import { CreateComplianceCampaignSnapshotDto } from './dto/create-compliance-campaign-snapshot.dto';
import {
  ConfirmCampaignEvaluationsImportDto,
  PreviewCampaignEvaluationsImportDto,
} from './dto/campaign-evaluations-import.dto';
import {
  RequestComplianceNaDto,
  ReviewComplianceNaDto,
} from './dto/compliance-na-request.dto';
import {
  CreateComplianceContributionDto,
  PatchComplianceContributionDto,
} from './dto/compliance-contribution.dto';
import {
  CreateComplianceEvidenceVersionDto,
  PatchComplianceEvidenceDto,
} from './dto/patch-compliance-evidence.dto';
import {
  CreateComplianceGapDto,
  PatchComplianceGapDto,
} from './dto/compliance-gap.dto';
import { ComplianceRemediationPlanDto } from './dto/compliance-remediation-plan.dto';

@Controller('compliance')
@UseGuards(JwtAuthGuard, ActiveClientGuard, ModuleAccessGuard, PermissionsGuard)
export class ComplianceController {
  constructor(
    private readonly compliance: ComplianceService,
    private readonly reminders: ComplianceRemindersService,
  ) {}

  /** COMP.V2 — campagnes / revues. */
  @Get('campaigns')
  @RequirePermissions('compliance.read')
  listCampaigns(
    @ActiveClientId() clientId: string | undefined,
    @Query('frameworkId') frameworkId?: string,
  ) {
    return this.compliance.listCampaigns(clientId!, frameworkId);
  }

  @Get('campaigns/evaluations-import-template')
  @RequirePermissions('compliance.read')
  evaluationsImportTemplate() {
    return {
      filename: 'orchestra-conformite-evaluations-modele.csv',
      contentType: 'text/csv; charset=utf-8',
      csv: this.compliance.getCampaignEvaluationsImportTemplate(),
    };
  }

  @Post('campaigns')
  @RequirePermissions('compliance.update')
  createCampaign(
    @ActiveClientId() clientId: string | undefined,
    @Body() dto: CreateComplianceCampaignDto,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta() meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    const context: AuditContext = { actorUserId, meta };
    return this.compliance.createCampaign(clientId!, dto, context);
  }

  @Get('campaigns/:id')
  @RequirePermissions('compliance.read')
  getCampaign(
    @ActiveClientId() clientId: string | undefined,
    @Param('id') id: string,
  ) {
    return this.compliance.getCampaign(clientId!, id);
  }

  @Post('campaigns/:id/open')
  @RequirePermissions('compliance.update')
  openCampaign(
    @ActiveClientId() clientId: string | undefined,
    @Param('id') id: string,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta() meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    const context: AuditContext = { actorUserId, meta };
    return this.compliance.openCampaign(clientId!, id, context);
  }

  @Post('campaigns/:id/close')
  @RequirePermissions('compliance.update')
  closeCampaign(
    @ActiveClientId() clientId: string | undefined,
    @Param('id') id: string,
    @Body() dto: CloseComplianceCampaignDto,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta() meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    const context: AuditContext = { actorUserId, meta };
    return this.compliance.closeCampaign(clientId!, id, dto, context);
  }

  @Get('campaigns/:id/snapshots')
  @RequirePermissions('compliance.read')
  listCampaignSnapshots(
    @ActiveClientId() clientId: string | undefined,
    @Param('id') id: string,
  ) {
    return this.compliance.listCampaignSnapshots(clientId!, id);
  }

  @Post('campaigns/:id/snapshots')
  @RequirePermissions('compliance.update')
  createCampaignSnapshot(
    @ActiveClientId() clientId: string | undefined,
    @Param('id') id: string,
    @Body() dto: CreateComplianceCampaignSnapshotDto,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta() meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    const context: AuditContext = { actorUserId, meta };
    return this.compliance.createCampaignSnapshot(clientId!, id, dto, context);
  }

  @Post('campaigns/:id/evaluations-import/preview')
  @RequirePermissions('compliance.update')
  previewEvaluationsImport(
    @ActiveClientId() clientId: string | undefined,
    @Param('id') id: string,
    @Body() dto: PreviewCampaignEvaluationsImportDto,
  ) {
    return this.compliance.previewCampaignEvaluationsImport(clientId!, id, dto);
  }

  @Post('campaigns/:id/evaluations-import/confirm')
  @RequirePermissions('compliance.update')
  confirmEvaluationsImport(
    @ActiveClientId() clientId: string | undefined,
    @Param('id') id: string,
    @Body() dto: ConfirmCampaignEvaluationsImportDto,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta() meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    const context: AuditContext = { actorUserId, meta };
    return this.compliance.confirmCampaignEvaluationsImport(
      clientId!,
      id,
      dto,
      context,
    );
  }

  @Get('campaigns/:campaignId/snapshots/:snapshotId')
  @RequirePermissions('compliance.read')
  getCampaignSnapshot(
    @ActiveClientId() clientId: string | undefined,
    @Param('campaignId') campaignId: string,
    @Param('snapshotId') snapshotId: string,
  ) {
    return this.compliance.getCampaignSnapshot(clientId!, campaignId, snapshotId);
  }

  /** Export ZIP dossier d’audit (HTML + CSV + JSON). Pas pour lecture seule pure. */
  @Get('campaigns/:campaignId/snapshots/:snapshotId/export.zip')
  @RequirePermissions('compliance.update')
  @Header('Content-Type', 'application/zip')
  async exportCampaignSnapshotZip(
    @ActiveClientId() clientId: string | undefined,
    @Param('campaignId') campaignId: string,
    @Param('snapshotId') snapshotId: string,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta() meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ): Promise<StreamableFile> {
    const context: AuditContext = { actorUserId, meta };
    const { filename, buffer } =
      await this.compliance.exportCampaignSnapshotZip(
        clientId!,
        campaignId,
        snapshotId,
        context,
      );
    return new StreamableFile(buffer, {
      type: 'application/zip',
      disposition: `attachment; filename="${filename}"`,
    });
  }

  /** Catalogue plateforme proposé (actifs) — avant activation client. */
  @Get('frameworks/catalog')
  @RequirePermissions('compliance.read')
  listCatalog() {
    return this.compliance.listProposedPlatformFrameworks();
  }

  @Get('frameworks')
  @RequirePermissions('compliance.read')
  listFrameworks(@ActiveClientId() clientId: string | undefined) {
    return this.compliance.listFrameworks(clientId!);
  }

  /** Active / désactive une instance client (`isActive`) — historique conservé. */
  @Patch('frameworks/:id')
  @RequirePermissions('compliance.update')
  patchFramework(
    @ActiveClientId() clientId: string | undefined,
    @Param('id') id: string,
    @Body() dto: PatchClientComplianceFrameworkDto,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta() meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    const context: AuditContext = { actorUserId, meta };
    return this.compliance.setClientFrameworkActive(
      clientId!,
      id,
      dto.isActive,
      context,
    );
  }

  /** Avancement par référentiel (cartes « Référentiels réglementaires »). */
  @Get('frameworks/summary')
  @RequirePermissions('compliance.read')
  frameworksSummary(@ActiveClientId() clientId: string | undefined) {
    return this.compliance.frameworksSummary(clientId!);
  }

  /** Fiche détail référentiel : domaines, exigences, remédiation (COMP.UX.1–3). */
  @Get('frameworks/:id/overview')
  @RequirePermissions('compliance.read')
  getFrameworkOverview(
    @ActiveClientId() clientId: string | undefined,
    @Param('id') id: string,
  ) {
    return this.compliance.getFrameworkOverview(clientId!, id);
  }

  @Post('frameworks')
  @RequirePermissions('compliance.update')
  createFramework(
    @ActiveClientId() clientId: string | undefined,
    @Body() dto: CreateComplianceFrameworkDto,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta() meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    const context: AuditContext = { actorUserId, meta };
    return this.compliance.createFramework(clientId!, dto, context);
  }

  @Post('frameworks/activate')
  @RequirePermissions('compliance.update')
  activateFramework(
    @ActiveClientId() clientId: string | undefined,
    @Body() dto: ActivateComplianceFrameworkDto,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta() meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    const context: AuditContext = { actorUserId, meta };
    return this.compliance.activatePlatformFrameworkForClient(
      clientId!,
      dto.platformFrameworkId,
      context,
    );
  }

  @Get('requirements')
  @RequirePermissions('compliance.read')
  async listRequirements(
    @ActiveClientId() clientId: string | undefined,
    @Query() query: ListComplianceRequirementsQueryDto,
    @RequestUserId() actorUserId: string | undefined,
  ) {
    const locale = await this.compliance.resolveUserContentLocale(actorUserId);
    return this.compliance.listRequirements(clientId!, query, locale);
  }

  @Get('requirements/:id')
  @RequirePermissions('compliance.read')
  async getRequirement(
    @ActiveClientId() clientId: string | undefined,
    @Param('id') id: string,
    @RequestUserId() actorUserId: string | undefined,
  ) {
    const locale = await this.compliance.resolveUserContentLocale(actorUserId);
    return this.compliance.getRequirementDetail(clientId!, id, locale);
  }

  @Post('requirements/:id/na-request')
  @RequirePermissions('compliance.update')
  requestNa(
    @ActiveClientId() clientId: string | undefined,
    @Param('id') id: string,
    @Body() dto: RequestComplianceNaDto,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta() meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    const context: AuditContext = { actorUserId, meta };
    return this.compliance.requestNotApplicable(clientId!, id, dto, context);
  }

  @Post('requirements/:id/na-approve')
  @RequirePermissions('compliance.update')
  approveNa(
    @ActiveClientId() clientId: string | undefined,
    @Param('id') id: string,
    @Body() dto: ReviewComplianceNaDto,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta() meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    const context: AuditContext = { actorUserId, meta };
    return this.compliance.approveNotApplicable(clientId!, id, dto, context);
  }

  @Post('requirements/:id/na-reject')
  @RequirePermissions('compliance.update')
  rejectNa(
    @ActiveClientId() clientId: string | undefined,
    @Param('id') id: string,
    @Body() dto: ReviewComplianceNaDto,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta() meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    const context: AuditContext = { actorUserId, meta };
    return this.compliance.rejectNotApplicable(clientId!, id, dto, context);
  }

  @Post('requirements/:id/na-cancel')
  @RequirePermissions('compliance.update')
  cancelNa(
    @ActiveClientId() clientId: string | undefined,
    @Param('id') id: string,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta() meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    const context: AuditContext = { actorUserId, meta };
    return this.compliance.cancelNotApplicableRequest(clientId!, id, context);
  }

  @Get('contributions')
  @RequirePermissions('compliance.read')
  listContributions(
    @ActiveClientId() clientId: string | undefined,
    @RequestUserId() actorUserId: string | undefined,
    @Query('requirementId') requirementId?: string,
    @Query('mine') mine?: string,
  ) {
    return this.compliance.listContributions(clientId!, {
      requirementId,
      mineForUserId: mine === '1' || mine === 'true' ? actorUserId : undefined,
    });
  }

  @Post('contributions')
  @RequirePermissions('compliance.update')
  createContribution(
    @ActiveClientId() clientId: string | undefined,
    @Body() dto: CreateComplianceContributionDto,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta() meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    const context: AuditContext = { actorUserId, meta };
    return this.compliance.createContribution(clientId!, dto, context);
  }

  @Patch('contributions/:id')
  @RequirePermissions('compliance.update')
  patchContribution(
    @ActiveClientId() clientId: string | undefined,
    @Param('id') id: string,
    @Body() dto: PatchComplianceContributionDto,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta() meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    const context: AuditContext = { actorUserId, meta };
    return this.compliance.patchContribution(clientId!, id, dto, context);
  }

  /** Upsert du statut d’évaluation pour une exigence (création si absent). */
  @Put('requirements/:id/status')
  @RequirePermissions('compliance.update')
  upsertRequirementStatus(
    @ActiveClientId() clientId: string | undefined,
    @Param('id') id: string,
    @Body() dto: PatchComplianceStatusDto,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta() meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    const context: AuditContext = { actorUserId, meta };
    return this.compliance.upsertStatusForRequirement(clientId!, id, dto, context);
  }

  @Post('requirements')
  @RequirePermissions('compliance.update')
  createRequirement(
    @ActiveClientId() clientId: string | undefined,
    @Body() dto: CreateComplianceRequirementDto,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta() meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    const context: AuditContext = { actorUserId, meta };
    return this.compliance.createRequirement(clientId!, dto, context);
  }

  @Get('status')
  @RequirePermissions('compliance.read')
  listStatuses(
    @ActiveClientId() clientId: string | undefined,
    @Query() query: ListComplianceStatusQueryDto,
  ) {
    return this.compliance.listStatuses(clientId!, query);
  }

  @Patch('status/:id')
  @RequirePermissions('compliance.update')
  patchStatus(
    @ActiveClientId() clientId: string | undefined,
    @Param('id') id: string,
    @Body() dto: PatchComplianceStatusDto,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta() meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    const context: AuditContext = { actorUserId, meta };
    return this.compliance.patchStatus(clientId!, id, dto, context);
  }

  @Post('evidence')
  @RequirePermissions('compliance.update')
  createEvidence(
    @ActiveClientId() clientId: string | undefined,
    @Body() dto: CreateComplianceEvidenceDto,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta() meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    const context: AuditContext = { actorUserId, meta };
    return this.compliance.createEvidence(clientId!, dto, actorUserId, context);
  }

  @Patch('evidence/:id')
  @RequirePermissions('compliance.update')
  patchEvidence(
    @ActiveClientId() clientId: string | undefined,
    @Param('id') id: string,
    @Body() dto: PatchComplianceEvidenceDto,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta() meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    const context: AuditContext = { actorUserId, meta };
    return this.compliance.patchEvidence(clientId!, id, dto, context);
  }

  @Post('evidence/:id/versions')
  @RequirePermissions('compliance.update')
  createEvidenceVersion(
    @ActiveClientId() clientId: string | undefined,
    @Param('id') id: string,
    @Body() dto: CreateComplianceEvidenceVersionDto,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta() meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    const context: AuditContext = { actorUserId, meta };
    return this.compliance.createEvidenceVersion(clientId!, id, dto, context);
  }

  @Get('gaps')
  @RequirePermissions('compliance.read')
  listGaps(
    @ActiveClientId() clientId: string | undefined,
    @Query('requirementId') requirementId?: string,
  ) {
    return this.compliance.listGaps(clientId!, requirementId);
  }

  @Post('gaps')
  @RequirePermissions('compliance.update')
  createGap(
    @ActiveClientId() clientId: string | undefined,
    @Body() dto: CreateComplianceGapDto,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta() meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    const context: AuditContext = { actorUserId, meta };
    return this.compliance.createGap(clientId!, dto, context);
  }

  @Patch('gaps/:id')
  @RequirePermissions('compliance.update')
  patchGap(
    @ActiveClientId() clientId: string | undefined,
    @Param('id') id: string,
    @Body() dto: PatchComplianceGapDto,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta() meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    const context: AuditContext = { actorUserId, meta };
    return this.compliance.patchGap(clientId!, id, dto, context);
  }

  @Get('gaps/:gapId/action-plan-tasks')
  @RequirePermissions('compliance.read')
  listGapActionPlanTasks(
    @ActiveClientId() clientId: string | undefined,
    @Param('gapId') gapId: string,
  ) {
    return this.compliance.listGapActionPlanTasks(clientId!, gapId);
  }

  @Post('gaps/:gapId/remediation-plan')
  @RequirePermissions('compliance.update', 'projects.update')
  attachRemediationPlan(
    @ActiveClientId() clientId: string | undefined,
    @Param('gapId') gapId: string,
    @Body() dto: ComplianceRemediationPlanDto,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta() meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    const context: AuditContext = { actorUserId, meta };
    return this.compliance.attachRemediationPlan(clientId!, gapId, dto, context);
  }

  @Post('requirements/:requirementId/remediation-plan')
  @RequirePermissions('compliance.update', 'projects.update')
  attachRemediationPlanForRequirement(
    @ActiveClientId() clientId: string | undefined,
    @Param('requirementId') requirementId: string,
    @Body() dto: ComplianceRemediationPlanDto,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta() meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    const context: AuditContext = { actorUserId, meta };
    return this.compliance.attachRemediationPlanForRequirement(
      clientId!,
      requirementId,
      dto,
      context,
    );
  }

  /**
   * Relance manuelle des rappels du client actif (idempotente).
   * Utile en exploitation / tests — le cron quotidien reste la voie nominale.
   */
  @Post('reminders/process')
  @RequirePermissions('compliance.update')
  processReminders(@ActiveClientId() clientId: string | undefined) {
    return this.reminders.processClient(clientId!);
  }

  @Get('dashboard')
  @RequirePermissions('compliance.read')
  dashboard(@ActiveClientId() clientId: string | undefined) {
    return this.compliance.dashboard(clientId!);
  }
}
