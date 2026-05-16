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
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ActiveClientGuard } from '../../../common/guards/active-client.guard';
import { ModuleAccessGuard } from '../../../common/guards/module-access.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { RequirePermissions } from '../../../common/decorators/require-permissions.decorator';
import { RequireAccessIntent } from '../../../common/decorators/require-access-intent.decorator';
import { ActiveClientId } from '../../../common/decorators/active-client.decorator';
import { RequestMeta } from '../../../common/decorators/request-meta.decorator';
import { RequestUserId } from '../../../common/decorators/request-user.decorator';
import type { RequestWithClient } from '../../../common/types/request-with-client';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { ListSuppliersQueryDto } from './dto/list-suppliers.query.dto';
import { QuickCreateSupplierDto } from './dto/quick-create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { SuppliersService } from './suppliers.service';
import { MAX_SUPPLIER_LOGO_BYTES } from './suppliers-logo.constants';

@Controller('suppliers')
@UseGuards(JwtAuthGuard, ActiveClientGuard, ModuleAccessGuard, PermissionsGuard)
export class SuppliersController {
  constructor(private readonly suppliers: SuppliersService) {}

  @Get()
  @RequireAccessIntent({ module: 'procurement', intent: 'read' })
  list(
    @ActiveClientId() clientId: string | undefined,
    @Query() query: ListSuppliersQueryDto,
    @RequestUserId() userId: string | undefined,
    @Req() request: RequestWithClient,
  ) {
    return this.suppliers.list(clientId!, query, userId, request);
  }

  @Get('dashboard')
  @RequirePermissions('procurement.read')
  dashboard(@ActiveClientId() clientId: string | undefined) {
    return this.suppliers.getDashboardStats(clientId!);
  }

  @Get(':id')
  @RequireAccessIntent({ module: 'procurement', intent: 'read' })
  getById(
    @ActiveClientId() clientId: string | undefined,
    @Param('id') id: string,
    @RequestUserId() userId: string | undefined,
    @Req() request: RequestWithClient,
  ) {
    return this.suppliers.findById(clientId!, id, userId, request);
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
  @RequireAccessIntent({ module: 'procurement', intent: 'write' })
  update(
    @ActiveClientId() clientId: string | undefined,
    @Param('id') id: string,
    @Body() dto: UpdateSupplierDto,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta() meta: { ipAddress?: string; userAgent?: string; requestId?: string },
    @Req() request: RequestWithClient,
  ) {
    return this.suppliers.update(clientId!, id, dto, { actorUserId, meta }, request);
  }

  @Get(':id/logo')
  @RequirePermissions('procurement.read')
  getLogo(
    @ActiveClientId() clientId: string | undefined,
    @Param('id') id: string,
    @RequestUserId() userId: string | undefined,
  ) {
    return this.suppliers.getLogoFile(clientId!, id, userId);
  }

  @Post(':id/logo')
  @RequirePermissions('procurement.update')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: MAX_SUPPLIER_LOGO_BYTES } }),
  )
  uploadLogo(
    @ActiveClientId() clientId: string | undefined,
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File | undefined,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta() meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    return this.suppliers.saveLogo(clientId!, id, file, { actorUserId, meta });
  }

  @Delete(':id/logo')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('procurement.update')
  removeLogo(
    @ActiveClientId() clientId: string | undefined,
    @Param('id') id: string,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta() meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    return this.suppliers.deleteLogo(clientId!, id, { actorUserId, meta });
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

