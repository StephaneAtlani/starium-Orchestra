import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
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
import { CreateActionPlanTaskDto } from './dto/create-action-plan-task.dto';
import { ListActionPlanTasksQueryDto } from './dto/list-action-plan-tasks.query.dto';
import { UpdateActionPlanTaskDto } from './dto/update-action-plan-task.dto';
import { ProjectTasksService } from './project-tasks.service';

@Controller('action-plans/:actionPlanId/tasks')
@UseGuards(JwtAuthGuard, ActiveClientGuard, ModuleAccessGuard, PermissionsGuard)
export class ActionPlanTasksController {
  constructor(private readonly tasksService: ProjectTasksService) {}

  @Get()
  @RequirePermissions('projects.read')
  list(
    @ActiveClientId() clientId: string | undefined,
    @Param('actionPlanId') actionPlanId: string,
    @Query() query: ListActionPlanTasksQueryDto,
  ) {
    return this.tasksService.listForActionPlan(clientId!, actionPlanId, query);
  }

  @Post()
  @RequirePermissions('projects.update')
  create(
    @ActiveClientId() clientId: string | undefined,
    @Param('actionPlanId') actionPlanId: string,
    @Body() dto: CreateActionPlanTaskDto,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta() meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    const context: AuditContext = { actorUserId, meta };
    return this.tasksService.createForActionPlan(
      clientId!,
      actionPlanId,
      dto,
      context,
      actorUserId,
    );
  }

  @Get(':taskId')
  @RequirePermissions('projects.read')
  getOne(
    @ActiveClientId() clientId: string | undefined,
    @Param('actionPlanId') actionPlanId: string,
    @Param('taskId') taskId: string,
  ) {
    return this.tasksService.getOneForActionPlan(clientId!, actionPlanId, taskId);
  }

  @Patch(':taskId')
  @RequirePermissions('projects.update')
  update(
    @ActiveClientId() clientId: string | undefined,
    @Param('actionPlanId') actionPlanId: string,
    @Param('taskId') taskId: string,
    @Body() dto: UpdateActionPlanTaskDto,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta() meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    const context: AuditContext = { actorUserId, meta };
    return this.tasksService.updateForActionPlan(
      clientId!,
      actionPlanId,
      taskId,
      dto,
      context,
      actorUserId,
    );
  }

  @Delete(':taskId')
  @RequirePermissions('projects.update')
  remove(
    @ActiveClientId() clientId: string | undefined,
    @Param('actionPlanId') actionPlanId: string,
    @Param('taskId') taskId: string,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta() meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    const context: AuditContext = { actorUserId, meta };
    return this.tasksService.deleteForActionPlan(clientId!, actionPlanId, taskId, context);
  }
}
