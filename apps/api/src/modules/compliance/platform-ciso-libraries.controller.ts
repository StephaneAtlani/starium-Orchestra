import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PlatformAdminGuard } from '../../common/guards/platform-admin.guard';
import { RequestUserId } from '../../common/decorators/request-user.decorator';
import { RequestMeta } from '../../common/decorators/request-meta.decorator';
import { CisoLibraryImportService } from './ciso-library-import.service';
import { ImportCisoLibrariesDto } from './dto/import-ciso-libraries.dto';

@Controller('platform/compliance/ciso-libraries')
@UseGuards(JwtAuthGuard, PlatformAdminGuard)
export class PlatformCisoLibrariesController {
  constructor(private readonly cisoImport: CisoLibraryImportService) {}

  /** Liste les bibliothèques framework depuis CISO Assistant (GitHub). */
  @Get()
  list() {
    return this.cisoImport.listRemoteLibraries();
  }

  @Post('import')
  import(
    @Body() dto: ImportCisoLibrariesDto,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta()
    meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    return this.cisoImport.importLibraries(
      dto.paths,
      actorUserId,
      meta,
      dto.locale,
    );
  }
}
