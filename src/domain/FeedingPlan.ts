import { FeedingSlot } from './FeedingSlot.js';

export class FeedingPlan {
  private _slots: FeedingSlot[] = [];
  private _enabled = false;
  private _maxDailyDispensedGrams: number;

  constructor(
    public readonly id: string,
    public readonly deviceId: string,
    maxDailyDispensedGrams: number,
  ) {
    if (!id.trim() || !deviceId.trim())
      throw new Error('El plan necesita identificador y equipo.');
    this.setMaxDailyDispensed(maxDailyDispensedGrams);
  }

  get slots(): readonly FeedingSlot[] {
    return [...this._slots];
  }
  get enabled(): boolean {
    return this._enabled;
  }
  get maxDailyDispensedGrams(): number {
    return this._maxDailyDispensedGrams;
  }

  addSlot(slot: FeedingSlot, maxBowlGrams: number): void {
    const slots = [...this._slots, slot];
    this.validateSlots(slots, maxBowlGrams, this._enabled);
    this._slots = slots;
  }

  replaceSlot(slot: FeedingSlot, maxBowlGrams: number): void {
    if (!this._slots.some((current) => current.id === slot.id))
      throw new Error('El horario no pertenece al plan.');
    const slots = this._slots.map((current) =>
      current.id === slot.id ? slot : current,
    );
    this.validateSlots(slots, maxBowlGrams, this._enabled);
    this._slots = slots;
  }

  removeSlot(slotId: string): void {
    this._slots = this._slots.filter((slot) => slot.id !== slotId);
    if (!this._slots.some((slot) => slot.enabled)) this.pause();
  }

  setMaxDailyDispensed(grams: number): void {
    if (!Number.isFinite(grams) || grams <= 0)
      throw new Error('El máximo diario debe ser positivo.');
    this._maxDailyDispensedGrams = grams;
  }

  validate(maxBowlGrams: number): void {
    this.validateSlots(this._slots, maxBowlGrams, this._enabled);
  }

  enableScheduling(maxBowlGrams: number): void {
    this.validateSlots(this._slots, maxBowlGrams, true);
    this._enabled = true;
  }

  pause(): void {
    this._enabled = false;
  }

  private validateSlots(
    slots: readonly FeedingSlot[],
    capacity: number,
    enabled: boolean,
  ): void {
    if (!Number.isFinite(capacity) || capacity <= 0)
      throw new Error('La capacidad debe ser positiva.');
    const ids = new Set<string>();
    const schedules = new Set<string>();
    for (const slot of slots) {
      if (ids.has(slot.id)) throw new Error('El horario ya pertenece al plan.');
      ids.add(slot.id);
      if (slot.targetGrams > capacity)
        throw new Error('El objetivo supera la capacidad del plato.');
      if (!slot.enabled) continue;
      for (const day of slot.days) {
        const key = `${day}-${slot.time}`;
        if (schedules.has(key)) throw new Error('Hay horarios que coinciden.');
        schedules.add(key);
      }
    }
    if (enabled && schedules.size === 0)
      throw new Error('El plan necesita al menos un horario habilitado.');
  }
}
