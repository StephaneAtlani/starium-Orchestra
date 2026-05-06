import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ActiveClientId } from '../../common/decorators/active-client.decorator';
import {
  RequestMeta,
  RequestMeta as RequestMetaDecorator,
} from '../../common/decorators/request-meta.decorator';
import { RequestUserId } from '../../common/decorators/request-user.decorator';
import { ActiveClientGuard } from '../../common/guards/active-client.guard';
import { ClientAdminGuard } from '../../common/guards/client-admin.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RemoveModuleVisibilityQueryDto, SetModuleVisibilityDto } from './dto/set-module-visibility.dto';
import { ModuleVisibilityService } from './module-visibility.service';

/**
 * RFC-ACL-004 — visibilité des modules (admin client, contexte actif).
 */
@UseGuards(JwtAuthGuard, ActiveClientGuard, ClientAdminGuard)
@Controller()
export class ModuleVisibilityController {
  constructor(private readonly moduleVisibility: ModuleVisibilityService) {}

  @Get('module-visibility')
  list(@ActiveClientId() clientId: string | undefined) {
    return this.moduleVisibility.listMatrix(clientId!);
  }

  @Patch('module-visibility')
  set(
    @ActiveClientId() clientId: string | undefined,
    @Body() dto: SetModuleVisibilityDto,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMetaDecorator() meta: RequestMeta,
  ) {
    return this.moduleVisibility.setOverride(clientId!, dto, {
      actorUserId,
      meta,
    });
  }

  @Delete('module-visibility')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @ActiveClientId() clientId: string | undefined,
    @Query() query: RemoveModuleVisibilityQueryDto,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMetaDecorator() meta: RequestMeta,
  ): Promise<void> {
    await this.moduleVisibility.removeOverride(
      clientId!,
      query.moduleCode,
      query.scopeType,
      query.scopeId,
      { actorUserId, meta },
    );
  }
}
