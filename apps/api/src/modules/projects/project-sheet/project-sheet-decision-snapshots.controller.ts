import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ActiveClientGuard } from '../../../common/guards/active-client.guard';
import { ModuleAccessGuard } from '../../../common/guards/module-access.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { RequirePermissions } from '../../../common/decorators/require-permissions.decorator';
import { ActiveClientId } from '../../../common/decorators/active-client.decorator';
import { ProjectSheetDecisionSnapshotsService } from './project-sheet-decision-snapshots.service';

@Controller('projects')
@UseGuards(JwtAuthGuard, ActiveClientGuard, ModuleAccessGuard, PermissionsGuard)
export class ProjectSheetDecisionSnapshotsController {
  constructor(
    private readonly decisionSnapshots: ProjectSheetDecisionSnapshotsService,
  ) {}

  @Get(':id/project-sheet/decision-snapshots')
  @RequirePermissions('projects.read')
  list(
    @ActiveClientId() clientId: string | undefined,
    @Param('id') projectId: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const l = limit != null ? Number.parseInt(limit, 10) : undefined;
    const o = offset != null ? Number.parseInt(offset, 10) : undefined;
    return this.decisionSnapshots.listSnapshots(
      clientId!,
      projectId,
      Number.isFinite(l) ? l : undefined,
      Number.isFinite(o) ? o : undefined,
    );
  }

  @Get(':id/project-sheet/decision-snapshots/:snapshotId')
  @RequirePermissions('projects.read')
  getOne(
    @ActiveClientId() clientId: string | undefined,
    @Param('id') projectId: string,
    @Param('snapshotId') snapshotId: string,
  ) {
    return this.decisionSnapshots.getSnapshotById(clientId!, projectId, snapshotId);
  }
}
