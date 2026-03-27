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
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ActiveClientId } from '../../../common/decorators/active-client.decorator';
import { RequestMeta } from '../../../common/decorators/request-meta.decorator';
import { RequestUserId } from '../../../common/decorators/request-user.decorator';
import { RequirePermissions } from '../../../common/decorators/require-permissions.decorator';
import { ActiveClientGuard } from '../../../common/guards/active-client.guard';
import { ModuleAccessGuard } from '../../../common/guards/module-access.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CreateSupplierContactDto } from './dto/create-supplier-contact.dto';
import { ListSupplierContactsQueryDto } from './dto/list-supplier-contacts.query.dto';
import { UpdateSupplierContactDto } from './dto/update-supplier-contact.dto';
import { MAX_SUPPLIER_CONTACT_PHOTO_BYTES } from './supplier-contacts-photo.constants';
import { SupplierContactsService } from './supplier-contacts.service';

@Controller('suppliers/:supplierId/contacts')
@UseGuards(JwtAuthGuard, ActiveClientGuard, ModuleAccessGuard, PermissionsGuard)
export class SupplierContactsController {
  constructor(private readonly supplierContactsService: SupplierContactsService) {}

  @Get()
  @RequirePermissions('procurement.read')
  list(
    @ActiveClientId() clientId: string | undefined,
    @Param('supplierId') supplierId: string,
    @Query() query: ListSupplierContactsQueryDto,
  ) {
    return this.supplierContactsService.list(clientId!, supplierId, query);
  }

  @Get(':id')
  @RequirePermissions('procurement.read')
  getById(
    @ActiveClientId() clientId: string | undefined,
    @Param('supplierId') supplierId: string,
    @Param('id') id: string,
  ) {
    return this.supplierContactsService.getById(clientId!, supplierId, id);
  }

  @Post()
  @RequirePermissions('procurement.create')
  create(
    @ActiveClientId() clientId: string | undefined,
    @Param('supplierId') supplierId: string,
    @Body() dto: CreateSupplierContactDto,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta() meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    return this.supplierContactsService.create(clientId!, supplierId, dto, {
      actorUserId,
      meta,
    });
  }

  @Patch(':id')
  @RequirePermissions('procurement.update')
  update(
    @ActiveClientId() clientId: string | undefined,
    @Param('supplierId') supplierId: string,
    @Param('id') id: string,
    @Body() dto: UpdateSupplierContactDto,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta() meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    return this.supplierContactsService.update(clientId!, supplierId, id, dto, {
      actorUserId,
      meta,
    });
  }

  @Get(':id/photo')
  @RequirePermissions('procurement.read')
  getPhoto(
    @ActiveClientId() clientId: string | undefined,
    @Param('supplierId') supplierId: string,
    @Param('id') id: string,
  ) {
    return this.supplierContactsService.getPhotoFile(clientId!, supplierId, id);
  }

  @Post(':id/photo')
  @RequirePermissions('procurement.update')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: MAX_SUPPLIER_CONTACT_PHOTO_BYTES } }),
  )
  uploadPhoto(
    @ActiveClientId() clientId: string | undefined,
    @Param('supplierId') supplierId: string,
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File | undefined,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta() meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    return this.supplierContactsService.savePhoto(clientId!, supplierId, id, file, {
      actorUserId,
      meta,
    });
  }

  @Delete(':id/photo')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('procurement.update')
  removePhoto(
    @ActiveClientId() clientId: string | undefined,
    @Param('supplierId') supplierId: string,
    @Param('id') id: string,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta() meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    return this.supplierContactsService.deletePhoto(clientId!, supplierId, id, {
      actorUserId,
      meta,
    });
  }

  @Post(':id/deactivate')
  @RequirePermissions('procurement.update')
  deactivate(
    @ActiveClientId() clientId: string | undefined,
    @Param('supplierId') supplierId: string,
    @Param('id') id: string,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta() meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    return this.supplierContactsService.deactivate(clientId!, supplierId, id, {
      actorUserId,
      meta,
    });
  }
}
