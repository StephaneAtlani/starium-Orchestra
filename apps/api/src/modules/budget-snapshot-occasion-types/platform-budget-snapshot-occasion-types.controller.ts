import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PlatformAdminGuard } from '../../common/guards/platform-admin.guard';
import { RequestUserId } from '../../common/decorators/request-user.decorator';
import { RequestMeta } from '../../common/decorators/request-meta.decorator';
import {
  BudgetSnapshotOccasionTypesService,
  OccasionTypeAuditContext,
} from './budget-snapshot-occasion-types.service';
import { CreateBudgetSnapshotOccasionTypeDto } from './dto/create-budget-snapshot-occasion-type.dto';
import { UpdateBudgetSnapshotOccasionTypeDto } from './dto/update-budget-snapshot-occasion-type.dto';

@Controller('platform/budget-snapshot-occasion-types')
@UseGuards(JwtAuthGuard, PlatformAdminGuard)
export class PlatformBudgetSnapshotOccasionTypesController {
  constructor(private readonly service: BudgetSnapshotOccasionTypesService) {}

  @Get()
  list() {
    return this.service.listGlobal();
  }

  @Post()
  create(
    @Body() dto: CreateBudgetSnapshotOccasionTypeDto,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta() meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    const context: OccasionTypeAuditContext = { actorUserId, meta };
    return this.service.createGlobal(dto, context);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateBudgetSnapshotOccasionTypeDto,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta() meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    const context: OccasionTypeAuditContext = { actorUserId, meta };
    return this.service.updateGlobal(id, dto, context);
  }

  @Delete(':id')
  remove(
    @Param('id') id: string,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta() meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    const context: OccasionTypeAuditContext = { actorUserId, meta };
    return this.service.softDeleteGlobal(id, context);
  }
}
