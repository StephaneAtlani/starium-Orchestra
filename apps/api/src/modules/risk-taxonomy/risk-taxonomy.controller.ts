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
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ActiveClientGuard } from '../../common/guards/active-client.guard';
import { ModuleAccessGuard } from '../../common/guards/module-access.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { ClientAdminGuard } from '../../common/guards/client-admin.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { ActiveClientId } from '../../common/decorators/active-client.decorator';
import { RiskTaxonomyService } from './risk-taxonomy.service';
import { CreateRiskDomainDto } from './dto/create-risk-domain.dto';
import { UpdateRiskDomainDto } from './dto/update-risk-domain.dto';
import { CreateRiskTypeDto } from './dto/create-risk-type.dto';
import { UpdateRiskTypeDto } from './dto/update-risk-type.dto';

@Controller('risk-taxonomy')
@UseGuards(JwtAuthGuard, ActiveClientGuard, ModuleAccessGuard, PermissionsGuard)
export class RiskTaxonomyController {
  constructor(private readonly taxonomy: RiskTaxonomyService) {}

  /** Catalogue pour formulaires et filtres (domaines + types actifs). */
  @Get('catalog')
  @RequirePermissions('projects.read')
  getCatalog(
    @ActiveClientId() clientId: string | undefined,
    @Query('includeLegacy') includeLegacy?: string,
  ) {
    const withLegacy = includeLegacy === 'true' || includeLegacy === '1';
    return this.taxonomy.getCatalog(clientId!, withLegacy);
  }

  @Get('admin/domains')
  @UseGuards(ClientAdminGuard)
  @RequirePermissions('risks.taxonomy.manage')
  listDomainsAdmin(
    @ActiveClientId() clientId: string | undefined,
    @Query('activeOnly') activeOnly?: string,
  ) {
    const only = activeOnly === 'true' || activeOnly === '1';
    return this.taxonomy.listDomainsAdmin(clientId!, only ? true : undefined);
  }

  @Post('admin/domains')
  @UseGuards(ClientAdminGuard)
  @RequirePermissions('risks.taxonomy.manage')
  createDomain(
    @ActiveClientId() clientId: string | undefined,
    @Body() dto: CreateRiskDomainDto,
  ) {
    return this.taxonomy.createDomain(clientId!, dto);
  }

  @Patch('admin/domains/:domainId')
  @UseGuards(ClientAdminGuard)
  @RequirePermissions('risks.taxonomy.manage')
  updateDomain(
    @ActiveClientId() clientId: string | undefined,
    @Param('domainId') domainId: string,
    @Body() dto: UpdateRiskDomainDto,
  ) {
    return this.taxonomy.updateDomain(clientId!, domainId, dto);
  }

  @Post('admin/domains/:domainId/types')
  @UseGuards(ClientAdminGuard)
  @RequirePermissions('risks.taxonomy.manage')
  createType(
    @ActiveClientId() clientId: string | undefined,
    @Param('domainId') domainId: string,
    @Body() dto: CreateRiskTypeDto,
  ) {
    return this.taxonomy.createType(clientId!, { ...dto, domainId });
  }

  @Patch('admin/types/:typeId')
  @UseGuards(ClientAdminGuard)
  @RequirePermissions('risks.taxonomy.manage')
  updateType(
    @ActiveClientId() clientId: string | undefined,
    @Param('typeId') typeId: string,
    @Body() dto: UpdateRiskTypeDto,
  ) {
    return this.taxonomy.updateType(clientId!, typeId, dto);
  }
}
