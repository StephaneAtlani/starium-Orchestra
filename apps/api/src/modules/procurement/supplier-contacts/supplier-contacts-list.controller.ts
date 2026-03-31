import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ActiveClientId } from '../../../common/decorators/active-client.decorator';
import { RequirePermissions } from '../../../common/decorators/require-permissions.decorator';
import { ActiveClientGuard } from '../../../common/guards/active-client.guard';
import { ModuleAccessGuard } from '../../../common/guards/module-access.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ListSupplierContactsQueryDto } from './dto/list-supplier-contacts.query.dto';
import { SupplierContactsService } from './supplier-contacts.service';

@Controller('supplier-contacts')
@UseGuards(JwtAuthGuard, ActiveClientGuard, ModuleAccessGuard, PermissionsGuard)
export class SupplierContactsListController {
  constructor(private readonly supplierContactsService: SupplierContactsService) {}

  @Get()
  @RequirePermissions('procurement.read')
  listAll(
    @ActiveClientId() clientId: string | undefined,
    @Query() query: ListSupplierContactsQueryDto,
  ) {
    return this.supplierContactsService.listAllForClient(clientId!, query);
  }
}
