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
import { PlatformAdminGuard } from '../../common/guards/platform-admin.guard';
import { RequestUserId } from '../../common/decorators/request-user.decorator';
import { RequestMeta } from '../../common/decorators/request-meta.decorator';
import { ComplianceService } from './compliance.service';
import { CreateComplianceFrameworkDto } from './dto/create-compliance-framework.dto';
import { UpdateComplianceFrameworkDto } from './dto/update-compliance-framework.dto';
import { CreateComplianceRequirementDto } from './dto/create-compliance-requirement.dto';

@Controller('platform/compliance/frameworks')
@UseGuards(JwtAuthGuard, PlatformAdminGuard)
export class PlatformComplianceFrameworksController {
  constructor(private readonly compliance: ComplianceService) {}

  @Get()
  list(@Query('includeArchived') includeArchived?: string) {
    return this.compliance.listPlatformFrameworks(
      includeArchived === 'true' || includeArchived === '1',
    );
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.compliance.getPlatformFramework(id);
  }

  @Post()
  create(
    @Body() dto: CreateComplianceFrameworkDto,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta()
    meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    return this.compliance.createPlatformFramework(dto, actorUserId, meta);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateComplianceFrameworkDto,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta()
    meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    return this.compliance.updatePlatformFramework(id, dto, actorUserId, meta);
  }

  @Post(':id/archive')
  archive(
    @Param('id') id: string,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta()
    meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    return this.compliance.archivePlatformFramework(id, actorUserId, meta);
  }

  @Post(':id/restore')
  restore(
    @Param('id') id: string,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta()
    meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    return this.compliance.restorePlatformFramework(id, actorUserId, meta);
  }

  @Post(':id/requirements')
  createRequirement(
    @Param('id') id: string,
    @Body() dto: CreateComplianceRequirementDto,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta()
    meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    return this.compliance.createPlatformRequirement(
      id,
      { ...dto, frameworkId: id },
      actorUserId,
      meta,
    );
  }
}
