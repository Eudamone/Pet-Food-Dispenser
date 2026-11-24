import { FeederDevice } from '../../../../domain/entities/FeederDevice.js';
import { FeederDeviceModel } from '../models/feeder-device.model.js';

export class FeederDeviceMapper {
  static toDomain(row: FeederDeviceModel): FeederDevice {
    const device = new FeederDevice(
      row.id,
      row.ownerId,
      row.name,
      row.maxBowlGrams,
    );
    for (const petId of row.authorizedPetIds) device.addAuthorizedPet(petId);
    if (row.desiredRevision > 0) device.markRequested(row.desiredRevision);
    device.confirmApplied(row.appliedRevision);
    if (row.lastSeenAt !== null)
      device.updateObservedState(row.lastSeenAt, row.gateState, row.lastFault);
    return device;
  }

  static toModel(device: FeederDevice): FeederDeviceModel {
    const row = new FeederDeviceModel();
    row.id = device.id;
    row.ownerId = device.ownerId;
    row.name = device.name;
    row.maxBowlGrams = device.maxBowlGrams;
    row.authorizedPetIds = device.authorizedPetIds;
    row.desiredRevision = device.desiredRevision;
    row.appliedRevision = device.appliedRevision;
    row.lastSeenAt = device.lastSeenAt;
    row.gateState = device.gateState;
    row.lastFault = device.lastFault;
    return row;
  }
}
