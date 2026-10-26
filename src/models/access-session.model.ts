// access-session.model.ts
import type { LocalDate } from '@/helpers/local-date.vo.js';
import type { Decimal, Id, Instant } from '@/models/types.js';
import { AccessStatus } from '@/models/types.js';

export class AccessSession {
  constructor(
    public readonly id: Id,
    public readonly deviceId: Id,
    public readonly tagUid: string,
    public readonly petId: Id,
    public readonly accountingDay: LocalDate,
    public openedAt: Instant | null = null,
    public closedAt: Instant | null = null,
    public initialGrams: Decimal | null = null,
    public finalGrams: Decimal | null = null,
    public measurementValid = false,
    public status: AccessStatus = AccessStatus.OPEN,
    public issue: string | null = null,
  ) {}

  static create(props: {
    id: Id;
    deviceId: Id;
    tagUid: string;
    petId: Id;
    accountingDay: LocalDate;
  }): AccessSession {
    return new AccessSession(
      props.id,
      props.deviceId,
      props.tagUid,
      props.petId,
      props.accountingDay,
    );
  }

  open(initialGrams: Decimal, at: Instant): void {
    this.initialGrams = initialGrams;
    this.openedAt = at;
    this.status = AccessStatus.OPEN;
  }

  close(finalGrams: Decimal | null, at: Instant | null, tolerance: Decimal): void {
    this.finalGrams = finalGrams;
    this.closedAt = at ?? this.openedAt;
    this.status = AccessStatus.CLOSED;

    const consumed = this.consumedGrams();
    if (consumed === null) {
      this.measurementValid = false;
      this.issue = this.issue ?? 'MISSING_MEASUREMENT';
      return;
    }
    this.measurementValid = consumed >= -tolerance;
  }

  invalidateMeasurement(reason: string): void {
    this.measurementValid = false;
    this.issue = reason;
  }

  markInterrupted(reason: string): void {
    this.status = AccessStatus.INTERRUPTED;
    this.measurementValid = false;
    this.issue = reason;
  }

  consumedGrams(): Decimal | null {
    if (this.initialGrams === null || this.finalGrams === null) {
      return null;
    }
    return this.initialGrams - this.finalGrams;
  }
}
