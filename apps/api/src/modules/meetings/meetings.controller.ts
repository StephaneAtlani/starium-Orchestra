import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
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
  AddMeetingProjectsDto,
  CancelMeetingDto,
  CreateMeetingDto,
  ListMeetingsQueryDto,
  ReorderMeetingProjectsDto,
  ReorderMeetingSectionsDto,
  ScheduleMeetingDto,
  UpdateMeetingDto,
  UpdateMeetingProjectDto,
  UpdateMeetingSectionDto,
} from './dto/meeting.dto';
import { MeetingsService } from './meetings.service';

/**
 * RFC-MEET-001 §4.10 — API des réunions de gouvernance.
 *
 * `clientId` n'est jamais accepté en entrée : il vient d'`ActiveClientGuard`.
 */
@Controller('meetings')
@UseGuards(JwtAuthGuard, ActiveClientGuard, ModuleAccessGuard, PermissionsGuard)
export class MeetingsController {
  constructor(private readonly meetings: MeetingsService) {}

  @Get()
  @RequirePermissions('meetings.read')
  list(
    @ActiveClientId() clientId: string | undefined,
    @Query() query: ListMeetingsQueryDto,
  ) {
    return this.meetings.list(clientId!, query);
  }

  @Post()
  @RequirePermissions('meetings.create')
  create(
    @ActiveClientId() clientId: string | undefined,
    @RequestUserId() userId: string,
    @Body() dto: CreateMeetingDto,
  ) {
    return this.meetings.create(clientId!, userId, dto);
  }

  @Get(':meetingId')
  @RequirePermissions('meetings.read')
  get(
    @ActiveClientId() clientId: string | undefined,
    @Param('meetingId') meetingId: string,
  ) {
    return this.meetings.getOrThrow(clientId!, meetingId);
  }

  @Patch(':meetingId')
  @RequirePermissions('meetings.update')
  update(
    @ActiveClientId() clientId: string | undefined,
    @RequestUserId() userId: string,
    @Param('meetingId') meetingId: string,
    @Body() dto: UpdateMeetingDto,
  ) {
    return this.meetings.update(clientId!, userId, meetingId, dto);
  }

  // --- cycle de vie --------------------------------------------------------

  @Post(':meetingId/schedule')
  @RequirePermissions('meetings.update')
  schedule(
    @ActiveClientId() clientId: string | undefined,
    @RequestUserId() userId: string,
    @Param('meetingId') meetingId: string,
    @Body() dto: ScheduleMeetingDto,
  ) {
    return this.meetings.schedule(clientId!, userId, meetingId, dto);
  }

  @Post(':meetingId/start')
  @RequirePermissions('meetings.conduct')
  start(
    @ActiveClientId() clientId: string | undefined,
    @RequestUserId() userId: string,
    @Param('meetingId') meetingId: string,
  ) {
    return this.meetings.start(clientId!, userId, meetingId);
  }

  @Post(':meetingId/finalize')
  @RequirePermissions('meetings.conduct')
  finalize(
    @ActiveClientId() clientId: string | undefined,
    @RequestUserId() userId: string,
    @Param('meetingId') meetingId: string,
  ) {
    return this.meetings.finalize(clientId!, userId, meetingId);
  }

  @Post(':meetingId/cancel')
  @RequirePermissions('meetings.update')
  cancel(
    @ActiveClientId() clientId: string | undefined,
    @RequestUserId() userId: string,
    @Param('meetingId') meetingId: string,
    @Body() dto: CancelMeetingDto,
  ) {
    return this.meetings.cancel(clientId!, userId, meetingId, dto);
  }

  // --- périmètre projets ---------------------------------------------------

  @Post(':meetingId/projects')
  @RequirePermissions('meetings.update')
  addProjects(
    @ActiveClientId() clientId: string | undefined,
    @RequestUserId() userId: string,
    @Param('meetingId') meetingId: string,
    @Body() dto: AddMeetingProjectsDto,
  ) {
    return this.meetings.addProjects(clientId!, userId, meetingId, dto);
  }

  @Patch(':meetingId/projects/reorder')
  @RequirePermissions('meetings.update')
  reorderProjects(
    @ActiveClientId() clientId: string | undefined,
    @RequestUserId() userId: string,
    @Param('meetingId') meetingId: string,
    @Body() dto: ReorderMeetingProjectsDto,
  ) {
    return this.meetings.reorderProjects(clientId!, userId, meetingId, dto);
  }

  @Patch(':meetingId/projects/:meetingProjectId')
  @RequirePermissions('meetings.update')
  updateProject(
    @ActiveClientId() clientId: string | undefined,
    @RequestUserId() userId: string,
    @Param('meetingId') meetingId: string,
    @Param('meetingProjectId') meetingProjectId: string,
    @Body() dto: UpdateMeetingProjectDto,
  ) {
    return this.meetings.updateProject(
      clientId!,
      userId,
      meetingId,
      meetingProjectId,
      dto,
    );
  }

  @Delete(':meetingId/projects/:meetingProjectId')
  @RequirePermissions('meetings.update')
  removeProject(
    @ActiveClientId() clientId: string | undefined,
    @RequestUserId() userId: string,
    @Param('meetingId') meetingId: string,
    @Param('meetingProjectId') meetingProjectId: string,
  ) {
    return this.meetings.removeProject(
      clientId!,
      userId,
      meetingId,
      meetingProjectId,
    );
  }

  // --- appel ---------------------------------------------------------------

  @Get(':meetingId/attendance')
  @RequirePermissions('meetings.read')
  attendance(
    @ActiveClientId() clientId: string | undefined,
    @Param('meetingId') meetingId: string,
  ) {
    return this.meetings.getAttendance(clientId!, meetingId);
  }

  // --- sections ------------------------------------------------------------

  @Patch(':meetingId/sections/reorder')
  @RequirePermissions('meetings.update')
  reorderSections(
    @ActiveClientId() clientId: string | undefined,
    @RequestUserId() userId: string,
    @Param('meetingId') meetingId: string,
    @Body() dto: ReorderMeetingSectionsDto,
  ) {
    return this.meetings.reorderSections(clientId!, userId, meetingId, dto);
  }

  @Patch(':meetingId/sections/:sectionId')
  @RequirePermissions('meetings.update')
  updateSection(
    @ActiveClientId() clientId: string | undefined,
    @RequestUserId() userId: string,
    @Param('meetingId') meetingId: string,
    @Param('sectionId') sectionId: string,
    @Body() dto: UpdateMeetingSectionDto,
  ) {
    return this.meetings.updateSection(
      clientId!,
      userId,
      meetingId,
      sectionId,
      dto,
    );
  }
}
