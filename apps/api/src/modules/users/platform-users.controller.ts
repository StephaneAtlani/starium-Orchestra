import { Body, Controller, Get, HttpCode, HttpStatus, Param, Patch, Post, Put, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PlatformAdminGuard } from '../../common/guards/platform-admin.guard';
import { CreatePlatformUserDto } from './dto/create-platform-user.dto';
import { UpdatePlatformUserClientsDto } from './dto/update-platform-user-clients.dto';
import { UpdatePlatformUserPasswordDto } from './dto/update-platform-user-password.dto';
import { UsersService } from './users.service';
import { MfaService } from '../mfa/mfa.service';
import { RequestMeta as RequestMetaDecorator, RequestMeta } from '../../common/decorators/request-meta.decorator';
import type { JwtUser } from '../auth/strategies/jwt.strategy';

@Controller('platform/users')
@UseGuards(JwtAuthGuard, PlatformAdminGuard)
export class PlatformUsersController {
  constructor(
    private readonly users: UsersService,
    private readonly mfa: MfaService,
  ) {}

  @Get()
  findAll() {
    return this.users.listPlatformUsers();
  }

  @Post()
  create(@Body() dto: CreatePlatformUserDto) {
    return this.users.createPlatformUser(dto);
  }

  @Get(':userId/clients')
  getUserClients(@Param('userId') userId: string) {
    return this.users.getPlatformUserClients(userId);
  }

  @Patch(':userId/password')
  updateUserPassword(
    @Param('userId') userId: string,
    @Body() dto: UpdatePlatformUserPasswordDto,
  ) {
    return this.users.updatePlatformUserPassword(userId, dto);
  }

  @Put(':userId/clients')
  updateUserClients(
    @Param('userId') userId: string,
    @Body() dto: UpdatePlatformUserClientsDto,
  ) {
    return this.users.updatePlatformUserClients(userId, dto);
  }

  /** POST /platform/users/:userId/reset-mfa — Admin reset la 2FA d'un utilisateur. */
  @Post(':userId/reset-mfa')
  @HttpCode(HttpStatus.NO_CONTENT)
  async resetMfa(
    @Param('userId') userId: string,
    @Req() req: { user: JwtUser },
    @RequestMetaDecorator() meta: RequestMeta,
  ): Promise<void> {
    await this.mfa.adminResetMfa(userId, req.user.userId, meta);
  }
}
