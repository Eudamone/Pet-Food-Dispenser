import { DispensingRecord } from '../../../../domain/entities/DispensingRecord.js';
import { DispensingRecordModel } from '../models/dispensing-record.model.js';

/** Convierte entre `dispensing_records` y la entidad DispensingRecord. */
export class DispensingRecordMapper {
  static toDomain(row: DispensingRecordModel): DispensingRecord {
    return DispensingRecord.restore({
      id: row.id,
      deviceId: row.deviceId,
      source: row.source,
      targetGrams: row.targetGrams,
      slotId: row.slotId,
      initialGrams: row.initialGrams,
      finalGrams: row.finalGrams,
      measurementValid: row.measurementValid,
      status: row.status,
      startedAt: row.startedAt,
      finishedAt: row.finishedAt,
      reason: row.reason,
    });
  }

  static toModel(record: DispensingRecord): DispensingRecordModel {
    const row = new DispensingRecordModel();
    row.id = record.id;
    row.deviceId = record.deviceId;
    row.source = record.source;
    row.targetGrams = record.targetGrams;
    row.slotId = record.slotId;
    row.initialGrams = record.initialGrams;
    row.finalGrams = record.finalGrams;
    row.measurementValid = record.measurementValid;
    row.status = record.status;
    row.startedAt = record.startedAt;
    row.finishedAt = record.finishedAt;
    row.reason = record.reason;
    return row;
  }
}
