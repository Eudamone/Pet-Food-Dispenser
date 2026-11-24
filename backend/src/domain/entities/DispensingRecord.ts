import { validateDoseTarget } from './dose-target.js';

export type DispensingSource = 'schedule' | 'manual';
export type DispensingStatus =
  'pending' | 'running' | 'completed' | 'skipped' | 'failed' | 'interrupted';

export class DispensingRecord {
  private _status: DispensingStatus = 'pending';
  private _startedAt: Date | null = null;
  private _finishedAt: Date | null = null;
  private _reason: string | null = null;

  constructor(
    public readonly id: string,
    public readonly deviceId: string,
    public readonly source: DispensingSource,
    public readonly targetGrams: number | null,
    public readonly slotId: string | null = null,
    public readonly durationSeconds: number | null = null,
  ) {
    if (!id.trim() || !deviceId.trim())
      throw new Error('Faltan identificador o equipo.');
    if (source !== 'schedule' && source !== 'manual')
      throw new Error('Origen inválido.');
    if (
      (source === 'schedule' && !slotId?.trim()) ||
      (source === 'manual' && slotId !== null)
    )
      throw new Error('Solo una solicitud programada debe tener horario.');
    validateDoseTarget(targetGrams, durationSeconds);
  }

  static restore(props: {
    id: string;
    deviceId: string;
    source: DispensingSource;
    targetGrams: number | null;
    durationSeconds?: number | null;
    slotId: string | null;
    status: DispensingStatus;
    startedAt: Date | null;
    finishedAt: Date | null;
    reason: string | null;
  }): DispensingRecord {
    const record = new DispensingRecord(
      props.id,
      props.deviceId,
      props.source,
      props.targetGrams,
      props.slotId,
      props.durationSeconds,
    );
    if (
      ![
        'pending',
        'running',
        'completed',
        'skipped',
        'failed',
        'interrupted',
      ].includes(props.status)
    )
      throw new Error('Estado de dispensación inválido.');
    record._status = props.status;
    record._startedAt = props.startedAt ? new Date(props.startedAt) : null;
    record._finishedAt = props.finishedAt ? new Date(props.finishedAt) : null;
    record._reason = props.reason;
    return record;
  }

  get status(): DispensingStatus {
    return this._status;
  }

  get startedAt(): Date | null {
    return this._startedAt ? new Date(this._startedAt) : null;
  }

  get finishedAt(): Date | null {
    return this._finishedAt ? new Date(this._finishedAt) : null;
  }

  get reason(): string | null {
    return this._reason;
  }

  markStarted(at: Date): void {
    if (this._status !== 'pending')
      throw new Error('La operación ya fue iniciada.');
    this.validateDate(at);
    this._startedAt = new Date(at);
    this._status = 'running';
  }

  markCompleted(at: Date): void {
    if (this._status !== 'running')
      throw new Error('La operación no está en curso.');
    this.validateDate(at);
    this._finishedAt = new Date(at);
    this._status = 'completed';
  }

  markSkipped(reason: string, at: Date | null = null): void {
    if (this._status !== 'pending')
      throw new Error('Una operación iniciada no puede omitirse.');
    this.finish('skipped', reason, at);
  }

  markFailed(reason: string, at: Date | null = null): void {
    this.finish('failed', reason, at);
  }

  markInterrupted(reason: string, at: Date | null = null): void {
    this.finish('interrupted', reason, at);
  }

  private validateDate(at: Date | null): void {
    if (
      at !== null &&
      (!Number.isFinite(at.getTime()) ||
        (this._startedAt !== null && at < this._startedAt))
    )
      throw new Error('La fecha no es válida o precede al inicio.');
  }

  private finish(
    status: 'skipped' | 'failed' | 'interrupted',
    reason: string,
    at: Date | null,
  ): void {
    if (this._status !== 'pending' && this._status !== 'running')
      throw new Error('La operación ya finalizó.');
    if (!reason.trim()) throw new Error('Debes indicar el motivo.');
    this.validateDate(at);
    this._reason = reason.trim();
    this._finishedAt = at ? new Date(at) : null;
    this._status = status;
  }
}
