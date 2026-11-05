export class FeedingSlot {
  private readonly _days: number[];

  constructor(
    public readonly id: string,
    public readonly time: string,
    days: readonly number[],
    public readonly targetGrams: number,
    public readonly enabled = true,
  ) {
    if (!id.trim()) throw new Error('El horario necesita un identificador.');
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time))
      throw new Error('La hora debe tener el formato HH:mm.');
    if (
      days.length === 0 ||
      new Set(days).size !== days.length ||
      days.some((day) => !Number.isInteger(day) || day < 0 || day > 6)
    )
      throw new Error('Los días deben ser únicos y estar entre 0 y 6.');
    if (!Number.isFinite(targetGrams) || targetGrams <= 0)
      throw new Error('El objetivo debe ser positivo.');
    this._days = [...days];
  }

  get days(): readonly number[] {
    return [...this._days];
  }

  withSchedule(time: string, days: readonly number[]): FeedingSlot {
    return new FeedingSlot(this.id, time, days, this.targetGrams, this.enabled);
  }

  withTarget(targetGrams: number): FeedingSlot {
    return new FeedingSlot(
      this.id,
      this.time,
      this._days,
      targetGrams,
      this.enabled,
    );
  }

  withEnabled(enabled: boolean): FeedingSlot {
    return new FeedingSlot(
      this.id,
      this.time,
      this._days,
      this.targetGrams,
      enabled,
    );
  }

  occursOn(day: number): boolean {
    return this.enabled && this._days.includes(day);
  }
}
