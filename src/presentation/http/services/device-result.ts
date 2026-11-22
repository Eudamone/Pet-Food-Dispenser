import { isISO8601, isUUID } from 'class-validator';
import { AccessSession } from '../../../domain/entities/AccessSession.js';
import { DispensingRecord } from '../../../domain/entities/DispensingRecord.js';
import type { GateState } from '../../../domain/entities/FeederDevice.js';

type DeviceResult =
  | { id: string; kind: 'configurationApplied'; revision: number }
  | {
      id: string;
      kind: 'observation';
      at: Date;
      weight: number | null;
      gate: GateState;
      fault: string | null;
    }
  | {
      id: string;
      kind: 'rfidScanned';
      tagUid: string;
      at: Date;
    }
  | { id: string; kind: 'access'; record: AccessSession }
  | { id: string; kind: 'dispensing'; record: DispensingRecord };

function text(value: unknown, field: string, max = 120): string {
  if (typeof value !== 'string' || !value.trim() || value.length > max)
    throw new Error(`El campo ${field} no es válido.`);
  return value;
}

function grams(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0)
    throw new Error('La medición no es válida.');
  return value;
}

function instant(value: unknown): Date {
  const date = text(value, 'fecha', 40);
  if (
    !isISO8601(date, { strict: true, strictSeparator: true }) ||
    !/(Z|[+-]\d{2}:\d{2})$/.test(date)
  )
    throw new Error('La fecha del evento no es válida.');
  const parsed = new Date(date);
  if (!Number.isFinite(parsed.getTime()))
    throw new Error('La fecha del evento no es válida.');
  return parsed;
}

export function readDeviceResult(
  deviceId: string,
  payload: unknown,
): DeviceResult {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload))
    throw new Error('Evento de equipo inválido.');
  const data = payload as Record<string, unknown>;
  const id = text(data.id, 'id');
  if (!/^[A-Za-z0-9:_-]+$/.test(id))
    throw new Error('Identificador de evento inválido.');
  const finalGrams = () =>
    data.finalGrams == null ? null : grams(data.finalGrams);
  const finalAt = () =>
    data.finishedAt == null ? null : instant(data.finishedAt);

  switch (data.kind) {
    case 'configurationApplied': {
      const revision = data.revision;
      if (
        typeof revision !== 'number' ||
        !Number.isInteger(revision) ||
        revision < 1 ||
        revision > 2147483647
      )
        throw new Error('Revisión de equipo inválida.');
      return { id, kind: data.kind, revision };
    }
    case 'observation': {
      const gate = data.gate;
      if (
        gate !== 'unknown' &&
        gate !== 'open' &&
        gate !== 'closed' &&
        gate !== 'moving' &&
        gate !== 'blocked'
      )
        throw new Error('Estado de compuerta inválido.');
      return {
        id,
        kind: data.kind,
        at: instant(data.at),
        gate,
        weight: data.weight == null ? null : grams(data.weight),
        fault: data.fault == null ? null : text(data.fault, 'fallo'),
      };
    }
    case 'rfidScanned': {
      const tagUid = text(data.tagUid, 'tag').trim().toUpperCase();
      if (!/^[A-Z0-9:_-]+$/.test(tagUid))
        throw new Error('Identificador de tag inválido.');
      return {
        id,
        kind: data.kind,
        tagUid,
        at: instant(data.at),
      };
    }
    case 'access': {
      const petId = text(data.petId, 'mascota', 36);
      if (!isUUID(petId)) throw new Error('Identificador de mascota inválido.');
      const session = new AccessSession(
        id,
        deviceId,
        text(data.tagUid, 'tag'),
        petId,
        text(data.accountingDay, 'día', 10),
      );
      if (data.openedAt != null || data.initialGrams != null)
        session.open(grams(data.initialGrams), instant(data.openedAt));
      if (data.status === 'closed') {
        if (data.issue != null)
          session.invalidateMeasurement(text(data.issue, 'motivo'));
        session.close(
          finalGrams(),
          data.closedAt == null ? null : instant(data.closedAt),
          grams(data.tolerance),
        );
      } else if (data.status === 'interrupted') {
        session.markInterrupted(text(data.issue, 'motivo'));
      } else {
        throw new Error('La visita debe tener un resultado final.');
      }
      return { id, kind: data.kind, record: session };
    }
    case 'dispensing': {
      if (data.source !== 'manual' && data.source !== 'schedule')
        throw new Error('Origen de dispensación inválido.');
      const record = new DispensingRecord(
        id,
        deviceId,
        data.source,
        grams(data.targetGrams),
        data.slotId == null ? null : text(data.slotId, 'horario'),
      );
      if (data.startedAt != null || data.initialGrams != null)
        record.markStarted(grams(data.initialGrams), instant(data.startedAt));
      switch (data.status) {
        case 'completed':
          record.markCompleted(
            grams(data.finalGrams),
            instant(data.finishedAt),
            grams(data.tolerance),
          );
          break;
        case 'skipped':
          record.markSkipped(text(data.reason, 'motivo'), finalAt());
          break;
        case 'failed':
          record.markFailed(
            text(data.reason, 'motivo'),
            finalGrams(),
            finalAt(),
          );
          break;
        case 'interrupted':
          record.markInterrupted(text(data.reason, 'motivo'), finalAt());
          break;
        default:
          throw new Error('La dispensación debe tener un resultado final.');
      }
      return { id, kind: data.kind, record };
    }
    default:
      throw new Error('Tipo de evento de equipo inválido.');
  }
}
