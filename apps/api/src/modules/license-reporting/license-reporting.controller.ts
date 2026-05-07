import {
  Controller,
  Get,
  Header,
  Query,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import { PlatformAdminGuard } from '../../common/guards/platform-admin.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  LicenseReportingFiltersDto,
  LicenseReportingMonthlyQueryDto,
} from './dto/license-reporting-query.dto';
import { rowsToCsv } from './license-reporting.csv';
import { LicenseReportingService } from './license-reporting.service';

@Controller('platform/license-reporting')
@UseGuards(JwtAuthGuard, PlatformAdminGuard)
export class LicenseReportingController {
  constructor(private readonly service: LicenseReportingService) {}

  @Get('overview')
  getOverview(@Query() query: LicenseReportingFiltersDto) {
    return this.service.getOverview({
      clientId: query.clientId,
      licenseBillingMode: query.licenseBillingMode,
      subscriptionStatus: query.subscriptionStatus,
    });
  }

  @Get('clients')
  listClients(@Query() query: LicenseReportingFiltersDto) {
    return this.service.listClients({
      clientId: query.clientId,
      licenseBillingMode: query.licenseBillingMode,
      subscriptionStatus: query.subscriptionStatus,
    });
  }

  @Get('monthly')
  getMonthly(@Query() query: LicenseReportingMonthlyQueryDto) {
    return this.service.getMonthlySeries(
      {
        clientId: query.clientId,
        licenseBillingMode: query.licenseBillingMode,
        subscriptionStatus: query.subscriptionStatus,
      },
      { from: query.from, to: query.to },
    );
  }

  @Get('clients.csv')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="license-reporting-clients.csv"')
  async exportClientsCsv(
    @Query() query: LicenseReportingFiltersDto,
  ): Promise<StreamableFile> {
    const rows = await this.service.listClients({
      clientId: query.clientId,
      licenseBillingMode: query.licenseBillingMode,
      subscriptionStatus: query.subscriptionStatus,
    });

    const headers = [
      'clientName',
      'clientSlug',
      'clientUsersActive',
      'seatsUsed',
      'seatsLimit',
      'readOnly',
      'clientBillable',
      'externalBillable',
      'nonBillable',
      'platformInternalActive',
      'platformInternalExpired',
      'evaluationActive',
      'evaluationExpired',
      'subscriptionsDraft',
      'subscriptionsActive',
      'subscriptionsSuspended',
      'subscriptionsExpired',
      'subscriptionsExpiredInGrace',
      'subscriptionsCanceled',
    ];
    const data = rows.map((r) => [
      r.clientName,
      r.clientSlug,
      r.clientUsersActive,
      r.seats.readWriteBillableUsed,
      r.seats.readWriteBillableLimit,
      r.licenses.readOnly,
      r.licenses.clientBillable,
      r.licenses.externalBillable,
      r.licenses.nonBillable,
      r.licenses.platformInternalActive,
      r.licenses.platformInternalExpired,
      r.licenses.evaluationActive,
      r.licenses.evaluationExpired,
      r.subscriptions.draft,
      r.subscriptions.active,
      r.subscriptions.suspended,
      r.subscriptions.expired,
      r.subscriptions.expiredInGrace,
      r.subscriptions.canceled,
    ]);
    return new StreamableFile(Buffer.from(rowsToCsv(headers, data), 'utf-8'));
  }

  @Get('monthly.csv')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="license-reporting-monthly.csv"')
  async exportMonthlyCsv(
    @Query() query: LicenseReportingMonthlyQueryDto,
  ): Promise<StreamableFile> {
    const series = await this.service.getMonthlySeries(
      {
        clientId: query.clientId,
        licenseBillingMode: query.licenseBillingMode,
        subscriptionStatus: query.subscriptionStatus,
      },
      { from: query.from, to: query.to },
    );

    const headers = [
      'month',
      'readOnly',
      'clientBillable',
      'externalBillable',
      'nonBillable',
      'platformInternalActive',
      'platformInternalExpired',
      'evaluationActive',
      'evaluationExpired',
      'subscriptionsActive',
      'subscriptionsSuspended',
      'subscriptionsExpired',
    ];
    const data = series.points.map((p) => [
      p.month,
      p.licenses.readOnly,
      p.licenses.clientBillable,
      p.licenses.externalBillable,
      p.licenses.nonBillable,
      p.licenses.platformInternalActive,
      p.licenses.platformInternalExpired,
      p.licenses.evaluationActive,
      p.licenses.evaluationExpired,
      p.subscriptions.active,
      p.subscriptions.suspended,
      p.subscriptions.expired,
    ]);
    return new StreamableFile(Buffer.from(rowsToCsv(headers, data), 'utf-8'));
  }
}
