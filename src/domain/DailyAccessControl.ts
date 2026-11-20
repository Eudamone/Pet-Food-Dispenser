import { DailyConsumption } from './DailyConsumption.js';

export type BudgetStatus =
  | 'available'
  | 'limit_reached'
  | 'limit_not_configured'
  | 'incomplete_measurements'
  | 'invalid_context';
export type BudgetResult = {
  status: BudgetStatus;
  remainingGrams: number | null;
};

export class DailyAccessControl {
  constructor(
    public readonly deviceId: string,
    public readonly day: string,
  ) {
    if (!deviceId.trim()) throw new Error('Debes indicar el equipo.');
    const date = new Date(day + 'T00:00:00Z');
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(day) ||
      !Number.isFinite(date.getTime()) ||
      date.toISOString().slice(0, 10) !== day ||
      date.getUTCFullYear() < 1
    )
      throw new Error(
        'El día debe ser una fecha válida con formato YYYY-MM-DD.',
      );
  }

  remainingGrams(
    petId: string,
    dailyLimitGrams: number | null,
    consumption: DailyConsumption,
  ): { value: number | null; reason: BudgetStatus | null } {
    const result = this.evaluate(petId, dailyLimitGrams, consumption);
    return {
      value: result.remainingGrams,
      reason: result.remainingGrams === null ? result.status : null,
    };
  }

  evaluate(
    petId: string,
    dailyLimitGrams: number | null,
    consumption: DailyConsumption,
  ): BudgetResult {
    if (
      consumption.petId !== petId ||
      consumption.deviceId !== this.deviceId ||
      consumption.day !== this.day
    )
      return { status: 'invalid_context', remainingGrams: null };
    if (
      dailyLimitGrams === null ||
      !Number.isFinite(dailyLimitGrams) ||
      dailyLimitGrams <= 0
    )
      return { status: 'limit_not_configured', remainingGrams: null };
    if (!consumption.hasCompleteMeasurements())
      return { status: 'incomplete_measurements', remainingGrams: null };
    const remainingGrams = Math.max(
      0,
      dailyLimitGrams - consumption.measuredTotal(),
    );
    return {
      status: remainingGrams > 0 ? 'available' : 'limit_reached',
      remainingGrams,
    };
  }
}
