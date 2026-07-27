import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ActiveClientId } from '../../common/decorators/active-client.decorator';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { RequestUserId } from '../../common/decorators/request-user.decorator';
import { ActiveClientGuard } from '../../common/guards/active-client.guard';
import { ModuleAccessGuard } from '../../common/guards/module-access.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  CreateMeetingTemplateDto,
  DuplicateMeetingTemplateDto,
  ListMeetingTemplatesQueryDto,
  PutMeetingTemplateSectionsDto,
  UpdateMeetingTemplateDto,
} from './dto/meeting.dto';
import { MEETING_SECTION_CATALOG } from './lib/meeting-section-catalog';
import { MeetingTemplatesService } from './meeting-templates.service';

/**
 * RFC-MEET-001 §4.3 — administration des modèles de rituel.
 *
 * La lecture suffit à composer une réunion ; la modification exige
 * `meetings.templates.manage`.
 */
@Controller('meeting-templates')
@UseGuards(JwtAuthGuard, ActiveClientGuard, ModuleAccessGuard, PermissionsGuard)
export class MeetingTemplatesController {
  constructor(private readonly templates: MeetingTemplatesService) {}

  /**
   * Catalogue des sections disponibles — alimente l'écran de composition.
   * Déclaré avant `:templateId` pour ne pas être capté par la route paramétrée.
   */
  @Get('section-catalog')
  @RequirePermissions('meetings.read')
  sectionCatalog() {
    return { sections: Object.values(MEETING_SECTION_CATALOG) };
  }

  @Get()
  @RequirePermissions('meetings.read')
  list(
    @ActiveClientId() clientId: string | undefined,
    @Query() query: ListMeetingTemplatesQueryDto,
  ) {
    return this.templates.list(clientId!, query);
  }

  @Post()
  @RequirePermissions('meetings.templates.manage')
  create(
    @ActiveClientId() clientId: string | undefined,
    @RequestUserId() userId: string,
    @Body() dto: CreateMeetingTemplateDto,
  ) {
    return this.templates.create(clientId!, userId, dto);
  }

  @Get(':templateId')
  @RequirePermissions('meetings.read')
  get(
    @ActiveClientId() clientId: string | undefined,
    @Param('templateId') templateId: string,
  ) {
    return this.templates.getOrThrow(clientId!, templateId);
  }

  @Patch(':templateId')
  @RequirePermissions('meetings.templates.manage')
  update(
    @ActiveClientId() clientId: string | undefined,
    @RequestUserId() userId: string,
    @Param('templateId') templateId: string,
    @Body() dto: UpdateMeetingTemplateDto,
  ) {
    return this.templates.update(clientId!, userId, templateId, dto);
  }

  @Delete(':templateId')
  @HttpCode(204)
  @RequirePermissions('meetings.templates.manage')
  async remove(
    @ActiveClientId() clientId: string | undefined,
    @RequestUserId() userId: string,
    @Param('templateId') templateId: string,
  ) {
    await this.templates.remove(clientId!, userId, templateId);
  }

  @Post(':templateId/duplicate')
  @RequirePermissions('meetings.templates.manage')
  duplicate(
    @ActiveClientId() clientId: string | undefined,
    @RequestUserId() userId: string,
    @Param('templateId') templateId: string,
    @Body() dto: DuplicateMeetingTemplateDto,
  ) {
    return this.templates.duplicate(clientId!, userId, templateId, dto);
  }

  @Put(':templateId/sections')
  @RequirePermissions('meetings.templates.manage')
  putSections(
    @ActiveClientId() clientId: string | undefined,
    @RequestUserId() userId: string,
    @Param('templateId') templateId: string,
    @Body() dto: PutMeetingTemplateSectionsDto,
  ) {
    return this.templates.putSections(clientId!, userId, templateId, dto);
  }
}
