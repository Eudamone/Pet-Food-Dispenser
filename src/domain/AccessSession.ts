import { Column, Entity, ForeignKey, PrimaryColumn, Index } from 'typeorm';
import { FeederDevice } from './FeederDevice.js';

export type AccessStatus = 'pending' | 'open' | 'closed' | 'interrupted';

@Entity('access_sessions')
@ForeignKey(() => FeederDevice, ['deviceId'], ['id'], { onDelete: 'RESTRICT' })
@Index(['deviceId', 'accountingDay'])
export class AccessSession {
  @PrimaryColumn({ type: 'varchar', length: 120 })
  readonly id: string;

  @PrimaryColumn('uuid')
  readonly deviceId: string;

  @Column('text')
  readonly tagUid: string;

  @Column('uuid')
  readonly petId: string;

  @Column({ type: 'varchar', length: 10 })
  readonly accountingDay: string;

  private _openedAt: Date | null = null;
  private _closedAt: Date | null = null;
  private _initialGrams: number | null = null;
  private _finalGrams: number | null = null;
  private _measurementValid = false;
  private _status: AccessStatus = 'pending';
  private _issue: string | null = null;

  constructor(
    id: string,
    deviceId: string,
    tagUid: string,
    petId: string,
    accountingDay: string,
  ) {
    if (![id, deviceId, tagUid, petId].every((value) => value.trim()))
      throw new Error(
        'La visita necesita identificador, equipo, tag y mascota.',
      );
    const day = new Date(accountingDay + 'T00:00:00Z');
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(accountingDay) ||
      !Number.isFinite(day.getTime()) ||
      day.toISOString().slice(0, 10) !== accountingDay ||
      day.getUTCFullYear() < 1
    )
      throw new Error(
        'El día debe ser una fecha válida con formato YYYY-MM-DD.',
      );
    this.id = id;
    this.deviceId = deviceId;
    this.tagUid = tagUid;
    this.petId = petId;
    this.accountingDay = accountingDay;
  }

  @Column({ type: 'timestamptz', nullable: true })
  get openedAt(): Date | null {
    return this._openedAt ? new Date(this._openedAt) : null;
  }

  private set openedAt(value: Date | null) {
    this._openedAt = value;
  }
  @Column({ type: 'timestamptz', nullable: true })
  get closedAt(): Date | null {
    return this._closedAt ? new Date(this._closedAt) : null;
  }

  private set closedAt(value: Date | null) {
    this._closedAt = value;
  }
  @Column({ type: 'double precision', nullable: true })
  get initialGrams(): number | null {
    return this._initialGrams;
  }

  private set initialGrams(value: number | null) {
    this._initialGrams = value;
  }
  @Column({ type: 'double precision', nullable: true })
  get finalGrams(): number | null {
    return this._finalGrams;
  }

  private set finalGrams(value: number | null) {
    this._finalGrams = value;
  }
  @Column('boolean')
  get measurementValid(): boolean {
    return this._measurementValid;
  }

  private set measurementValid(value: boolean) {
    this._measurementValid = value;
  }
  @Column('text')
  get status(): AccessStatus {
    return this._status;
  }

  private set status(value: AccessStatus) {
    this._status = value;
  }
  @Column({ type: 'text', nullable: true })
  get issue(): string | null {
    return this._issue;
  }

  private set issue(value: string | null) {
    this._issue = value;
  }

  open(initialGrams: number, at: Date): void {
    if (this._status !== 'pending')
      throw new Error('La visita ya fue iniciada.');
    if (!Number.isFinite(initialGrams) || initialGrams < 0)
      throw new Error('El peso inicial debe ser válido y no negativo.');
    if (!Number.isFinite(at.getTime()))
      throw new Error('La fecha no es válida.');
    this._initialGrams = initialGrams;
    this._openedAt = new Date(at);
    this._status = 'open';
  }

  close(finalGrams: number | null, at: Date | null, tolerance: number): void {
    if (this._status !== 'open') throw new Error('La visita no está abierta.');
    if (!Number.isFinite(tolerance) || tolerance < 0)
      throw new Error('La tolerancia debe ser válida y no negativa.');
    if (finalGrams !== null && (!Number.isFinite(finalGrams) || finalGrams < 0))
      throw new Error('El peso final debe ser válido y no negativo.');
    if (at !== null && (!Number.isFinite(at.getTime()) || at < this._openedAt!))
      throw new Error('El cierre no puede preceder a la apertura.');
    const valid =
      finalGrams !== null && finalGrams <= this._initialGrams! + tolerance;
    this._finalGrams = finalGrams;
    this._closedAt = at ? new Date(at) : null;
    this._measurementValid = valid && this._issue === null;
    this._status = 'closed';
    if (!valid && this._issue === null)
      this._issue = 'Medición final ausente o incoherente.';
  }

  invalidateMeasurement(reason: string): void {
    if (!reason.trim()) throw new Error('Debes indicar el motivo.');
    this._measurementValid = false;
    this._issue = reason.trim();
  }

  markInterrupted(reason: string): void {
    if (this._status !== 'pending' && this._status !== 'open')
      throw new Error('La visita ya finalizó.');
    this.invalidateMeasurement(reason);
    this._status = 'interrupted';
  }

  consumedGrams(): number | null {
    if (!this._measurementValid || this._status !== 'closed') return null;
    return Math.max(0, this._initialGrams! - this._finalGrams!);
  }
}
