import { Controller, Get, UseGuards } from '@nestjs/common';
import { ActiveClientGuard } from '../../common/guards/active-client.guard';
import { ModuleAccessGuard } from '../../common/guards/module-access.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

/**
 * Endpoint de test pour la chaîne de guards RBAC (ModuleAccessGuard + PermissionsGuard).
 * Permet de valider RFC-011 sans impacter les modules métiers existants.
 *
 * Exemple : nécessite la permission budgets.read.
 */
@Controller('test-rbac')
export class RbacTestController {
  @Get()
  @UseGuards(
    JwtAuthGuard,
    ActiveClientGuard,
    ModuleAccessGuard,
    PermissionsGuard,
  )
  @RequirePermissions('budgets.read')
  ping() {
    return { ok: true };
  }
}

