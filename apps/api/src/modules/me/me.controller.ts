import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RequestUserId } from '../../common/decorators/request-user.decorator';
import { MeService } from './me.service';

@Controller('me')
@UseGuards(JwtAuthGuard)
export class MeController {
  constructor(private readonly me: MeService) {}

  @Get()
  getProfile(@RequestUserId() userId?: string) {
    return this.me.getProfile(userId!);
  }

  @Get('clients')
  getClients(@RequestUserId() userId?: string) {
    return this.me.getClients(userId!);
  }
}
