import { Injectable } from '@nestjs/common';

@Injectable()
export class AlertsTriggerService {
  async evaluateStrategicVisionAlerts(clientId: string): Promise<{ clientId: string; evaluated: number }> {
    return { clientId, evaluated: 0 };
  }

  async evaluateBudgetAlerts(clientId: string): Promise<{ clientId: string; evaluated: number }> {
    return { clientId, evaluated: 0 };
  }

  async evaluateProjectAlerts(clientId: string): Promise<{ clientId: string; evaluated: number }> {
    return { clientId, evaluated: 0 };
  }
}
