// feeding-slot.model.ts
import { DomainError } from '@/helpers/domain.error.js';
import type { Day } from '@/helpers/local-date.vo.js';
import type { LocalTime } from '@/helpers/local-time.vo.js';
import type { Decimal, Id } from '@/models/types.js';

export class FeedingSlot {
  constructor(
    public readonly id: Id,
    public readonly time: LocalTime,
    public readonly days: Day[],
    public readonly targetGrams: Decimal,
    public readonly enabled: boolean,
  ) {}

  static create(props: {
    id: Id;
    time: LocalTime;
    days: Day[];
    targetGrams: Decimal;
    enabled?: boolean;
  }): FeedingSlot {
    if (props.targetGrams <= 0) {
      throw new DomainError('Target grams must be greater than zero');
    }
    return new FeedingSlot(
      props.id,
      props.time,
      [...props.days],
      props.targetGrams,
      props.enabled ?? true,
    );
  }

  withSchedule(time: LocalTime, days: Day[]): FeedingSlot {
    return new FeedingSlot(this.id, time, [...days], this.targetGrams, this.enabled);
  }

  withTarget(targetGrams: Decimal): FeedingSlot {
    return new FeedingSlot(this.id, this.time, [...this.days], targetGrams, this.enabled);
  }

  withEnabled(enabled: boolean): FeedingSlot {
    return new FeedingSlot(this.id, this.time, [...this.days], this.targetGrams, enabled);
  }

  occursOn(day: Day): boolean {
    return this.days.includes(day);
  }
}
