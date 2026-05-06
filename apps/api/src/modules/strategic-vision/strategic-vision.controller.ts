import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { RequireAnyPermissions } from '../../common/decorators/require-any-permissions.decorator';
import { ActiveClientId } from '../../common/decorators/active-client.decorator';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { RequestMeta } from '../../common/decorators/request-meta.decorator';
import { RequestUserId } from '../../common/decorators/request-user.decorator';
import { ActiveClientGuard } from '../../common/guards/active-client.guard';
import { ModuleAccessGuard } from '../../common/guards/module-access.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateStrategicAxisDto } from './dto/create-strategic-axis.dto';
import { CreateStrategicDirectionDto } from './dto/create-strategic-direction.dto';
import { CreateStrategicLinkDto } from './dto/create-strategic-link.dto';
import { CreateStrategicObjectiveDto } from './dto/create-strategic-objective.dto';
import { CreateStrategicVisionDto } from './dto/create-strategic-vision.dto';
import { ListStrategicDirectionsQueryDto } from './dto/list-strategic-directions-query.dto';
import { ListStrategicVisionQueryDto } from './dto/list-strategic-vision-query.dto';
import { StrategicVisionAlertsResponseDto } from './dto/strategic-vision-alerts-response.dto';
import { StrategicVisionKpisByDirectionResponseDto } from './dto/strategic-vision-kpis-by-direction-response.dto';
import { StrategicVisionKpisResponseDto } from './dto/strategic-vision-kpis-response.dto';
import { UpdateStrategicDirectionDto } from './dto/update-strategic-direction.dto';
import { UpdateStrategicAxisDto } from './dto/update-strategic-axis.dto';
import { UpdateStrategicLinkDto } from './dto/update-strategic-link.dto';
import { UpdateStrategicObjectiveDto } from './dto/update-strategic-objective.dto';
import { UpdateStrategicVisionDto } from './dto/update-strategic-vision.dto';
import { StrategicVisionService } from './strategic-vision.service';

type AuditMeta = { ipAddress?: string; userAgent?: string; requestId?: string };

/**
 * RFC-STRAT-007 — Ordre des routes :
 *  - les routes spécifiques (`strategic-vision/kpis`, `strategic-vision/alerts`,
 *    `strategic-vision/axes/...`, `strategic-vision/objectives/...`,
 *    `strategic-vision/:visionId/axes/...`) sont déclarées AVANT les routes
 *    génériques `strategic-vision/:id` pour éviter que `axes` / `objectives`
 *    soient capturés comme `:id`.
 */
@UseGuards(JwtAuthGuard, ActiveClientGuard, ModuleAccessGuard, PermissionsGuard)
@Controller()
export class StrategicVisionController {
  constructor(private readonly service: StrategicVisionService) {}

  // ---------------------------------------------------------------------
  // Listings & KPIs
  // ---------------------------------------------------------------------

  @Get('strategic-vision')
  @RequirePermissions('strategic_vision.read')
  listVisions(
    @ActiveClientId() clientId: string | undefined,
    @Query() query: ListStrategicVisionQueryDto,
  ) {
    return this.service.listVisions(clientId!, query);
  }

  @Get('strategic-vision/kpis')
  @RequirePermissions('strategic_vision.read')
  getKpis(
    @ActiveClientId() clientId: string | undefined,
  ): Promise<StrategicVisionKpisResponseDto> {
    return this.service.getKpis(clientId!);
  }

  @Get('strategic-vision/alerts')
  @RequirePermissions('strategic_vision.read')
  getAlerts(
    @ActiveClientId() clientId: string | undefined,
    @Query('directionId') directionId?: string,
    @Query('unassigned') unassigned?: string,
  ): Promise<StrategicVisionAlertsResponseDto> {
    return this.service.getAlerts(clientId!, {
      directionId,
      unassigned: unassigned === 'true',
    });
  }

  @Get('strategic-vision/kpis/by-direction')
  @RequirePermissions('strategic_vision.read')
  getKpisByDirection(
    @ActiveClientId() clientId: string | undefined,
  ): Promise<StrategicVisionKpisByDirectionResponseDto> {
    return this.service.getKpisByDirection(clientId!);
  }

  @Post('strategic-vision')
  @RequirePermissions('strategic_vision.create')
  createVision(
    @ActiveClientId() clientId: string | undefined,
    @Body() dto: CreateStrategicVisionDto,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta() meta: AuditMeta,
  ) {
    return this.service.createVision(clientId!, dto, { actorUserId, meta });
  }

  // ---------------------------------------------------------------------
  // Routes nested spécifiques (toujours déclarées AVANT `strategic-vision/:id`)
  // ---------------------------------------------------------------------

  // ===== Objectives nested under axes =====
  @Get('strategic-vision/axes/:axisId/objectives')
  @RequirePermissions('strategic_vision.read')
  listObjectivesByAxis(
    @ActiveClientId() clientId: string | undefined,
    @Param('axisId') axisId: string,
  ) {
    return this.service.listObjectivesByAxis(clientId!, axisId);
  }

  @Post('strategic-vision/axes/:axisId/objectives')
  @RequirePermissions('strategic_vision.create')
  createObjectiveNested(
    @ActiveClientId() clientId: string | undefined,
    @Param('axisId') axisId: string,
    @Body() dto: CreateStrategicObjectiveDto,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta() meta: AuditMeta,
  ) {
    return this.service.createObjective(
      clientId!,
      { ...dto, axisId },
      { actorUserId, meta },
    );
  }

  // ===== Single objective routes (specific objects path) =====
  @Get('strategic-vision/objectives/:objectiveId/links')
  @RequirePermissions('strategic_vision.read')
  listObjectiveLinks(
    @ActiveClientId() clientId: string | undefined,
    @Param('objectiveId') objectiveId: string,
  ) {
    return this.service.listObjectiveLinks(clientId!, objectiveId);
  }

  @Post('strategic-vision/objectives/:objectiveId/links')
  @RequirePermissions('strategic_vision.manage_links')
  addObjectiveLinkNested(
    @ActiveClientId() clientId: string | undefined,
    @Param('objectiveId') objectiveId: string,
    @Body() dto: CreateStrategicLinkDto,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta() meta: AuditMeta,
  ) {
    return this.service.addObjectiveLink(clientId!, objectiveId, dto, {
      actorUserId,
      meta,
    });
  }

  @Patch('strategic-vision/objectives/:objectiveId/links/:linkId')
  @RequirePermissions('strategic_vision.manage_links')
  updateObjectiveLinkNested(
    @ActiveClientId() clientId: string | undefined,
    @Param('objectiveId') objectiveId: string,
    @Param('linkId') linkId: string,
    @Body() dto: UpdateStrategicLinkDto,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta() meta: AuditMeta,
  ) {
    return this.service.updateObjectiveLink(
      clientId!,
      objectiveId,
      linkId,
      dto,
      { actorUserId, meta },
    );
  }

  @Delete('strategic-vision/objectives/:objectiveId/links/:linkId')
  @RequirePermissions('strategic_vision.manage_links')
  removeObjectiveLinkNested(
    @ActiveClientId() clientId: string | undefined,
    @Param('objectiveId') objectiveId: string,
    @Param('linkId') linkId: string,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta() meta: AuditMeta,
  ) {
    return this.service.removeObjectiveLink(clientId!, objectiveId, linkId, {
      actorUserId,
      meta,
    });
  }

  @Get('strategic-vision/objectives/:objectiveId')
  @RequirePermissions('strategic_vision.read')
  getObjectiveNested(
    @ActiveClientId() clientId: string | undefined,
    @Param('objectiveId') objectiveId: string,
  ) {
    return this.service.getObjectiveById(clientId!, objectiveId);
  }

  @Patch('strategic-vision/objectives/:objectiveId')
  @RequirePermissions('strategic_vision.update')
  updateObjectiveNested(
    @ActiveClientId() clientId: string | undefined,
    @Param('objectiveId') objectiveId: string,
    @Body() dto: UpdateStrategicObjectiveDto,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta() meta: AuditMeta,
  ) {
    return this.service.updateObjective(clientId!, objectiveId, dto, {
      actorUserId,
      meta,
    });
  }

  @Delete('strategic-vision/objectives/:objectiveId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions('strategic_vision.delete')
  archiveObjectiveNested(
    @ActiveClientId() clientId: string | undefined,
    @Param('objectiveId') objectiveId: string,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta() meta: AuditMeta,
  ) {
    return this.service.archiveObjective(clientId!, objectiveId, {
      actorUserId,
      meta,
    });
  }

  // ===== Axes nested under vision =====
  @Get('strategic-vision/:visionId/axes')
  @RequirePermissions('strategic_vision.read')
  listAxesByVision(
    @ActiveClientId() clientId: string | undefined,
    @Param('visionId') visionId: string,
  ) {
    return this.service.listAxesByVision(clientId!, visionId);
  }

  @Post('strategic-vision/:visionId/axes')
  @RequirePermissions('strategic_vision.create')
  createAxisNested(
    @ActiveClientId() clientId: string | undefined,
    @Param('visionId') visionId: string,
    @Body() dto: CreateStrategicAxisDto,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta() meta: AuditMeta,
  ) {
    return this.service.createAxis(
      clientId!,
      { ...dto, visionId },
      { actorUserId, meta },
    );
  }

  @Get('strategic-vision/:visionId/axes/:axisId')
  @RequirePermissions('strategic_vision.read')
  getAxisNested(
    @ActiveClientId() clientId: string | undefined,
    @Param('visionId') visionId: string,
    @Param('axisId') axisId: string,
  ) {
    return this.service.getAxisById(clientId!, visionId, axisId);
  }

  @Patch('strategic-vision/:visionId/axes/:axisId')
  @RequirePermissions('strategic_vision.update')
  updateAxisNested(
    @ActiveClientId() clientId: string | undefined,
    @Param('visionId') visionId: string,
    @Param('axisId') axisId: string,
    @Body() dto: UpdateStrategicAxisDto,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta() meta: AuditMeta,
  ) {
    return this.service.updateAxis(
      clientId!,
      axisId,
      dto,
      { actorUserId, meta },
      { visionId },
    );
  }

  @Delete('strategic-vision/:visionId/axes/:axisId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions('strategic_vision.delete')
  archiveAxisNested(
    @ActiveClientId() clientId: string | undefined,
    @Param('visionId') visionId: string,
    @Param('axisId') axisId: string,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta() meta: AuditMeta,
  ) {
    return this.service.archiveAxis(clientId!, visionId, axisId, {
      actorUserId,
      meta,
    });
  }

  // ---------------------------------------------------------------------
  // Routes génériques `strategic-vision/:id` — déclarées EN DERNIER pour ne pas
  // capturer `axes`, `objectives` ou `kpis` comme `:id`.
  // ---------------------------------------------------------------------

  @Get('strategic-vision/:id')
  @RequirePermissions('strategic_vision.read')
  getVision(
    @ActiveClientId() clientId: string | undefined,
    @Param('id') id: string,
  ) {
    return this.service.getVisionById(clientId!, id);
  }

  @Patch('strategic-vision/:id')
  @RequirePermissions('strategic_vision.update')
  updateVision(
    @ActiveClientId() clientId: string | undefined,
    @Param('id') id: string,
    @Body() dto: UpdateStrategicVisionDto,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta() meta: AuditMeta,
  ) {
    return this.service.updateVision(clientId!, id, dto, { actorUserId, meta });
  }

  @Delete('strategic-vision/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions('strategic_vision.delete')
  archiveVision(
    @ActiveClientId() clientId: string | undefined,
    @Param('id') id: string,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta() meta: AuditMeta,
  ) {
    return this.service.archiveVision(clientId!, id, { actorUserId, meta });
  }

  // ---------------------------------------------------------------------
  // Routes plates legacy (compat frontend existant — non touché par RFC-STRAT-007).
  // ---------------------------------------------------------------------

  @Get('strategic-axes')
  @RequirePermissions('strategic_vision.read')
  listAxes(@ActiveClientId() clientId: string | undefined) {
    return this.service.listAxes(clientId!);
  }

  @Post('strategic-axes')
  @RequirePermissions('strategic_vision.create')
  createAxis(
    @ActiveClientId() clientId: string | undefined,
    @Body() dto: CreateStrategicAxisDto,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta() meta: AuditMeta,
  ) {
    return this.service.createAxis(clientId!, dto, { actorUserId, meta });
  }

  @Patch('strategic-axes/:id')
  @RequirePermissions('strategic_vision.update')
  updateAxis(
    @ActiveClientId() clientId: string | undefined,
    @Param('id') axisId: string,
    @Body() dto: UpdateStrategicAxisDto,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta() meta: AuditMeta,
  ) {
    return this.service.updateAxis(clientId!, axisId, dto, { actorUserId, meta });
  }

  @Get('strategic-directions')
  @RequirePermissions('strategic_vision.read')
  listDirections(
    @ActiveClientId() clientId: string | undefined,
    @Query() query: ListStrategicDirectionsQueryDto,
  ) {
    return this.service.listDirections(clientId!, query);
  }

  @Post('strategic-directions')
  @RequireAnyPermissions(
    'strategic_vision.update',
    'strategic_vision.manage_directions',
  )
  createDirection(
    @ActiveClientId() clientId: string | undefined,
    @Body() dto: CreateStrategicDirectionDto,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta() meta: AuditMeta,
  ) {
    return this.service.createDirection(clientId!, dto, { actorUserId, meta });
  }

  @Patch('strategic-directions/:id')
  @RequireAnyPermissions(
    'strategic_vision.update',
    'strategic_vision.manage_directions',
  )
  updateDirection(
    @ActiveClientId() clientId: string | undefined,
    @Param('id') directionId: string,
    @Body() dto: UpdateStrategicDirectionDto,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta() meta: AuditMeta,
  ) {
    return this.service.updateDirection(clientId!, directionId, dto, {
      actorUserId,
      meta,
    });
  }

  @Delete('strategic-directions/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequireAnyPermissions(
    'strategic_vision.update',
    'strategic_vision.manage_directions',
  )
  deleteDirection(
    @ActiveClientId() clientId: string | undefined,
    @Param('id') directionId: string,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta() meta: AuditMeta,
  ) {
    return this.service.deleteDirection(clientId!, directionId, { actorUserId, meta });
  }

  @Get('strategic-objectives')
  @RequirePermissions('strategic_vision.read')
  listObjectives(@ActiveClientId() clientId: string | undefined) {
    return this.service.listObjectives(clientId!);
  }

  @Post('strategic-objectives')
  @RequirePermissions('strategic_vision.create')
  createObjective(
    @ActiveClientId() clientId: string | undefined,
    @Body() dto: CreateStrategicObjectiveDto,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta() meta: AuditMeta,
  ) {
    return this.service.createObjective(clientId!, dto, { actorUserId, meta });
  }

  @Patch('strategic-objectives/:id')
  @RequirePermissions('strategic_vision.update')
  updateObjective(
    @ActiveClientId() clientId: string | undefined,
    @Param('id') objectiveId: string,
    @Body() dto: UpdateStrategicObjectiveDto,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta() meta: AuditMeta,
  ) {
    return this.service.updateObjective(clientId!, objectiveId, dto, {
      actorUserId,
      meta,
    });
  }

  @Post('strategic-objectives/:id/links')
  @RequirePermissions('strategic_vision.manage_links')
  addObjectiveLink(
    @ActiveClientId() clientId: string | undefined,
    @Param('id') objectiveId: string,
    @Body() dto: CreateStrategicLinkDto,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta() meta: AuditMeta,
  ) {
    return this.service.addObjectiveLink(clientId!, objectiveId, dto, {
      actorUserId,
      meta,
    });
  }

  @Delete('strategic-objectives/:id/links/:linkId')
  @RequirePermissions('strategic_vision.manage_links')
  removeObjectiveLink(
    @ActiveClientId() clientId: string | undefined,
    @Param('id') objectiveId: string,
    @Param('linkId') linkId: string,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta() meta: AuditMeta,
  ) {
    return this.service.removeObjectiveLink(clientId!, objectiveId, linkId, {
      actorUserId,
      meta,
    });
  }
}
