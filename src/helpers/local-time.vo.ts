// local-time.vo.ts
// Hora local (sin fecha), usada por los horarios de alimentación.

import { DomainError } from '@/helpers/domain.error.js';

export class LocalTime {
  private constructor(
    public readonly hour: number,
    public readonly minute: number,
  ) {}

  static create(hour: number, minute: number): LocalTime {
    if (hour < 0 || hour > 23) {
      throw new DomainError('Hour must be between 0 and 23');
    }
    if (minute < 0 || minute > 59) {
      throw new DomainError('Minute must be between 0 and 59');
    }
    return new LocalTime(hour, minute);
  }

  static parse(value: string): LocalTime {
    const match = /^(\d{2}):(\d{2})$/.exec(value);
    if (!match) {
      throw new DomainError(`Invalid local time: ${value}`);
    }
    return LocalTime.create(Number(match[1]), Number(match[2]));
  }

  toString(): string {
    return `${this.hour.toString().padStart(2, '0')}:${this.minute
      .toString()
      .padStart(2, '0')}`;
  }

  equals(other: LocalTime): boolean {
    return this.hour === other.hour && this.minute === other.minute;
  }

  toJSON(): string {
    return this.toString();
  }
}
