import { AccessSession } from '../../../../domain/entities/AccessSession.js';
import { AccessSessionModel } from '../models/access-session.model.js';

/** Convierte entre `access_sessions` y la entidad de dominio AccessSession. */
export class AccessSessionMapper {
  static toDomain(row: AccessSessionModel): AccessSession {
    return AccessSession.restore({
      id: row.id,
      deviceId: row.deviceId,
      tagUid: row.tagUid,
      petId: row.petId,
      accountingDay: row.accountingDay,
      openedAt: row.openedAt,
      closedAt: row.closedAt,
      initialGrams: row.initialGrams,
      finalGrams: row.finalGrams,
      measurementValid: row.measurementValid,
      status: row.status,
      issue: row.issue,
    });
  }

  static toModel(session: AccessSession): AccessSessionModel {
    const row = new AccessSessionModel();
    row.id = session.id;
    row.deviceId = session.deviceId;
    row.tagUid = session.tagUid;
    row.petId = session.petId;
    row.accountingDay = session.accountingDay;
    row.openedAt = session.openedAt;
    row.closedAt = session.closedAt;
    row.initialGrams = session.initialGrams;
    row.finalGrams = session.finalGrams;
    row.measurementValid = session.measurementValid;
    row.status = session.status;
    row.issue = session.issue;
    return row;
  }
}
