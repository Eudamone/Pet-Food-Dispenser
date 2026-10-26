// dispensing-record.model.ts
import type { Decimal, Id, Instant } from '@/models/types.js';
import { DispensingSource, DispensingStatus } from '@/models/types.js';

export class DispensingRecord {
  constructor(
    public readonly id: Id,
    public readonly deviceId: Id,
    public readonly slotId: Id | null,
    public readonly source: DispensingSource,
    public readonly targetGrams: Decimal,
    public initialGrams: Decimal | null = null,
    public finalGrams: Decimal | null = null,
    public measurementValid = false,
    public status: DispensingStatus = DispensingStatus.PENDING,
    public startedAt: Instant | null = null,
    public finishedAt: Instant | null = null,
    public reason: string | null = null,
  ) {}

  static create(props: {
    id: Id;
    deviceId: Id;
    slotId?: Id | null;
    source: DispensingSource;
    targetGrams: Decimal;
  }): DispensingRecord {
    return new DispensingRecord(
      props.id,
      props.deviceId,
      props.slotId ?? null,
      props.source,
      props.targetGrams,
    );
  }

  markStarted(initialGrams: Decimal, at: Instant): void {
    this.initialGrams = initialGrams;
    this.startedAt = at;
    this.status = DispensingStatus.IN_PROGRESS;
  }

  markCompleted(finalGrams: Decimal, at: Instant, tolerance: Decimal): void {
    this.finalGrams = finalGrams;
    this.finishedAt = at;
    this.status = DispensingStatus.COMPLETED;
    const dispensed = this.dispensedGrams();
    this.measurementValid =
      dispensed !== null && Math.abs(dispensed - this.targetGrams) <= tolerance;
  }

  markSkipped(reason: string, at: Instant | null): void {
    this.reason = reason;
    this.finishedAt = at ?? this.startedAt;
    this.status = DispensingStatus.SKIPPED;
  }

  markFailed(reason: string, finalGrams: Decimal | null, at: Instant | null): void {
    this.reason = reason;
    this.finalGrams = finalGrams;
    this.finishedAt = at ?? this.startedAt;
    this.measurementValid = false;
    this.status = DispensingStatus.FAILED;
  }

  markInterrupted(reason: string, at: Instant | null): void {
    this.reason = reason;
    this.finishedAt = at ?? this.startedAt;
    this.measurementValid = false;
    this.status = DispensingStatus.INTERRUPTED;
  }

  dispensedGrams(): Decimal | null {
    if (this.initialGrams === null || this.finalGrams === null) {
      return null;
    }
    return this.finalGrams - this.initialGrams;
  }
}
