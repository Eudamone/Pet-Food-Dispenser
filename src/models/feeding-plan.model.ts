// feeding-plan.model.ts
import { DomainError } from '@/helpers/domain.error.js';
import type { Decimal, Id } from '@/models/types.js';
import type { FeedingSlot } from '@/models/feeding-slot.model.js';

export class FeedingPlan {
  constructor(
    public readonly id: Id,
    public readonly deviceId: Id,
    public slots: FeedingSlot[],
    public enabled: boolean,
    public maxDailyDispensedGrams: Decimal,
  ) {}

  static create(props: {
    id: Id;
    deviceId: Id;
    maxDailyDispensedGrams: Decimal;
    enabled?: boolean;
    slots?: FeedingSlot[];
  }): FeedingPlan {
    return new FeedingPlan(
      props.id,
      props.deviceId,
      props.slots ?? [],
      props.enabled ?? false,
      props.maxDailyDispensedGrams,
    );
  }

  addSlot(slot: FeedingSlot, maxBowlGrams: Decimal): void {
    if (this.slots.some((current) => current.id === slot.id)) {
      throw new DomainError(`Slot ${slot.id} already exists`);
    }
    this.assertSlotFits(slot, maxBowlGrams);
    this.slots.push(slot);
  }

  replaceSlot(slot: FeedingSlot, maxBowlGrams: Decimal): void {
    const index = this.slots.findIndex((current) => current.id === slot.id);
    if (index < 0) {
      throw new DomainError(`Slot ${slot.id} does not exist`);
    }
    this.assertSlotFits(slot, maxBowlGrams);
    this.slots[index] = slot;
  }

  removeSlot(slotId: Id): void {
    const index = this.slots.findIndex((current) => current.id === slotId);
    if (index < 0) {
      throw new DomainError(`Slot ${slotId} does not exist`);
    }
    this.slots.splice(index, 1);
  }

  setMaxDailyDispensed(grams: Decimal): void {
    if (grams <= 0) {
      throw new DomainError('Max daily dispensed grams must be greater than zero');
    }
    this.maxDailyDispensedGrams = grams;
  }

  validate(maxBowlGrams: Decimal): void {
    this.slots.forEach((slot) => this.assertSlotFits(slot, maxBowlGrams));

    const enabledTotal = this.slots
      .filter((slot) => slot.enabled)
      .reduce((total, slot) => total + slot.targetGrams, 0);

    if (enabledTotal > this.maxDailyDispensedGrams) {
      throw new DomainError(
        'Enabled slots exceed the max daily dispensed grams of the plan',
      );
    }
  }

  enableScheduling(maxBowlGrams: Decimal): void {
    this.validate(maxBowlGrams);
    this.enabled = true;
  }

  pause(): void {
    this.enabled = false;
  }

  private assertSlotFits(slot: FeedingSlot, maxBowlGrams: Decimal): void {
    if (slot.targetGrams > maxBowlGrams) {
      throw new DomainError(
        `Slot ${slot.id} target exceeds the max bowl capacity of ${maxBowlGrams} grams`,
      );
    }
  }
}
