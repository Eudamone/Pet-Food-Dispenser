// local-date.vo.ts
// Fecha calendario (día de contabilidad) y día de la semana.

import { DomainError } from '@/helpers/domain.error.js';

export enum Day {
  MONDAY = 'MONDAY',
  TUESDAY = 'TUESDAY',
  WEDNESDAY = 'WEDNESDAY',
  THURSDAY = 'THURSDAY',
  FRIDAY = 'FRIDAY',
  SATURDAY = 'SATURDAY',
  SUNDAY = 'SUNDAY',
}

const DAY_BY_UTC_INDEX: Day[] = [
  Day.SUNDAY,
  Day.MONDAY,
  Day.TUESDAY,
  Day.WEDNESDAY,
  Day.THURSDAY,
  Day.FRIDAY,
  Day.SATURDAY,
];

export class LocalDate {
  private constructor(
    public readonly year: number,
    public readonly month: number,
    public readonly day: number,
  ) {}

  static create(year: number, month: number, day: number): LocalDate {
    if (month < 1 || month > 12) {
      throw new DomainError('Month must be between 1 and 12');
    }
    if (day < 1 || day > 31) {
      throw new DomainError('Day must be between 1 and 31');
    }
    return new LocalDate(year, month, day);
  }

  static parse(value: string): LocalDate {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (!match) {
      throw new DomainError(`Invalid local date: ${value}`);
    }
    return LocalDate.create(Number(match[1]), Number(match[2]), Number(match[3]));
  }

  static fromDate(date: Date): LocalDate {
    return LocalDate.create(
      date.getUTCFullYear(),
      date.getUTCMonth() + 1,
      date.getUTCDate(),
    );
  }

  static today(now: Date = new Date()): LocalDate {
    return LocalDate.fromDate(now);
  }

  toString(): string {
    return `${this.year.toString().padStart(4, '0')}-${this.month
      .toString()
      .padStart(2, '0')}-${this.day.toString().padStart(2, '0')}`;
  }

  toDate(): Date {
    return new Date(Date.UTC(this.year, this.month - 1, this.day));
  }

  dayOfWeek(): Day {
    return DAY_BY_UTC_INDEX[this.toDate().getUTCDay()];
  }

  equals(other: LocalDate): boolean {
    return (
      this.year === other.year && this.month === other.month && this.day === other.day
    );
  }

  isBefore(other: LocalDate): boolean {
    return this.toDate().getTime() < other.toDate().getTime();
  }

  isAfter(other: LocalDate): boolean {
    return this.toDate().getTime() > other.toDate().getTime();
  }

  toJSON(): string {
    return this.toString();
  }
}
