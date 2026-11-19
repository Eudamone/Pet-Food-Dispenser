export type AccessStatus = 'pending' | 'open' | 'closed' | 'interrupted';

export class AccessSession {
  readonly id: string;

  readonly deviceId: string;

  readonly tagUid: string;

  readonly petId: string;

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

  /**
   * Reconstituye una visita desde el almacén (persistencia) respetando el
   * estado ya guardado, sin reproducir transiciones que dependen de
   * reglas de negocio no almacenadas (p. ej. la tolerancia de cierre).
   */
  static restore(props: {
    id: string;
    deviceId: string;
    tagUid: string;
    petId: string;
    accountingDay: string;
    openedAt: Date | null;
    closedAt: Date | null;
    initialGrams: number | null;
    finalGrams: number | null;
    measurementValid: boolean;
    status: AccessStatus;
    issue: string | null;
  }): AccessSession {
    const session = new AccessSession(
      props.id,
      props.deviceId,
      props.tagUid,
      props.petId,
      props.accountingDay,
    );
    if (!['pending', 'open', 'closed', 'interrupted'].includes(props.status))
      throw new Error('Estado de visita inválido.');
    session._openedAt = props.openedAt ? new Date(props.openedAt) : null;
    session._closedAt = props.closedAt ? new Date(props.closedAt) : null;
    session._initialGrams = props.initialGrams;
    session._finalGrams = props.finalGrams;
    session._measurementValid = props.measurementValid;
    session._status = props.status;
    session._issue = props.issue;
    return session;
  }

  get openedAt(): Date | null {
    return this._openedAt ? new Date(this._openedAt) : null;
  }

  get closedAt(): Date | null {
    return this._closedAt ? new Date(this._closedAt) : null;
  }

  get initialGrams(): number | null {
    return this._initialGrams;
  }

  get finalGrams(): number | null {
    return this._finalGrams;
  }

  get measurementValid(): boolean {
    return this._measurementValid;
  }

  get status(): AccessStatus {
    return this._status;
  }

  get issue(): string | null {
    return this._issue;
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
