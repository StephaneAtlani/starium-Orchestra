import { Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ActiveClientId } from '../../common/decorators/active-client.decorator';
import { RequestUserId } from '../../common/decorators/request-user.decorator';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { ActiveClientGuard } from '../../common/guards/active-client.guard';
import { ModuleAccessGuard } from '../../common/guards/module-access.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ResourceTimesheetMonthsService } from './resource-timesheet-months.service';

/**
 * Fiches temps mensuelles : validation collaborateur, déverrouillage manager.
 */
@Controller('resource-timesheet-months')
@UseGuards(
  JwtAuthGuard,
  ActiveClientGuard,
  ModuleAccessGuard,
  PermissionsGuard,
)
export class ResourceTimesheetMonthsController {
  constructor(private readonly months: ResourceTimesheetMonthsService) {}

  @Get(':resourceId/:yearMonth')
  @RequirePermissions('resources.read')
  getMonth(
    @ActiveClientId() clientId: string | undefined,
    @Param('resourceId') resourceId: string,
    @Param('yearMonth') yearMonth: string,
    @RequestUserId() userId: string | undefined,
  ) {
    return this.months.getMonth(clientId!, resourceId, yearMonth, userId);
  }

  @Post(':resourceId/:yearMonth/submit')
  @RequirePermissions('resources.update')
  submitMonth(
    @ActiveClientId() clientId: string | undefined,
    @Param('resourceId') resourceId: string,
    @Param('yearMonth') yearMonth: string,
    @RequestUserId() userId: string | undefined,
  ) {
    return this.months.submitMonth(clientId!, resourceId, yearMonth, userId!);
  }

  /** Déverrouillage : manager hiérarchique (collaborateur) ou administrateur client. */
  @Post(':resourceId/:yearMonth/unlock')
  @RequirePermissions('collaborators.read')
  unlockMonth(
    @ActiveClientId() clientId: string | undefined,
    @Param('resourceId') resourceId: string,
    @Param('yearMonth') yearMonth: string,
    @RequestUserId() userId: string | undefined,
  ) {
    return this.months.unlockMonth(clientId!, resourceId, yearMonth, userId!);
  }
}
