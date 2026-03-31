import { Module } from '@nestjs/common';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { CollaboratorsModule } from '../collaborators/collaborators.module';
import { MicrosoftModule } from '../microsoft/microsoft.module';
import { DirectoryConnectionsController } from './directory-connections.controller';
import { DirectoryConnectionsService } from './directory-connections.service';
import { DirectorySyncController } from './directory-sync.controller';
import { MicrosoftGraphDirectoryProvider } from './providers/microsoft-graph-directory.provider';
import { TeamDirectoryService } from './team-directory.service';

@Module({
  imports: [AuditLogsModule, MicrosoftModule, CollaboratorsModule],
  controllers: [DirectoryConnectionsController, DirectorySyncController],
  providers: [
    DirectoryConnectionsService,
    TeamDirectoryService,
    MicrosoftGraphDirectoryProvider,
  ],
  exports: [DirectoryConnectionsService, TeamDirectoryService],
})
export class TeamDirectoryModule {}
