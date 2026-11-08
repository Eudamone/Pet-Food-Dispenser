import { Column, Entity, PrimaryColumn, ForeignKey } from 'typeorm';
import { User } from './User.js';

export type GateState = 'unknown' | 'open' | 'closed' | 'moving' | 'blocked';

@Entity('feeders')
@ForeignKey(() => User, ['ownerId'], ['id'], { onDelete: 'RESTRICT' })
export class FeederDevice {
  private _id: string;
  private _ownerId: string;
  private _maxBowlGrams: number;
  private _name: string;
  private _authorizedPetIds = new Set<string>();
  private _desiredRevision = 0;
  private _appliedRevision = 0;
  private _lastSeenAt: Date | null = null;
  private _lastBowlGrams: number | null = null;
  private _gateState: GateState = 'unknown';
  private _lastFault: string | null = null;

  constructor(id: string, ownerId: string, name: string, maxBowlGrams: number) {
    if (!id.trim() || !ownerId.trim())
      throw new Error('El equipo necesita ID y propietario.');
    if (!Number.isFinite(maxBowlGrams) || maxBowlGrams <= 0) {
      throw new Error('La capacidad debe ser un número positivo.');
    }
    this._id = id.trim();
    this._ownerId = ownerId.trim();
    this._maxBowlGrams = maxBowlGrams;
    this._name = '';
    this.rename(name);
  }

  @PrimaryColumn('uuid')
  get id(): string {
    return this._id;
  }

  private set id(value: string) {
    this._id = value;
  }
  @Column('uuid')
  get ownerId(): string {
    return this._ownerId;
  }

  private set ownerId(value: string) {
    this._ownerId = value;
  }
  @Column('varchar')
  get name(): string {
    return this._name;
  }

  private set name(value: string) {
    this._name = value;
  }
  @Column('double precision')
  get maxBowlGrams(): number {
    return this._maxBowlGrams;
  }

  private set maxBowlGrams(value: number) {
    this._maxBowlGrams = value;
  }
  @Column({
    type: 'jsonb',
    default: () => "'[]'::jsonb",
    transformer: {
      to: (ids: ReadonlySet<string>) => [...ids],
      from: (ids: string[]) => new Set(ids),
    },
  })
  get authorizedPetIds(): ReadonlySet<string> {
    return new Set(this._authorizedPetIds);
  }

  private set authorizedPetIds(value: ReadonlySet<string>) {
    this._authorizedPetIds = new Set(value);
  }
  @Column({ type: 'int', default: 0 })
  get desiredRevision(): number {
    return this._desiredRevision;
  }

  private set desiredRevision(value: number) {
    this._desiredRevision = value;
  }
  @Column({ type: 'int', default: 0 })
  get appliedRevision(): number {
    return this._appliedRevision;
  }

  private set appliedRevision(value: number) {
    this._appliedRevision = value;
  }
  @Column({ type: 'timestamptz', nullable: true })
  get lastSeenAt(): Date | null {
    return this._lastSeenAt ? new Date(this._lastSeenAt) : null;
  }

  private set lastSeenAt(value: Date | null) {
    this._lastSeenAt = value;
  }
  @Column({ type: 'double precision', nullable: true })
  get lastBowlGrams(): number | null {
    return this._lastBowlGrams;
  }

  private set lastBowlGrams(value: number | null) {
    this._lastBowlGrams = value;
  }
  @Column({ type: 'text', default: 'unknown' })
  get gateState(): GateState {
    return this._gateState;
  }

  private set gateState(value: GateState) {
    this._gateState = value;
  }
  @Column({ type: 'text', nullable: true })
  get lastFault(): string | null {
    return this._lastFault;
  }

  private set lastFault(value: string | null) {
    this._lastFault = value;
  }

  rename(name: string): void {
    if (!name.trim())
      throw new Error('El nombre del equipo no puede estar vacío.');
    this._name = name.trim();
  }

  addAuthorizedPet(petId: string): boolean {
    if (!petId.trim()) throw new Error('Debes indicar una mascota.');
    const id = petId.trim();
    const changed = !this._authorizedPetIds.has(id);
    this._authorizedPetIds.add(id);
    return changed;
  }

  removeAuthorizedPet(petId: string): boolean {
    return this._authorizedPetIds.delete(petId);
  }

  isPetAuthorized(petId: string): boolean {
    return this._authorizedPetIds.has(petId);
  }

  markRequested(revision: number): void {
    if (!Number.isSafeInteger(revision) || revision <= this._desiredRevision) {
      throw new Error(
        'La nueva revisión debe ser un entero mayor que la anterior.',
      );
    }
    this._desiredRevision = revision;
  }

  confirmApplied(revision: number): void {
    if (
      !Number.isSafeInteger(revision) ||
      revision < 0 ||
      revision > this._desiredRevision
    ) {
      throw new Error(
        'La revisión no corresponde a una configuración solicitada.',
      );
    }
    this._appliedRevision = Math.max(this._appliedRevision, revision);
  }

  hasPendingConfiguration(): boolean {
    return this._desiredRevision > this._appliedRevision;
  }

  updateObservedState(
    at: Date,
    weight: number | null,
    gate: GateState,
    fault: string | null,
  ): void {
    if (!(at instanceof Date) || !Number.isFinite(at.getTime()))
      throw new Error('Fecha inválida.');
    if (weight !== null && (!Number.isFinite(weight) || weight < 0))
      throw new Error('Peso inválido.');
    if (!['unknown', 'open', 'closed', 'moving', 'blocked'].includes(gate))
      throw new Error('Estado de compuerta inválido.');
    if (this._lastSeenAt && at < this._lastSeenAt) return;
    this._lastSeenAt = new Date(at);
    this._lastBowlGrams = weight;
    this._gateState = gate;
    this._lastFault = fault?.trim() || null;
  }
}
