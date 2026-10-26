// daily-consumption.model.ts
import type { LocalDate } from '@/helpers/local-date.vo.js';
import type { AccessSession } from '@/models/access-session.model.js';
import type { Decimal, Id } from '@/models/types.js';

export class DailyConsumption {
  constructor(
    public readonly petId: Id,
    public readonly deviceId: Id,
    public readonly day: LocalDate,
    public readonly measuredGrams: Decimal,
    public readonly unknownSessions: number,
  ) {}

  static fromSessions(
    petId: Id,
    deviceId: Id,
    day: LocalDate,
    sessions: AccessSession[],
  ): DailyConsumption {
    const relevant = sessions.filter(
      (session) => session.petId === petId && session.accountingDay.equals(day),
    );

    let measuredGrams = 0;
    let unknownSessions = 0;

    for (const session of relevant) {
      const consumed = session.consumedGrams();
      if (session.measurementValid && consumed !== null) {
        measuredGrams += consumed;
      } else {
        unknownSessions += 1;
      }
    }

    return new DailyConsumption(petId, deviceId, day, measuredGrams, unknownSessions);
  }

  hasCompleteMeasurements(): boolean {
    return this.unknownSessions === 0;
  }

  measuredTotal(): Decimal {
    return this.measuredGrams;
  }
}
