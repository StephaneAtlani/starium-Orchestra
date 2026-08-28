import { Injectable } from '@nestjs/common';
import { BudgetLandingReadService } from '../budget-landing/budget-landing-read.service';
import { ListForecastEnvelopeLinesQueryDto } from './dto/list-forecast-envelope-lines.query.dto';
import type {
  BudgetForecastResponse,
  EnvelopeForecastLinesResponse,
  EnvelopeForecastResponse,
} from './types/budget-forecast.types';

/**
 * @deprecated Utiliser BudgetLandingReadService — alias de transition RFC-BUD-040.
 */
@Injectable()
export class BudgetForecastService {
  constructor(private readonly landingRead: BudgetLandingReadService) {}

  getBudgetForecast(
    clientId: string,
    budgetId: string,
    actorUserId?: string,
  ): Promise<BudgetForecastResponse> {
    return this.landingRead.getBudgetLanding(clientId, budgetId, actorUserId);
  }

  getEnvelopeForecast(
    clientId: string,
    envelopeId: string,
    actorUserId?: string,
  ): Promise<EnvelopeForecastResponse> {
    return this.landingRead.getEnvelopeLanding(
      clientId,
      envelopeId,
      actorUserId,
    );
  }

  listEnvelopeForecastLines(
    clientId: string,
    envelopeId: string,
    query: ListForecastEnvelopeLinesQueryDto,
    actorUserId?: string,
  ): Promise<EnvelopeForecastLinesResponse> {
    return this.landingRead.listEnvelopeLandingLines(
      clientId,
      envelopeId,
      query,
      actorUserId,
    );
  }
}
