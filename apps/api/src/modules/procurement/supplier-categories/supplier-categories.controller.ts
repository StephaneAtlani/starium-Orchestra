import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ActiveClientId } from '../../../common/decorators/active-client.decorator';
import { RequestMeta } from '../../../common/decorators/request-meta.decorator';
import { RequestUserId } from '../../../common/decorators/request-user.decorator';
import { RequirePermissions } from '../../../common/decorators/require-permissions.decorator';
import { ActiveClientGuard } from '../../../common/guards/active-client.guard';
import { ModuleAccessGuard } from '../../../common/guards/module-access.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CreateSupplierCategoryDto } from './dto/create-supplier-category.dto';
import { ListSupplierCategoriesQueryDto } from './dto/list-supplier-categories.query.dto';
import { UpdateSupplierCategoryDto } from './dto/update-supplier-category.dto';
import { SupplierCategoriesService } from './supplier-categories.service';

@Controller('supplier-categories')
@UseGuards(JwtAuthGuard, ActiveClientGuard, ModuleAccessGuard, PermissionsGuard)
export class SupplierCategoriesController {
  constructor(
    private readonly supplierCategoriesService: SupplierCategoriesService,
  ) {}

  @Get()
  @RequirePermissions('procurement.read')
  list(
    @ActiveClientId() clientId: string | undefined,
    @Query() query: ListSupplierCategoriesQueryDto,
  ) {
    return this.supplierCategoriesService.list(clientId!, query);
  }

  @Get(':id')
  @RequirePermissions('procurement.read')
  getById(
    @ActiveClientId() clientId: string | undefined,
    @Param('id') id: string,
  ) {
    return this.supplierCategoriesService.getById(clientId!, id);
  }

  @Post()
  @RequirePermissions('procurement.create')
  create(
    @ActiveClientId() clientId: string | undefined,
    @Body() dto: CreateSupplierCategoryDto,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta() meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    return this.supplierCategoriesService.create(clientId!, dto, {
      actorUserId,
      meta,
    });
  }

  @Patch(':id')
  @RequirePermissions('procurement.update')
  update(
    @ActiveClientId() clientId: string | undefined,
    @Param('id') id: string,
    @Body() dto: UpdateSupplierCategoryDto,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta() meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    return this.supplierCategoriesService.update(clientId!, id, dto, {
      actorUserId,
      meta,
    });
  }

  @Post(':id/deactivate')
  @RequirePermissions('procurement.update')
  deactivate(
    @ActiveClientId() clientId: string | undefined,
    @Param('id') id: string,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta() meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    return this.supplierCategoriesService.deactivate(clientId!, id, {
      actorUserId,
      meta,
    });
  }
}
