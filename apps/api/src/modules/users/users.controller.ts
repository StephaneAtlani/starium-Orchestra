import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ActiveClientGuard } from '../../common/guards/active-client.guard';
import { ClientAdminGuard } from '../../common/guards/client-admin.guard';
import { ActiveClientId } from '../../common/decorators/active-client.decorator';
import { RequestUserId } from '../../common/decorators/request-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersService } from './users.service';

@Controller('users')
@UseGuards(JwtAuthGuard, ActiveClientGuard, ClientAdminGuard)
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  findAll(@ActiveClientId() clientId?: string) {
    return this.users.findAll(clientId!);
  }

  @Post()
  async create(
    @ActiveClientId() clientId: string | undefined,
    @Body() dto: CreateUserDto,
  ) {
    return this.users.create(clientId!, dto);
  }

  @Patch(':id')
  update(
    @ActiveClientId() clientId: string | undefined,
    @Param('id') userId: string,
    @Body() dto: UpdateUserDto,
  ) {
    return this.users.update(clientId!, userId, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @ActiveClientId() clientId: string | undefined,
    @Param('id') userId: string,
  ): Promise<void> {
    await this.users.remove(clientId!, userId);
  }
}
