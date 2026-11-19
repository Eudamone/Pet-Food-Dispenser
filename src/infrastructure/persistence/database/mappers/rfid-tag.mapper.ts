import { RfidTag } from '../../../../domain/entities/RfidTag.js';
import { RfidTagModel } from '../models/rfid-tag.model.js';

/** Convierte entre `rfid_tags` y la entidad de dominio RfidTag. */
export class RfidTagMapper {
  static toDomain(row: RfidTagModel): RfidTag {
    const tag = new RfidTag(row.uid, row.ownerId);
    if (row.petId !== null) tag.assignTo(row.petId);
    if (!row.active) tag.deactivate();
    return tag;
  }

  static toModel(tag: RfidTag): RfidTagModel {
    const row = new RfidTagModel();
    row.uid = tag.uid;
    row.ownerId = tag.ownerId;
    row.petId = tag.petId;
    row.active = tag.active;
    return row;
  }
}
