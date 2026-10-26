// partial-date.vo.ts
// Fecha parcial: el usuario puede registrar solo año, año+mes o la fecha completa.

import { DomainError } from '@/helpers/domain.error.js';

export class PartialDate {
  constructor(
    public readonly year?: number,
    public readonly month?: number,
    public readonly day?: number,
  ) {}

  static empty(): PartialDate {
    return new PartialDate();
  }

  static create(year?: number, month?: number, day?: number): PartialDate {
    if (month !== undefined && year === undefined) {
      throw new DomainError('Cannot provide a month without a year');
    }
    if (day !== undefined && (year === undefined || month === undefined)) {
      throw new DomainError('Cannot provide a day without a year and a month');
    }
    return new PartialDate(year, month, day);
  }

  get isEmpty(): boolean {
    return this.year === undefined && this.month === undefined && this.day === undefined;
  }

  get isComplete(): boolean {
    return (
      this.year !== undefined && this.month !== undefined && this.day !== undefined
    );
  }
}
