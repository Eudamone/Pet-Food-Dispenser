export type DispensingSource = 'schedule' | 'manual';
export type DispensingStatus =
  'pending' | 'running' | 'completed' | 'skipped' | 'failed' | 'interrupted';

export class DispensingRecord {
  private _initialGrams: number | null = null;
  private _finalGrams: number | null = null;
  private _measurementValid = false;
  private _status: DispensingStatus = 'pending';
  private _startedAt: Date | null = null;
  private _finishedAt: Date | null = null;
  private _reason: string | null = null;

  constructor(
    public readonly id: string,
    public readonly deviceId: string,
    public readonly source: DispensingSource,
    public readonly targetGrams: number,
    public readonly slotId: string | null = null,
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
    if (!Number.isFinite(targetGrams) || targetGrams <= 0)
      throw new Error('El objetivo debe ser positivo.');
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

  markStarted(initialGrams: number, at: Date): void {
    if (this._status !== 'pending')
      throw new Error('La operación ya fue iniciada.');
    if (!Number.isFinite(initialGrams) || initialGrams < 0)
      throw new Error('El peso inicial debe ser válido y no negativo.');
    this.validateDate(at);
    this._initialGrams = initialGrams;
    this._startedAt = new Date(at);
    this._status = 'running';
  }

  markCompleted(finalGrams: number, at: Date, tolerance: number): void {
    if (this._status !== 'running')
      throw new Error('La operación no está en curso.');
    if (
      !Number.isFinite(tolerance) ||
      tolerance < 0 ||
      !Number.isFinite(finalGrams) ||
      finalGrams < 0
    )
      throw new Error('El peso o la tolerancia no son válidos.');
    this.validateDate(at);
    if (
      finalGrams + tolerance < this.targetGrams ||
      finalGrams + tolerance < this._initialGrams! ||
      finalGrams > Math.max(this.targetGrams, this._initialGrams!) + tolerance
    )
      throw new Error(
        'El peso final no confirma el objetivo o contradice el inicial.',
      );
    this._finalGrams = finalGrams;
    this._finishedAt = new Date(at);
    this._measurementValid = true;
    this._status = 'completed';
  }

  markSkipped(reason: string, at: Date | null = null): void {
    if (this._status !== 'pending')
      throw new Error('Una operación iniciada no puede omitirse.');
    this.finish('skipped', reason, at);
  }

  markFailed(
    reason: string,
    finalGrams: number | null = null,
    at: Date | null = null,
  ): void {
    if (finalGrams !== null && (!Number.isFinite(finalGrams) || finalGrams < 0))
      throw new Error('El peso final debe ser válido y no negativo.');
    this.finish('failed', reason, at);
    this._finalGrams = finalGrams;
    this._measurementValid =
      this._initialGrams !== null &&
      finalGrams !== null &&
      finalGrams >= this._initialGrams;
  }

  markInterrupted(reason: string, at: Date | null = null): void {
    this.finish('interrupted', reason, at);
  }

  dispensedGrams(): number | null {
    if (this._status === 'skipped') return 0;
    if (!this._measurementValid) return null;
    return Math.max(0, this._finalGrams! - this._initialGrams!);
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
