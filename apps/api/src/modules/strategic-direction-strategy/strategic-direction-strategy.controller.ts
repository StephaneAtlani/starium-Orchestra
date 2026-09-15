import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ActiveClientId } from '../../common/decorators/active-client.decorator';
import { RequireAnyPermissions } from '../../common/decorators/require-any-permissions.decorator';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { RequestMeta } from '../../common/decorators/request-meta.decorator';
import { RequestUserId } from '../../common/decorators/request-user.decorator';
import { ActiveClientGuard } from '../../common/guards/active-client.guard';
import { ModuleAccessGuard } from '../../common/guards/module-access.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ArchiveStrategicDirectionStrategyDto } from './dto/archive-strategic-direction-strategy.dto';
import { CreateStrategicDirectionStrategyDto } from './dto/create-strategic-direction-strategy.dto';
import { ListStrategicDirectionStrategiesQueryDto } from './dto/list-strategic-direction-strategies-query.dto';
import { ReviewStrategicDirectionStrategyDto } from './dto/review-strategic-direction-strategy.dto';
import { SubmitStrategicDirectionStrategyDto } from './dto/submit-strategic-direction-strategy.dto';
import { ReplaceStrategicDirectionStrategyAxesDto } from './dto/replace-strategic-direction-strategy-axes.dto';
import { ReplaceStrategicDirectionStrategyObjectivesDto } from './dto/replace-strategic-direction-strategy-objectives.dto';
import {
  StrategicDirectionStrategyConsolidationQueryDto,
  StrategicDirectionStrategyPortfolioQueryDto,
} from './dto/strategy-schema-query.dto';
import { UpdateStrategicDirectionStrategyDto } from './dto/update-strategic-direction-strategy.dto';
import { StrategicDirectionStrategyService } from './strategic-direction-strategy.service';

@UseGuards(JwtAuthGuard, ActiveClientGuard, ModuleAccessGuard, PermissionsGuard)
@Controller('strategic-direction-strategies')
export class StrategicDirectionStrategyController {
  constructor(private readonly service: StrategicDirectionStrategyService) {}

  @Get('validator-options')
  @RequireAnyPermissions(
    'strategic_direction_strategy.update',
    'strategic_direction_strategy.read',
  )
  validatorOptions(
    @ActiveClientId() clientId: string | undefined,
    @RequestUserId() actorUserId: string | undefined,
  ) {
    return this.service.validatorOptions(clientId!, actorUserId!);
  }

  @Get('portfolio')
  @RequirePermissions('strategic_direction_strategy.read')
  getPortfolio(
    @ActiveClientId() clientId: string | undefined,
    @Query() query: StrategicDirectionStrategyPortfolioQueryDto,
    @RequestUserId() actorUserId: string | undefined,
  ) {
    return this.service.getPortfolio(clientId!, query, actorUserId);
  }

  @Get('consolidation')
  @RequirePermissions('strategic_direction_strategy.read')
  getConsolidation(
    @ActiveClientId() clientId: string | undefined,
    @Query() query: StrategicDirectionStrategyConsolidationQueryDto,
  ) {
    return this.service.getConsolidation(clientId!, query);
  }

  @Get()
  @RequirePermissions('strategic_direction_strategy.read')
  list(
    @ActiveClientId() clientId: string | undefined,
    @Query() query: ListStrategicDirectionStrategiesQueryDto,
  ) {
    return this.service.list(clientId!, query);
  }

  @Post()
  @RequireAnyPermissions(
    'strategic_direction_strategy.create',
    'strategic_direction_strategy.read',
  )
  create(
    @ActiveClientId() clientId: string | undefined,
    @Body() dto: CreateStrategicDirectionStrategyDto,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta() meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    return this.service.create(clientId!, dto, { actorUserId, meta });
  }

  @Get(':id/links')
  @RequirePermissions('strategic_direction_strategy.read')
  getLinks(@ActiveClientId() clientId: string | undefined, @Param('id') id: string) {
    return this.service.getLinks(clientId!, id);
  }

  @Get(':id/schema-metrics')
  @RequirePermissions('strategic_direction_strategy.read')
  getSchemaMetrics(@ActiveClientId() clientId: string | undefined, @Param('id') id: string) {
    return this.service.getSchemaMetrics(clientId!, id);
  }

  @Put(':id/axes')
  @RequireAnyPermissions(
    'strategic_direction_strategy.update',
    'strategic_direction_strategy.read',
  )
  replaceAxes(
    @ActiveClientId() clientId: string | undefined,
    @Param('id') id: string,
    @Body() dto: ReplaceStrategicDirectionStrategyAxesDto,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta() meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    return this.service.replaceStrategyAxes(clientId!, id, dto.strategicAxisIds, {
      actorUserId,
      meta,
    });
  }

  @Put(':id/objectives')
  @RequireAnyPermissions(
    'strategic_direction_strategy.update',
    'strategic_direction_strategy.read',
  )
  replaceObjectives(
    @ActiveClientId() clientId: string | undefined,
    @Param('id') id: string,
    @Body() dto: ReplaceStrategicDirectionStrategyObjectivesDto,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta() meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    return this.service.replaceStrategyObjectives(clientId!, id, dto.strategicObjectiveIds, {
      actorUserId,
      meta,
    });
  }

  @Get(':id/versions')
  @RequirePermissions('strategic_direction_strategy.read')
  listVersions(@ActiveClientId() clientId: string | undefined, @Param('id') id: string) {
    return this.service.listVersions(clientId!, id);
  }

  @Get(':id/compare/:otherId')
  @RequirePermissions('strategic_direction_strategy.read')
  compareVersions(
    @ActiveClientId() clientId: string | undefined,
    @Param('id') id: string,
    @Param('otherId') otherId: string,
  ) {
    return this.service.compareVersions(clientId!, id, otherId);
  }

  @Get(':id')
  @RequirePermissions('strategic_direction_strategy.read')
  getById(
    @ActiveClientId() clientId: string | undefined,
    @Param('id') id: string,
    @RequestUserId() actorUserId: string | undefined,
  ) {
    return this.service.getById(clientId!, id, actorUserId);
  }

  @Patch(':id')
  @RequireAnyPermissions(
    'strategic_direction_strategy.update',
    'strategic_direction_strategy.read',
  )
  update(
    @ActiveClientId() clientId: string | undefined,
    @Param('id') id: string,
    @Body() dto: UpdateStrategicDirectionStrategyDto,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta() meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    return this.service.update(clientId!, id, dto, { actorUserId, meta });
  }

  @Post(':id/submit')
  @RequireAnyPermissions(
    'strategic_direction_strategy.update',
    'strategic_direction_strategy.read',
  )
  submit(
    @ActiveClientId() clientId: string | undefined,
    @Param('id') id: string,
    @Body() dto: SubmitStrategicDirectionStrategyDto,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta() meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    return this.service.submit(clientId!, id, dto, { actorUserId, meta });
  }

  @Post(':id/archive')
  @RequireAnyPermissions(
    'strategic_direction_strategy.update',
    'strategic_direction_strategy.read',
  )
  archive(
    @ActiveClientId() clientId: string | undefined,
    @Param('id') id: string,
    @Body() dto: ArchiveStrategicDirectionStrategyDto,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta() meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    return this.service.archive(clientId!, id, dto, { actorUserId, meta });
  }

  @Post(':id/review')
  @RequirePermissions('strategic_direction_strategy.review')
  review(
    @ActiveClientId() clientId: string | undefined,
    @Param('id') id: string,
    @Body() dto: ReviewStrategicDirectionStrategyDto,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta() meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    return this.service.review(clientId!, id, dto, { actorUserId, meta });
  }
}
