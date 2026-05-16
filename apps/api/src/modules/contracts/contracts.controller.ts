import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ActiveClientGuard } from '../../common/guards/active-client.guard';
import { ModuleAccessGuard } from '../../common/guards/module-access.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { RequireAccessIntent } from '../../common/decorators/require-access-intent.decorator';
import { RequireAnyPermissions } from '../../common/decorators/require-any-permissions.decorator';
import { ActiveClientId } from '../../common/decorators/active-client.decorator';
import { RequestUserId } from '../../common/decorators/request-user.decorator';
import { RequestMeta } from '../../common/decorators/request-meta.decorator';
import type { RequestWithClient } from '../../common/types/request-with-client';
import { ContractsService } from './contracts.service';
import { CreateContractDto } from './dto/create-contract.dto';
import { ListContractsQueryDto } from './dto/list-contracts.query.dto';
import { UpdateContractDto } from './dto/update-contract.dto';
import { ListSuppliersQueryDto } from '../procurement/suppliers/dto/list-suppliers.query.dto';

@Controller('contracts')
@UseGuards(JwtAuthGuard, ActiveClientGuard, ModuleAccessGuard, PermissionsGuard)
export class ContractsController {
  constructor(private readonly contracts: ContractsService) {}

  @Get()
  @RequireAccessIntent({ module: 'contracts', intent: 'read' })
  list(
    @ActiveClientId() clientId: string | undefined,
    @Query() query: ListContractsQueryDto,
    @RequestUserId() userId: string | undefined,
    @Req() request: RequestWithClient,
  ) {
    return this.contracts.list(clientId!, query, userId, request);
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

  @Get(':id')
  @RequireAccessIntent({ module: 'contracts', intent: 'read' })
  getOne(
    @ActiveClientId() clientId: string | undefined,
    @Param('id') id: string,
    @RequestUserId() userId: string | undefined,
    @Req() request: RequestWithClient,
  ) {
    return this.contracts.getById(clientId!, id, userId, request);
  }

  @Post()
  @RequireAccessIntent({ module: 'contracts', intent: 'create' })
  create(
    @ActiveClientId() clientId: string | undefined,
    @Body() dto: CreateContractDto,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta() meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    return this.contracts.create(clientId!, dto, { actorUserId, meta });
  }

  @Patch(':id')
  @RequireAccessIntent({ module: 'contracts', intent: 'write' })
  update(
    @ActiveClientId() clientId: string | undefined,
    @Param('id') id: string,
    @Body() dto: UpdateContractDto,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta() meta: { ipAddress?: string; userAgent?: string; requestId?: string },
    @Req() request: RequestWithClient,
  ) {
    return this.contracts.update(clientId!, id, dto, { actorUserId, meta }, request);
  }

  @Delete(':id')
  @RequireAccessIntent({ module: 'contracts', intent: 'admin' })
  remove(
    @ActiveClientId() clientId: string | undefined,
    @Param('id') id: string,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta() meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    return this.contracts.terminate(clientId!, id, { actorUserId, meta });
  }
}
