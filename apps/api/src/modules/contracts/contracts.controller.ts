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
import { RequireAnyPermissions } from '../../common/decorators/require-any-permissions.decorator';
import { ActiveClientId } from '../../common/decorators/active-client.decorator';
import { RequestUserId } from '../../common/decorators/request-user.decorator';
import { RequestMeta } from '../../common/decorators/request-meta.decorator';
import { ContractKindTypesService } from './contract-kind-types.service';
import { ContractsService } from './contracts.service';
import { CreateContractKindTypeDto } from './dto/create-contract-kind-type.dto';
import { CreateContractDto } from './dto/create-contract.dto';
import { ListContractsQueryDto } from './dto/list-contracts.query.dto';
import { UpdateContractKindTypeDto } from './dto/update-contract-kind-type.dto';
import { UpdateContractDto } from './dto/update-contract.dto';
import { ListSuppliersQueryDto } from '../procurement/suppliers/dto/list-suppliers.query.dto';

@Controller('contracts')
@UseGuards(JwtAuthGuard, ActiveClientGuard, ModuleAccessGuard, PermissionsGuard)
export class ContractsController {
  constructor(
    private readonly contracts: ContractsService,
    private readonly contractKindTypes: ContractKindTypesService,
  ) {}

  @Get()
  @RequirePermissions('contracts.read')
  list(
    @ActiveClientId() clientId: string | undefined,
    @Query() query: ListContractsQueryDto,
  ) {
    return this.contracts.list(clientId!, query);
  }

  /** Fournisseurs du client pour sélecteur contrat (sans exiger procurement.read). */
  @Get('supplier-options')
  @RequireAnyPermissions('contracts.read', 'contracts.create', 'contracts.update')
  listSupplierOptions(
    @ActiveClientId() clientId: string | undefined,
    @Query() query: ListSuppliersQueryDto,
  ) {
    return this.contracts.listSupplierOptionsForContracts(clientId!, query);
  }

  @Get('supplier/:supplierId')
  @RequireAnyPermissions('contracts.read', 'contracts.create', 'contracts.update')
  getSupplierForContract(
    @ActiveClientId() clientId: string | undefined,
    @Param('supplierId') supplierId: string,
  ) {
    return this.contracts.getSupplierForContractForm(clientId!, supplierId);
  }

  @Get('kind-types')
  @RequireAnyPermissions('contracts.read', 'contracts.create', 'contracts.update')
  listKindTypes(@ActiveClientId() clientId: string | undefined) {
    return this.contractKindTypes.listMergedForClient(clientId!);
  }

  @Post('kind-types')
  @RequirePermissions('contracts.kind_types.manage')
  createKindType(
    @ActiveClientId() clientId: string | undefined,
    @Body() dto: CreateContractKindTypeDto,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta() meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    return this.contractKindTypes.createForClient(clientId!, dto, {
      actorUserId,
      meta,
    });
  }

  @Patch('kind-types/:typeId')
  @RequirePermissions('contracts.kind_types.manage')
  updateKindType(
    @ActiveClientId() clientId: string | undefined,
    @Param('typeId') typeId: string,
    @Body() dto: UpdateContractKindTypeDto,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta() meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    return this.contractKindTypes.updateForClient(clientId!, typeId, dto, {
      actorUserId,
      meta,
    });
  }

  @Delete('kind-types/:typeId')
  @RequirePermissions('contracts.kind_types.manage')
  removeKindType(
    @ActiveClientId() clientId: string | undefined,
    @Param('typeId') typeId: string,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta() meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    return this.contractKindTypes.softDeleteForClient(clientId!, typeId, {
      actorUserId,
      meta,
    });
  }

  @Get(':id')
  @RequirePermissions('contracts.read')
  getOne(
    @ActiveClientId() clientId: string | undefined,
    @Param('id') id: string,
  ) {
    return this.contracts.getById(clientId!, id);
  }

  @Post()
  @RequirePermissions('contracts.create')
  create(
    @ActiveClientId() clientId: string | undefined,
    @Body() dto: CreateContractDto,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta() meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    return this.contracts.create(clientId!, dto, { actorUserId, meta });
  }

  @Patch(':id')
  @RequirePermissions('contracts.update')
  update(
    @ActiveClientId() clientId: string | undefined,
    @Param('id') id: string,
    @Body() dto: UpdateContractDto,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta() meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    return this.contracts.update(clientId!, id, dto, { actorUserId, meta });
  }

  @Delete(':id')
  @RequirePermissions('contracts.delete')
  remove(
    @ActiveClientId() clientId: string | undefined,
    @Param('id') id: string,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta() meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    return this.contracts.terminate(clientId!, id, { actorUserId, meta });
  }
}
