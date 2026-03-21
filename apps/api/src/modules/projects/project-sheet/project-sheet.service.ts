import { Injectable, NotFoundException } from '@nestjs/common';
import {
  Prisma,
  Project,
  ProjectCopilRecommendation,
  ProjectRisk,
  ProjectRiskLevel,
} from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuditLogsService } from '../../audit-logs/audit-logs.service';
import type { AuditContext } from '../../budget-management/types/audit-context';
import {
  PROJECT_AUDIT_ACTION,
  PROJECT_AUDIT_RESOURCE_TYPE,
} from '../project-audit.constants';
import {
  diffAuditSnapshots,
  projectSheetFieldsAuditSnapshot,
} from '../project-audit-serialize';
import { riskCriticalityForRisk } from '../projects-pilotage.service';
import {
  computePriorityScore,
  computeRoi,
} from './calculators/project-sheet-calculators';
import { SetArbitrationDto } from './dto/set-arbitration.dto';
import { UpdateProjectSheetDto } from './dto/update-project-sheet.dto';
import {
  parseJsonStringArray,
  parseTowsActions,
  type TowsActionsShape,
} from './project-sheet-json';

/**
 * Fiche projet — champs calculés / dérivés exposés au client :
 * - **roi**, **priorityScore** : formules dans `calculators/project-sheet-calculators.ts` ; à l’écriture (PATCH)
 *   `priorityScore` utilise le même **niveau de risque effectif** qu’à la lecture (fiche ou agrégat risques métier).
 * - **riskLevel** dans la réponse : niveau saisi en base, ou à défaut max criticité des risques opérationnels.
 * - **priorityScore** en lecture : valeur persistée si présente, sinon recalcul (aligné après sauvegarde).
 * - **roi** en lecture : colonne persistée si présente, sinon recalcul depuis coût / gain.
 */
export type ProjectSheetResponseDto = {
  id: string;
  name: string;
  code: string;
  description: string | null;
  cadreLocation: string | null;
  cadreQui: string | null;
  startDate: string | null;
  targetEndDate: string | null;
  kind: string;
  type: string;
  status: string;
  priority: string;
  targetBudgetAmount: number | null;
  businessValueScore: number | null;
  strategicAlignment: number | null;
  urgencyScore: number | null;
  estimatedCost: number | null;
  estimatedGain: number | null;
  roi: number | null;
  riskLevel: string | null;
  priorityScore: number | null;
  arbitrationStatus: string | null;
  copilRecommendation: string;
  businessProblem: string | null;
  businessBenefits: string | null;
  businessSuccessKpis: string[];
  swotStrengths: string[];
  swotWeaknesses: string[];
  swotOpportunities: string[];
  swotThreats: string[];
  towsActions: TowsActionsShape | null;
};

function decimalToNumber(d: Prisma.Decimal | null | undefined): number | null {
  if (d == null) return null;
  return d.toNumber();
}

function emptyTows(): TowsActionsShape {
  return { SO: [], ST: [], WO: [], WT: [] };
}

/**
 * Niveau « agrégé » des risques métier (max des criticités P×I, aligné portefeuille).
 * Utilisé en secours quand `Project.riskLevel` (saisie CODIR) est null.
 */
function maxSheetRiskLevelFromOperationalRisks(
  risks: ProjectRisk[],
): ProjectRiskLevel | null {
  if (risks.length === 0) return null;
  let maxRank = 0;
  for (const r of risks) {
    const c = riskCriticalityForRisk(r);
    const rk = c === 'HIGH' ? 3 : c === 'MEDIUM' ? 2 : 1;
    if (rk > maxRank) maxRank = rk;
  }
  if (maxRank === 3) return 'HIGH';
  if (maxRank === 2) return 'MEDIUM';
  return 'LOW';
}

/** Même logique GET / PATCH : saisie fiche prioritaire, sinon agrégat des risques métier. */
function effectiveSheetRiskLevel(
  sheetLevel: ProjectRiskLevel | null,
  operationalRisks: ProjectRisk[],
): ProjectRiskLevel | null {
  return sheetLevel ?? maxSheetRiskLevelFromOperationalRisks(operationalRisks) ?? null;
}

@Injectable()
export class ProjectSheetService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogs: AuditLogsService,
  ) {}

  /**
   * @param operationalRisks — risques projet (même périmètre que GET /risks) pour dériver le niveau
   *   affiché si la fiche n’a pas `riskLevel` en base.
   */
  mapToSheetResponse(
    p: Project,
    operationalRisks: ProjectRisk[] = [],
  ): ProjectSheetResponseDto {
    const effectiveRiskLevel = effectiveSheetRiskLevel(
      p.riskLevel,
      operationalRisks,
    );

    const tows = parseTowsActions(p.towsActions);
    const roiComputed = computeRoi(p.estimatedCost, p.estimatedGain);
    const roiForResponse = p.roi ?? roiComputed;
    const priorityScoreComputed = computePriorityScore(
      p.businessValueScore,
      p.strategicAlignment,
      p.urgencyScore,
      effectiveRiskLevel,
      roiComputed,
    );
    const priorityScoreForResponse =
      p.priorityScore != null ? p.priorityScore : priorityScoreComputed;

    return {
      id: p.id,
      name: p.name,
      code: p.code,
      description: p.description ?? null,
      cadreLocation: p.cadreLocation ?? null,
      cadreQui: p.cadreQui ?? null,
      startDate: p.startDate?.toISOString() ?? null,
      targetEndDate: p.targetEndDate?.toISOString() ?? null,
      kind: p.kind,
      type: p.type,
      status: p.status,
      priority: p.priority,
      targetBudgetAmount: decimalToNumber(p.targetBudgetAmount),
      businessValueScore: p.businessValueScore ?? null,
      strategicAlignment: p.strategicAlignment ?? null,
      urgencyScore: p.urgencyScore ?? null,
      estimatedCost: decimalToNumber(p.estimatedCost),
      estimatedGain: decimalToNumber(p.estimatedGain),
      roi: decimalToNumber(roiForResponse),
      riskLevel: effectiveRiskLevel,
      priorityScore: decimalToNumber(priorityScoreForResponse),
      arbitrationStatus: p.arbitrationStatus ?? null,
      copilRecommendation: p.copilRecommendation,
      businessProblem: p.businessProblem ?? null,
      businessBenefits: p.businessBenefits ?? null,
      businessSuccessKpis: parseJsonStringArray(p.businessSuccessKpis) ?? [],
      swotStrengths: parseJsonStringArray(p.swotStrengths) ?? [],
      swotWeaknesses: parseJsonStringArray(p.swotWeaknesses) ?? [],
      swotOpportunities: parseJsonStringArray(p.swotOpportunities) ?? [],
      swotThreats: parseJsonStringArray(p.swotThreats) ?? [],
      towsActions: tows ?? null,
    };
  }

  async getSheet(
    clientId: string,
    projectId: string,
  ): Promise<ProjectSheetResponseDto> {
    const p = await this.prisma.project.findFirst({
      where: { id: projectId, clientId },
    });
    if (!p) {
      throw new NotFoundException('Project not found');
    }
    const risks = await this.risksForProject(clientId, projectId);
    return this.mapToSheetResponse(p, risks);
  }

  async updateSheet(
    clientId: string,
    projectId: string,
    dto: UpdateProjectSheetDto,
    context?: AuditContext,
  ): Promise<ProjectSheetResponseDto> {
    const existing = await this.prisma.project.findFirst({
      where: { id: projectId, clientId },
    });
    if (!existing) {
      throw new NotFoundException('Project not found');
    }

    const merged = this.mergeSheetState(existing, dto);
    const risks = await this.risksForProject(clientId, projectId);
    const effectiveRiskLevel = effectiveSheetRiskLevel(
      merged.riskLevel,
      risks,
    );
    const roi = computeRoi(merged.estimatedCost, merged.estimatedGain);
    const priorityScore = computePriorityScore(
      merged.businessValueScore,
      merged.strategicAlignment,
      merged.urgencyScore,
      effectiveRiskLevel,
      roi,
    );

    const towsJson: Prisma.InputJsonValue | typeof Prisma.JsonNull =
      merged.towsActions === null
        ? Prisma.JsonNull
        : (merged.towsActions as unknown as Prisma.InputJsonValue);

    const data: Prisma.ProjectUncheckedUpdateInput = {
      name: merged.name,
      description: merged.description,
      cadreLocation: merged.cadreLocation,
      cadreQui: merged.cadreQui,
      startDate: merged.startDate,
      targetEndDate: merged.targetEndDate,
      businessValueScore: merged.businessValueScore,
      strategicAlignment: merged.strategicAlignment,
      urgencyScore: merged.urgencyScore,
      estimatedCost: merged.estimatedCost,
      estimatedGain: merged.estimatedGain,
      roi,
      riskLevel: merged.riskLevel,
      priorityScore,
      copilRecommendation: merged.copilRecommendation,
      businessProblem: merged.businessProblem,
      businessBenefits: merged.businessBenefits,
      businessSuccessKpis:
        merged.businessSuccessKpis === null
          ? Prisma.JsonNull
          : (merged.businessSuccessKpis as unknown as Prisma.InputJsonValue),
      swotStrengths:
        merged.swotStrengths === null
          ? Prisma.JsonNull
          : (merged.swotStrengths as unknown as Prisma.InputJsonValue),
      swotWeaknesses:
        merged.swotWeaknesses === null
          ? Prisma.JsonNull
          : (merged.swotWeaknesses as unknown as Prisma.InputJsonValue),
      swotOpportunities:
        merged.swotOpportunities === null
          ? Prisma.JsonNull
          : (merged.swotOpportunities as unknown as Prisma.InputJsonValue),
      swotThreats:
        merged.swotThreats === null
          ? Prisma.JsonNull
          : (merged.swotThreats as unknown as Prisma.InputJsonValue),
      towsActions: towsJson,
    };

    const updated = await this.prisma.project.update({
      where: { id: projectId },
      data,
    });

    const oldSnap = projectSheetFieldsAuditSnapshot(existing);
    const newSnap = projectSheetFieldsAuditSnapshot(updated);
    const { oldValue, newValue } = diffAuditSnapshots(oldSnap, newSnap);

    const meta = {
      ipAddress: context?.meta?.ipAddress,
      userAgent: context?.meta?.userAgent,
      requestId: context?.meta?.requestId,
    };

    if (Object.keys(oldValue).length > 0) {
      await this.auditLogs.create({
        clientId,
        userId: context?.actorUserId,
        action: PROJECT_AUDIT_ACTION.PROJECT_SHEET_UPDATED,
        resourceType: PROJECT_AUDIT_RESOURCE_TYPE.PROJECT,
        resourceId: projectId,
        oldValue,
        newValue,
        ...meta,
      });
    }

    return this.mapToSheetResponse(updated, risks);
  }

  async setArbitrationStatus(
    clientId: string,
    projectId: string,
    dto: SetArbitrationDto,
    context?: AuditContext,
  ): Promise<ProjectSheetResponseDto> {
    const existing = await this.prisma.project.findFirst({
      where: { id: projectId, clientId },
    });
    if (!existing) {
      throw new NotFoundException('Project not found');
    }

    const updated = await this.prisma.project.update({
      where: { id: projectId },
      data: { arbitrationStatus: dto.status },
    });

    const meta = {
      ipAddress: context?.meta?.ipAddress,
      userAgent: context?.meta?.userAgent,
      requestId: context?.meta?.requestId,
    };

    let action: string;
    if (dto.status === 'VALIDATED') {
      action = PROJECT_AUDIT_ACTION.PROJECT_ARBITRATION_VALIDATED;
    } else if (dto.status === 'REJECTED') {
      action = PROJECT_AUDIT_ACTION.PROJECT_ARBITRATION_REJECTED;
    } else {
      action = PROJECT_AUDIT_ACTION.PROJECT_SHEET_UPDATED;
    }

    await this.auditLogs.create({
      clientId,
      userId: context?.actorUserId,
      action,
      resourceType: PROJECT_AUDIT_RESOURCE_TYPE.PROJECT,
      resourceId: projectId,
      oldValue: { arbitrationStatus: existing.arbitrationStatus ?? null },
      newValue: { arbitrationStatus: dto.status },
      ...meta,
    });

    const risks = await this.risksForProject(clientId, projectId);
    return this.mapToSheetResponse(updated, risks);
  }

  private async risksForProject(
    clientId: string,
    projectId: string,
  ): Promise<ProjectRisk[]> {
    return this.prisma.projectRisk.findMany({
      where: { clientId, projectId },
    });
  }

  private mergeSheetState(
    project: Project,
    dto: UpdateProjectSheetDto,
  ): {
    name: string;
    description: string | null;
    cadreLocation: string | null;
    cadreQui: string | null;
    startDate: Date | null;
    targetEndDate: Date | null;
    businessValueScore: number | null;
    strategicAlignment: number | null;
    urgencyScore: number | null;
    estimatedCost: Prisma.Decimal | null;
    estimatedGain: Prisma.Decimal | null;
    riskLevel: Project['riskLevel'];
    copilRecommendation: ProjectCopilRecommendation;
    businessProblem: string | null;
    businessBenefits: string | null;
    businessSuccessKpis: string[] | null;
    swotStrengths: string[] | null;
    swotWeaknesses: string[] | null;
    swotOpportunities: string[] | null;
    swotThreats: string[] | null;
    towsActions: TowsActionsShape | null;
  } {
    const businessValueScore =
      dto.businessValueScore !== undefined
        ? dto.businessValueScore
        : project.businessValueScore;
    const strategicAlignment =
      dto.strategicAlignment !== undefined
        ? dto.strategicAlignment
        : project.strategicAlignment;
    const urgencyScore =
      dto.urgencyScore !== undefined ? dto.urgencyScore : project.urgencyScore;
    const estimatedCost =
      dto.estimatedCost !== undefined
        ? new Prisma.Decimal(dto.estimatedCost)
        : project.estimatedCost;
    const estimatedGain =
      dto.estimatedGain !== undefined
        ? new Prisma.Decimal(dto.estimatedGain)
        : project.estimatedGain;
    const riskLevel =
      dto.riskLevel !== undefined ? dto.riskLevel : project.riskLevel;
    const copilRecommendation =
      dto.copilRecommendation !== undefined
        ? dto.copilRecommendation
        : project.copilRecommendation;

    const name =
      dto.name !== undefined
        ? dto.name.trim() || project.name
        : project.name;

    const cadreLocation =
      dto.cadreLocation !== undefined
        ? dto.cadreLocation == null || dto.cadreLocation.trim() === ''
          ? null
          : dto.cadreLocation.trim()
        : project.cadreLocation;

    const cadreQui =
      dto.cadreQui !== undefined
        ? dto.cadreQui == null || dto.cadreQui.trim() === ''
          ? null
          : dto.cadreQui.trim()
        : project.cadreQui;

    const startDate =
      dto.startDate !== undefined
        ? dto.startDate
          ? new Date(dto.startDate)
          : null
        : project.startDate;

    const targetEndDate =
      dto.targetEndDate !== undefined
        ? dto.targetEndDate
          ? new Date(dto.targetEndDate)
          : null
        : project.targetEndDate;

    const description =
      dto.description !== undefined
        ? dto.description === '' || dto.description.trim() === ''
          ? null
          : dto.description.trim()
        : project.description;

    const businessProblem =
      dto.businessProblem !== undefined
        ? dto.businessProblem ?? null
        : project.businessProblem;
    const businessBenefits =
      dto.businessBenefits !== undefined
        ? dto.businessBenefits ?? null
        : project.businessBenefits;
    const businessSuccessKpis =
      dto.businessSuccessKpis !== undefined
        ? dto.businessSuccessKpis.length > 0
          ? dto.businessSuccessKpis
          : null
        : parseJsonStringArray(project.businessSuccessKpis);

    const swotStrengths =
      dto.swotStrengths !== undefined
        ? dto.swotStrengths.length > 0
          ? dto.swotStrengths
          : null
        : parseJsonStringArray(project.swotStrengths);
    const swotWeaknesses =
      dto.swotWeaknesses !== undefined
        ? dto.swotWeaknesses.length > 0
          ? dto.swotWeaknesses
          : null
        : parseJsonStringArray(project.swotWeaknesses);
    const swotOpportunities =
      dto.swotOpportunities !== undefined
        ? dto.swotOpportunities.length > 0
          ? dto.swotOpportunities
          : null
        : parseJsonStringArray(project.swotOpportunities);
    const swotThreats =
      dto.swotThreats !== undefined
        ? dto.swotThreats.length > 0
          ? dto.swotThreats
          : null
        : parseJsonStringArray(project.swotThreats);

    const towsActions = this.mergeTows(project, dto);

    return {
      name,
      description,
      cadreLocation,
      cadreQui,
      startDate,
      targetEndDate,
      businessValueScore,
      strategicAlignment,
      urgencyScore,
      estimatedCost,
      estimatedGain,
      riskLevel,
      copilRecommendation,
      businessProblem,
      businessBenefits,
      businessSuccessKpis,
      swotStrengths,
      swotWeaknesses,
      swotOpportunities,
      swotThreats,
      towsActions,
    };
  }

  private mergeTows(
    project: Project,
    dto: UpdateProjectSheetDto,
  ): TowsActionsShape | null {
    if (dto.towsActions === undefined) {
      return parseTowsActions(project.towsActions) ?? null;
    }
    const cur = parseTowsActions(project.towsActions) ?? emptyTows();
    const p = dto.towsActions;
    return {
      SO: p.SO !== undefined ? p.SO : cur.SO,
      ST: p.ST !== undefined ? p.ST : cur.ST,
      WO: p.WO !== undefined ? p.WO : cur.WO,
      WT: p.WT !== undefined ? p.WT : cur.WT,
    };
  }
}
