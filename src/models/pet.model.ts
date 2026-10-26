// pet.model.ts
import { DomainError } from '@/helpers/domain.error.js';
import type { PartialDate } from '@/helpers/partial-date.vo.js';
import type { Decimal, Id } from '@/models/types.js';

export class Pet {
  constructor(
    public readonly id: Id,
    public readonly ownerId: Id,
    public name: string,
    public species: string | null = null,
    public dailyLimitGrams: Decimal | null = null,
    public birthYear: number | null = null,
    public birthMonth: number | null = null,
    public birthDay: number | null = null,
  ) {}

  static create(props: {
    id: Id;
    ownerId: Id;
    name: string;
    species?: string | null;
    dailyLimitGrams?: Decimal | null;
  }): Pet {
    return new Pet(
      props.id,
      props.ownerId,
      props.name,
      props.species ?? null,
      props.dailyLimitGrams ?? null,
    );
  }

  rename(name: string): void {
    this.name = name;
  }

  changeSpecies(species: string | null): void {
    this.species = species;
  }

  setDailyLimit(grams: Decimal): void {
    if (grams <= 0) {
      throw new DomainError('Daily limit must be greater than zero');
    }
    this.dailyLimitGrams = grams;
  }

  setBirthDate(
    year: number | null,
    month: number | null,
    day: number | null,
    today: Date,
  ): void {
    if (year === null) {
      this.birthYear = null;
      this.birthMonth = null;
      this.birthDay = null;
      return;
    }
    if (month !== null && (month < 1 || month > 12)) {
      throw new DomainError('Month must be between 1 and 12');
    }
    if (day !== null && (day < 1 || day > 31)) {
      throw new DomainError('Day must be between 1 and 31');
    }

    const candidate = new Date(Date.UTC(year, (month ?? 1) - 1, day ?? 1));
    if (candidate.getTime() > today.getTime()) {
      throw new DomainError('Birth date cannot be in the future');
    }

    this.birthYear = year;
    this.birthMonth = month;
    this.birthDay = day;
  }

  applyBirth(partialDate: PartialDate, today: Date): void {
    this.setBirthDate(
      partialDate.year ?? null,
      partialDate.month ?? null,
      partialDate.day ?? null,
      today,
    );
  }

  formatBirthDate(): string {
    if (this.birthYear === null) {
      return '';
    }
    const year = this.birthYear.toString().padStart(4, '0');
    if (this.birthMonth === null) {
      return year;
    }
    const month = this.birthMonth.toString().padStart(2, '0');
    if (this.birthDay === null) {
      return `${year}-${month}`;
    }
    return `${year}-${month}-${this.birthDay.toString().padStart(2, '0')}`;
  }
}
