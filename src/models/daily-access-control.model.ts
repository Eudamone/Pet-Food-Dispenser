// daily-access-control.model.ts
import { Result } from '@/helpers/result.js';
import type { LocalDate } from '@/helpers/local-date.vo.js';
import type { BudgetResult, Decimal, Id } from '@/models/types.js';
import type { DailyConsumption } from '@/models/daily-consumption.model.js';

// Control de acceso diario: decide si un pet puede comer según su límite y consumo.
export class DailyAccessControl {
  constructor(
    public readonly deviceId: Id,
    public readonly day: LocalDate,
  ) {}

  remainingGrams(
    petId: Id,
    dailyLimitGrams: Decimal | null,
    consumption: DailyConsumption,
  ): Result<Decimal> {
    void petId;
    if (!consumption.hasCompleteMeasurements()) {
      return Result.fail('Consumption has incomplete measurements');
    }
    if (dailyLimitGrams === null) {
      return Result.fail('Pet has no daily limit configured');
    }
    return Result.ok(dailyLimitGrams - consumption.measuredTotal());
  }

  evaluate(
    petId: Id,
    dailyLimitGrams: Decimal | null,
    consumption: DailyConsumption,
  ): BudgetResult {
    void petId;
    if (!consumption.hasCompleteMeasurements()) {
      return { allowed: false, remainingGrams: null, reason: 'INCOMPLETE_MEASUREMENTS' };
    }
    if (dailyLimitGrams === null) {
      return { allowed: true, remainingGrams: null, reason: 'NO_DAILY_LIMIT' };
    }

    const remaining = dailyLimitGrams - consumption.measuredTotal();
    return {
      allowed: remaining > 0,
      remainingGrams: remaining,
      reason: remaining > 0 ? undefined : 'DAILY_LIMIT_REACHED',
    };
  }
}
