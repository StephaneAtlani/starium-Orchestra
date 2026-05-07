import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ClientSubscriptionStatus } from '@prisma/client';
import { ActiveClientId } from '../../common/decorators/active-client.decorator';
import {
  RequestMeta,
  RequestMeta as RequestMetaDecorator,
} from '../../common/decorators/request-meta.decorator';
import { RequestUserId } from '../../common/decorators/request-user.decorator';
import { ActiveClientGuard } from '../../common/guards/active-client.guard';
import { ClientAdminGuard } from '../../common/guards/client-admin.guard';
import { ModuleAccessGuard } from '../../common/guards/module-access.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { PlatformAdminGuard } from '../../common/guards/platform-admin.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AssignUserLicenseDto } from './dto/assign-user-license.dto';
import { CreateClientSubscriptionDto } from './dto/create-client-subscription.dto';
import { UpdateClientSubscriptionDto } from './dto/update-client-subscription.dto';
import { LicenseService } from './license.service';
import { SubscriptionService } from './subscription.service';

@Controller('platform/clients/:clientId')
@UseGuards(JwtAuthGuard, PlatformAdminGuard)
export class PlatformLicensesController {
  constructor(
    private readonly subscriptions: SubscriptionService,
    private readonly licenses: LicenseService,
  ) {}

  @Get('subscriptions')
  listSubscriptions(@Param('clientId') clientId: string) {
    return this.subscriptions.listByClient(clientId);
  }

  @Post('subscriptions')
  createSubscription(
    @RequestUserId() actorUserId: string | undefined,
    @RequestMetaDecorator() meta: RequestMeta,
    @Param('clientId') clientId: string,
    @Body() dto: CreateClientSubscriptionDto,
  ) {
    return this.subscriptions.create(clientId, dto, { actorUserId, meta });
  }

  @Patch('subscriptions/:subscriptionId')
  updateSubscription(
    @RequestUserId() actorUserId: string | undefined,
    @RequestMetaDecorator() meta: RequestMeta,
    @Param('clientId') clientId: string,
    @Param('subscriptionId') subscriptionId: string,
    @Body() dto: UpdateClientSubscriptionDto,
  ) {
    return this.subscriptions.update(clientId, subscriptionId, dto, {
      actorUserId,
      meta,
    });
  }

  @Post('subscriptions/:subscriptionId/activate')
  activateSubscription(
    @RequestUserId() actorUserId: string | undefined,
    @RequestMetaDecorator() meta: RequestMeta,
    @Param('clientId') clientId: string,
    @Param('subscriptionId') subscriptionId: string,
  ) {
    return this.subscriptions.transition(
      clientId,
      subscriptionId,
      ClientSubscriptionStatus.ACTIVE,
      { actorUserId, meta },
    );
  }

  @Post('subscriptions/:subscriptionId/suspend')
  suspendSubscription(
    @RequestUserId() actorUserId: string | undefined,
    @RequestMetaDecorator() meta: RequestMeta,
    @Param('clientId') clientId: string,
    @Param('subscriptionId') subscriptionId: string,
  ) {
    return this.subscriptions.transition(
      clientId,
      subscriptionId,
      ClientSubscriptionStatus.SUSPENDED,
      { actorUserId, meta },
    );
  }

  @Post('subscriptions/:subscriptionId/cancel')
  cancelSubscription(
    @RequestUserId() actorUserId: string | undefined,
    @RequestMetaDecorator() meta: RequestMeta,
    @Param('clientId') clientId: string,
    @Param('subscriptionId') subscriptionId: string,
  ) {
    return this.subscriptions.transition(
      clientId,
      subscriptionId,
      ClientSubscriptionStatus.CANCELED,
      { actorUserId, meta },
    );
  }

  @Get('license-usage')
  getUsage(@Param('clientId') clientId: string) {
    return this.licenses.getClientUsage(clientId);
  }

  @Patch('users/:userId/license')
  patchUserLicenseByPlatform(
    @RequestUserId() actorUserId: string | undefined,
    @RequestMetaDecorator() meta: RequestMeta,
    @Param('clientId') clientId: string,
    @Param('userId') userId: string,
    @Body() dto: AssignUserLicenseDto,
  ) {
    return this.licenses.assignByPlatform(actorUserId, clientId, userId, dto, meta);
  }
}

@Controller()
export class ClientLicensesController {
  constructor(private readonly licenses: LicenseService) {}

  @Get('client-license-usage')
  @UseGuards(
    JwtAuthGuard,
    ActiveClientGuard,
    ModuleAccessGuard,
    PermissionsGuard,
  )
  getActiveClientUsage(@ActiveClientId() clientId: string | undefined) {
    return this.licenses.getClientUsage(clientId!);
  }

  @Patch('users/:userId/license')
  @UseGuards(
    JwtAuthGuard,
    ActiveClientGuard,
    ModuleAccessGuard,
    PermissionsGuard,
    ClientAdminGuard,
  )
  patchUserLicenseByClientAdmin(
    @RequestUserId() actorUserId: string | undefined,
    @RequestMetaDecorator() meta: RequestMeta,
    @ActiveClientId() clientId: string | undefined,
    @Param('userId') userId: string,
    @Body() dto: AssignUserLicenseDto,
  ) {
    return this.licenses.assignByClientAdmin(
      actorUserId!,
      clientId!,
      userId,
      dto,
      meta,
    );
  }
}
