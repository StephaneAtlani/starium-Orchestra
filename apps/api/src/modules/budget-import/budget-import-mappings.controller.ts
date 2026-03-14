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
import { BudgetImportMappingsService } from './budget-import-mappings.service';
import { CreateBudgetImportMappingDto } from './dto/create-mapping.dto';
import { UpdateBudgetImportMappingDto } from './dto/update-mapping.dto';
import { ListBudgetImportMappingsQueryDto } from './dto/list-mappings.query.dto';

@Controller('budget-import-mappings')
@UseGuards(JwtAuthGuard, ActiveClientGuard, ModuleAccessGuard, PermissionsGuard)
export class BudgetImportMappingsController {
  constructor(private readonly service: BudgetImportMappingsService) {}

  @Get()
  @RequirePermissions('budgets.read')
  list(
    @ActiveClientId() clientId: string | undefined,
    @Query() query: ListBudgetImportMappingsQueryDto,
  ) {
    return this.service.list(clientId!, query);
  }

  @Get(':id')
  @RequirePermissions('budgets.read')
  getById(
    @ActiveClientId() clientId: string | undefined,
    @Param('id') id: string,
  ) {
    return this.service.getById(clientId!, id);
  }

  @Post()
  @RequirePermissions('budgets.update')
  create(
    @ActiveClientId() clientId: string | undefined,
    @Body() dto: CreateBudgetImportMappingDto,
    @RequestUserId() userId: string | undefined,
  ) {
    return this.service.create(clientId!, dto, userId);
  }

  @Patch(':id')
  @RequirePermissions('budgets.update')
  update(
    @ActiveClientId() clientId: string | undefined,
    @Param('id') id: string,
    @Body() dto: UpdateBudgetImportMappingDto,
    @RequestUserId() userId: string | undefined,
  ) {
    return this.service.update(clientId!, id, dto, userId);
  }

  @Delete(':id')
  @RequirePermissions('budgets.update')
  delete(
    @ActiveClientId() clientId: string | undefined,
    @Param('id') id: string,
    @RequestUserId() userId: string | undefined,
  ) {
    return this.service.delete(clientId!, id, userId);
  }
}
