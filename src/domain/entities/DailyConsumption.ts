import { AccessSession } from './AccessSession.js';

export class DailyConsumption {
  private constructor(
    public readonly petId: string,
    public readonly deviceId: string,
    public readonly day: string,
    public readonly measuredGrams: number,
    public readonly unknownSessions: number,
  ) {}

  static fromSessions(
    petId: string,
    deviceId: string,
    day: string,
    sessions: readonly AccessSession[],
  ): DailyConsumption {
    if (!petId.trim() || !deviceId.trim())
      throw new Error('Faltan mascota o equipo.');
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
    const unique = new Map<string, AccessSession>();
    for (const session of sessions) unique.set(session.id, session);
    let measuredGrams = 0;
    let unknownSessions = 0;
    for (const session of unique.values()) {
      if (
        session.petId !== petId ||
        session.deviceId !== deviceId ||
        session.accountingDay !== day
      )
        continue;
      const consumed = session.consumedGrams();
      if (consumed === null) unknownSessions++;
      else measuredGrams += consumed;
    }
    return new DailyConsumption(
      petId,
      deviceId,
      day,
      measuredGrams,
      unknownSessions,
    );
  }

  hasCompleteMeasurements(): boolean {
    return this.unknownSessions === 0;
  }
  measuredTotal(): number {
    return this.measuredGrams;
  }
}
