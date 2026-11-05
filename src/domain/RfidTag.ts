import { Column, Entity, PrimaryColumn, ForeignKey } from 'typeorm';
import { User } from './User.js';
import { Pet } from './Pet.js';

@Entity('rfid_tags')
@ForeignKey(() => User, ['ownerId'], ['id'], { onDelete: 'RESTRICT' })
@ForeignKey(() => Pet, ['petId'], ['id'], { onDelete: 'SET NULL' })
export class RfidTag {
  private _uid: string;
  private _ownerId: string;

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

  @PrimaryColumn('text')
  get uid(): string {
    return this._uid;
  }

  private set uid(value: string) {
    this._uid = value;
  }

  @Column('uuid')
  get ownerId(): string {
    return this._ownerId;
  }

  private set ownerId(value: string) {
    this._ownerId = value;
  }

  @Column({ type: 'uuid', nullable: true, unique: true })
  get petId(): string | null {
    return this._petId;
  }

  private set petId(value: string | null) {
    this._petId = value;
  }

  @Column({ type: 'boolean', default: true })
  get active(): boolean {
    return this._active;
  }

  private set active(value: boolean) {
    this._active = value;
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
