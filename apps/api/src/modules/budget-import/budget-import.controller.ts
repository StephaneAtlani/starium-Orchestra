import {
  Body,
  Controller,
  Post,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ActiveClientGuard } from '../../common/guards/active-client.guard';
import { ModuleAccessGuard } from '../../common/guards/module-access.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { ActiveClientId } from '../../common/decorators/active-client.decorator';
import { RequestUserId } from '../../common/decorators/request-user.decorator';
import { RequestMeta } from '../../common/decorators/request-meta.decorator';
import { BudgetImportService } from './budget-import.service';
import { PreviewImportDto } from './dto/preview-import.dto';
import { ExecuteImportDto } from './dto/execute-import.dto';
import { MAX_FILE_SIZE_BYTES } from './constants';
import type { UploadedFileType } from './types';

@Controller('budget-imports')
@UseGuards(JwtAuthGuard, ActiveClientGuard, ModuleAccessGuard, PermissionsGuard)
export class BudgetImportController {
  constructor(private readonly service: BudgetImportService) {}

  @Post('analyze')
  @RequirePermissions('budgets.read')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: MAX_FILE_SIZE_BYTES },
    }),
  )
  analyze(
    @ActiveClientId() clientId: string | undefined,
    @RequestUserId() userId: string | undefined,
    @UploadedFile() file: UploadedFileType,
    @RequestMeta() meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    return this.service.analyze(clientId!, userId!, file, meta);
  }

  @Post('preview')
  @RequirePermissions('budgets.read')
  preview(
    @ActiveClientId() clientId: string | undefined,
    @RequestUserId() userId: string | undefined,
    @Body() dto: PreviewImportDto,
    @RequestMeta() meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    return this.service.preview(clientId!, userId!, dto, meta);
  }

  @Post('execute')
  @RequirePermissions('budgets.update')
  execute(
    @ActiveClientId() clientId: string | undefined,
    @RequestUserId() userId: string | undefined,
    @Body() dto: ExecuteImportDto,
    @RequestMeta() meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    return this.service.execute(clientId!, userId!, dto, meta);
  }
}
