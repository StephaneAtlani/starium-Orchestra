import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ActiveClientId } from '../../common/decorators/active-client.decorator';
import { RequestMeta } from '../../common/decorators/request-meta.decorator';
import { RequestUserId } from '../../common/decorators/request-user.decorator';
import { ActiveClientGuard } from '../../common/guards/active-client.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ListCollaboratorsQueryDto } from './dto/list-collaborators.query.dto';
import { UpdateCollaboratorDto } from './dto/update-collaborator.dto';
import { CollaboratorsService } from './collaborators.service';

@Controller('collaborators')
@UseGuards(JwtAuthGuard, ActiveClientGuard)
export class CollaboratorsController {
  constructor(private readonly collaborators: CollaboratorsService) {}

  @Get()
  list(
    @ActiveClientId() clientId: string | undefined,
    @Query() query: ListCollaboratorsQueryDto,
  ) {
    return this.collaborators.list(clientId!, query);
  }

  @Patch(':id')
  update(
    @ActiveClientId() clientId: string | undefined,
    @Param('id') id: string,
    @Body() dto: UpdateCollaboratorDto,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta()
    meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    return this.collaborators.update(clientId!, id, dto, actorUserId, meta);
  }
}
