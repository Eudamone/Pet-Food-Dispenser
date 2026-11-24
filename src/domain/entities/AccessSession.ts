export type AccessStatus = 'pending' | 'open' | 'closed' | 'interrupted';

export class AccessSession {
  private _openedAt: Date | null = null;
  private _closedAt: Date | null = null;
  private _status: AccessStatus = 'pending';
  private _issue: string | null = null;

  constructor(
    public readonly id: string,
    public readonly deviceId: string,
    public readonly tagUid: string,
    public readonly petId: string,
    public readonly accountingDay: string,
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
  }

  static restore(props: {
    id: string;
    deviceId: string;
    tagUid: string;
    petId: string;
    accountingDay: string;
    openedAt: Date | null;
    closedAt: Date | null;
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

  get status(): AccessStatus {
    return this._status;
  }

  get issue(): string | null {
    return this._issue;
  }

  open(at: Date): void {
    if (this._status !== 'pending')
      throw new Error('La visita ya fue iniciada.');
    if (!Number.isFinite(at.getTime()))
      throw new Error('La fecha no es válida.');
    this._openedAt = new Date(at);
    this._status = 'open';
  }

  close(at: Date | null): void {
    if (this._status !== 'open') throw new Error('La visita no está abierta.');
    if (at !== null && (!Number.isFinite(at.getTime()) || at < this._openedAt!))
      throw new Error('El cierre no puede preceder a la apertura.');
    this._closedAt = at ? new Date(at) : null;
    this._status = 'closed';
  }

  markInterrupted(reason: string): void {
    if (this._status !== 'pending' && this._status !== 'open')
      throw new Error('La visita ya finalizó.');
    if (!reason.trim()) throw new Error('Debes indicar el motivo.');
    this._issue = reason.trim();
    this._status = 'interrupted';
  }
}
