export class Pet {
  private readonly _id: string;
  private readonly _ownerId: string;

  private _name: string;

  private _species: string | null = null;
  private _dailyLimitGrams: number | null = null;

  private _birthYear: number | null = null;
  private _birthMonth: number | null = null;
  private _birthDay: number | null = null;

  constructor(id: string, ownerId: string, name: string) {
    const cleanId = id.trim();
    const cleanOwnerId = ownerId.trim();

    if (cleanId === '') {
      throw new Error('La mascota necesita un identificador.');
    }

    if (cleanOwnerId === '') {
      throw new Error('La mascota necesita un propietario.');
    }

    this._id = cleanId;

    this._ownerId = cleanOwnerId;

    this._name = Pet.validateName(name);
  }

  get id(): string {
    return this._id;
  }

  get ownerId(): string {
    return this._ownerId;
  }

  get name(): string {
    return this._name;
  }

  get species(): string | null {
    return this._species;
  }

  get dailyLimitGrams(): number | null {
    return this._dailyLimitGrams;
  }

  get birthYear(): number | null {
    return this._birthYear;
  }

  get birthMonth(): number | null {
    return this._birthMonth;
  }

  get birthDay(): number | null {
    return this._birthDay;
  }

  rename(name: string): void {
    this._name = Pet.validateName(name);
  }

  changeSpecies(species: string | null): void {
    if (species === null) {
      this._species = null;
      return;
    }

    const cleanSpecies = species.trim();

    if (cleanSpecies === '') {
      throw new Error('La especie no puede ser un texto vacío.');
    }

    this._species = cleanSpecies;
  }

  setDailyLimit(grams: number): void {
    if (!Number.isFinite(grams) || grams <= 0) {
      throw new Error(
        'El máximo diario debe ser un número finito mayor que cero.',
      );
    }
    this._dailyLimitGrams = grams;
  }

  setBirthDate(
    year: number | null,
    month: number | null,
    day: number | null,
    today: Date,
  ): void {
    if (!(today instanceof Date) || !Number.isFinite(today.getTime())) {
      throw new Error('La fecha actual no es válida.');
    }

    if (year === null && (month !== null || day !== null)) {
      throw new Error('Debes indicar el año.');
    }

    if (month === null && day !== null) {
      throw new Error('Debes indicar el mes antes del día.');
    }

    if (year !== null) {
      if (!Number.isInteger(year) || year < 1 || year > 9999) {
        throw new Error('El año no es válido.');
      }

      if (
        month !== null &&
        (!Number.isInteger(month) || month < 1 || month > 12)
      ) {
        throw new Error('El mes debe estar entre 1 y 12.');
      }

      if (day !== null && (!Number.isInteger(day) || day < 1 || day > 31)) {
        throw new Error('El día no es válido.');
      }

      const firstMonth = month ?? 1;
      const firstDay = day ?? 1;

      const candidate = new Date(0);
      candidate.setUTCHours(0, 0, 0, 0);

      candidate.setUTCFullYear(year, firstMonth - 1, firstDay);

      if (
        candidate.getUTCFullYear() !== year ||
        candidate.getUTCMonth() + 1 !== firstMonth ||
        candidate.getUTCDate() !== firstDay
      ) {
        throw new Error('La fecha de nacimiento no existe.');
      }

      const birthKey = year * 10000 + firstMonth * 100 + firstDay;

      const todayKey =
        today.getFullYear() * 10000 +
        (today.getMonth() + 1) * 100 +
        today.getDate();

      if (birthKey > todayKey) {
        throw new Error('El nacimiento no puede estar en el futuro.');
      }
    }

    this._birthYear = year;
    this._birthMonth = month;
    this._birthDay = day;
  }

  formatBirthDate(): string {
    if (this._birthYear === null) {
      return 'Desconocida';
    }

    const year = String(this._birthYear).padStart(4, '0');

    if (this._birthMonth === null) {
      return year;
    }

    const month = String(this._birthMonth).padStart(2, '0');

    if (this._birthDay === null) {
      return `${month}/${year}`;
    }

    const day = String(this._birthDay).padStart(2, '0');

    return `${day}/${month}/${year}`;
  }

  private static validateName(name: string): string {
    const cleanName = name.trim();

    if (cleanName === '') {
      throw new Error('El nombre de la mascota no puede estar vacío.');
    }

    return cleanName;
  }

}
