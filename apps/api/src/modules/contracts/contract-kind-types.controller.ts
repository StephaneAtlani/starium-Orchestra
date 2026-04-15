import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
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
import { CreateContractKindTypeDto } from './dto/create-contract-kind-type.dto';
import { UpdateContractKindTypeDto } from './dto/update-contract-kind-type.dto';

/**
 * Routes sous `contracts/kind-types` pour éviter tout conflit avec `GET /contracts/:id`
 * (Express peut matcher `:id` = `kind-types` selon l’ordre d’enregistrement).
 */
@Controller('contracts/kind-types')
@UseGuards(JwtAuthGuard, ActiveClientGuard, ModuleAccessGuard, PermissionsGuard)
export class ContractKindTypesController {
  constructor(private readonly contractKindTypes: ContractKindTypesService) {}

  @Get()
  @RequireAnyPermissions('contracts.read', 'contracts.create', 'contracts.update')
  list(@ActiveClientId() clientId: string | undefined) {
    return this.contractKindTypes.listMergedForClient(clientId!);
  }

  @Post()
  @RequirePermissions('contracts.kind_types.manage')
  create(
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

  @Patch(':typeId')
  @RequirePermissions('contracts.kind_types.manage')
  update(
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

  @Delete(':typeId')
  @RequirePermissions('contracts.kind_types.manage')
  remove(
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
}
