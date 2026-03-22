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
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ActiveClientGuard } from '../../../common/guards/active-client.guard';
import { ModuleAccessGuard } from '../../../common/guards/module-access.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { RequirePermissions } from '../../../common/decorators/require-permissions.decorator';
import { ActiveClientId } from '../../../common/decorators/active-client.decorator';
import { RequestMeta } from '../../../common/decorators/request-meta.decorator';
import { RequestUserId } from '../../../common/decorators/request-user.decorator';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { ListSuppliersQueryDto } from './dto/list-suppliers.query.dto';
import { QuickCreateSupplierDto } from './dto/quick-create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { SuppliersService } from './suppliers.service';

@Controller('suppliers')
@UseGuards(JwtAuthGuard, ActiveClientGuard, ModuleAccessGuard, PermissionsGuard)
export class SuppliersController {
  constructor(private readonly suppliers: SuppliersService) {}

  @Get()
  @RequirePermissions('procurement.read')
  list(
    @ActiveClientId() clientId: string | undefined,
    @Query() query: ListSuppliersQueryDto,
  ) {
    return this.suppliers.list(clientId!, query);
  }

  @Post()
  @RequirePermissions('procurement.create')
  create(
    @ActiveClientId() clientId: string | undefined,
    @Body() dto: CreateSupplierDto,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta() meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    return this.suppliers.create(clientId!, dto, { actorUserId, meta });
  }

  @Post('quick-create')
  @RequirePermissions('procurement.create')
  quickCreate(
    @ActiveClientId() clientId: string | undefined,
    @Body() dto: QuickCreateSupplierDto,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta() meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    return this.suppliers.quickCreate(clientId!, dto, { actorUserId, meta });
  }

  @Patch(':id')
  @RequirePermissions('procurement.update')
  update(
    @ActiveClientId() clientId: string | undefined,
    @Param('id') id: string,
    @Body() dto: UpdateSupplierDto,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta() meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    return this.suppliers.update(clientId!, id, dto, { actorUserId, meta });
  }

  @Delete(':id')
  @RequirePermissions('procurement.update')
  archive(
    @ActiveClientId() clientId: string | undefined,
    @Param('id') id: string,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta() meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    return this.suppliers.archive(clientId!, id, { actorUserId, meta });
  }
}

