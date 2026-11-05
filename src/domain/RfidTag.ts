export class RfidTag {
  private readonly _uid: string;
  private readonly _ownerId: string;

  private _petId: string | null = null;

  private _active: boolean = true;

  constructor(uid: string, ownerId: string) {
    const cleanUid = uid.trim().toUpperCase();
    const cleanOwnerId = ownerId.trim();

    if (cleanUid === '') {
      throw new Error('El tag necesita un UID.');
    }

    if (cleanOwnerId === '') {
      throw new Error('El tag necesita un propietario.');
    }

    this._uid = cleanUid;
    this._ownerId = cleanOwnerId;
  }

  get uid(): string {
    return this._uid;
  }

  get ownerId(): string {
    return this._ownerId;
  }

  get petId(): string | null {
    return this._petId;
  }

  get active(): boolean {
    return this._active;
  }

  assignTo(petId: string): void {
    const cleanPetId = petId.trim();

    if (cleanPetId === '') {
      throw new Error('Debes indicar una mascota.');
    }

    if (this._petId !== null && this._petId !== cleanPetId) {
      throw new Error('Desasigna el tag antes de asignarlo a otra mascota.');
    }
    this._petId = cleanPetId;
  }

  unassign(): void {
    this._petId = null;
  }

  activate(): void {
    this._active = true;
  }

  deactivate(): void {
    this._active = false;
  }

}
