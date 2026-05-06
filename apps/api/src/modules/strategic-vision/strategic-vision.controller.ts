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
import { StrategicVisionAlertsResponseDto } from './dto/strategic-vision-alerts-response.dto';
import { StrategicVisionKpisByDirectionResponseDto } from './dto/strategic-vision-kpis-by-direction-response.dto';
import { StrategicVisionKpisResponseDto } from './dto/strategic-vision-kpis-response.dto';
import { UpdateStrategicDirectionDto } from './dto/update-strategic-direction.dto';
import { UpdateStrategicAxisDto } from './dto/update-strategic-axis.dto';
import { UpdateStrategicObjectiveDto } from './dto/update-strategic-objective.dto';
import { UpdateStrategicVisionDto } from './dto/update-strategic-vision.dto';
import { StrategicVisionService } from './strategic-vision.service';

@UseGuards(JwtAuthGuard, ActiveClientGuard, ModuleAccessGuard, PermissionsGuard)
@Controller()
export class StrategicVisionController {
  constructor(private readonly service: StrategicVisionService) {}

  @Get('strategic-vision')
  @RequirePermissions('strategic_vision.read')
  listVisions(@ActiveClientId() clientId: string | undefined) {
    return this.service.listVisions(clientId!);
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
    @RequestMeta() meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    return this.service.createVision(clientId!, dto, { actorUserId, meta });
  }

  @Patch('strategic-vision/:id')
  @RequirePermissions('strategic_vision.update')
  updateVision(
    @ActiveClientId() clientId: string | undefined,
    @Param('id') id: string,
    @Body() dto: UpdateStrategicVisionDto,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta() meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    return this.service.updateVision(clientId!, id, dto, { actorUserId, meta });
  }

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
    @RequestMeta() meta: { ipAddress?: string; userAgent?: string; requestId?: string },
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
    @RequestMeta() meta: { ipAddress?: string; userAgent?: string; requestId?: string },
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
    @RequestMeta() meta: { ipAddress?: string; userAgent?: string; requestId?: string },
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
    @RequestMeta() meta: { ipAddress?: string; userAgent?: string; requestId?: string },
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
    @RequestMeta() meta: { ipAddress?: string; userAgent?: string; requestId?: string },
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
    @RequestMeta() meta: { ipAddress?: string; userAgent?: string; requestId?: string },
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
    @RequestMeta() meta: { ipAddress?: string; userAgent?: string; requestId?: string },
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
    @RequestMeta() meta: { ipAddress?: string; userAgent?: string; requestId?: string },
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
    @RequestMeta() meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    return this.service.removeObjectiveLink(clientId!, objectiveId, linkId, {
      actorUserId,
      meta,
    });
  }
}
