import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ActiveClientGuard } from '../../common/guards/active-client.guard';
import { ModuleAccessGuard } from '../../common/guards/module-access.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { ActiveClientId } from '../../common/decorators/active-client.decorator';
import {
  RequestMeta,
  RequestMeta as RequestMetaDecorator,
} from '../../common/decorators/request-meta.decorator';
import { ClientBudgetWorkflowSettingsService } from './client-budget-workflow-settings.service';
import { UpdateClientBudgetWorkflowSettingsDto } from './dto/update-client-budget-workflow-settings.dto';

@Controller('clients')
@UseGuards(JwtAuthGuard, ActiveClientGuard, ModuleAccessGuard, PermissionsGuard)
export class ClientBudgetWorkflowSettingsController {
  constructor(
    private readonly budgetWorkflowSettings: ClientBudgetWorkflowSettingsService,
  ) {}

  @Get('active/budget-workflow-settings')
  @RequirePermissions('budgets.read')
  getActive(@ActiveClientId() clientId: string | undefined) {
    return this.budgetWorkflowSettings.getActive(clientId!);
  }

  @Patch('active/budget-workflow-settings')
  @RequirePermissions('budgets.update')
  updateActive(
    @ActiveClientId() clientId: string | undefined,
    @Body() dto: UpdateClientBudgetWorkflowSettingsDto,
    @RequestMetaDecorator() meta: RequestMeta,
  ) {
    return this.budgetWorkflowSettings.updateActive(clientId!, dto, { meta });
  }
}
