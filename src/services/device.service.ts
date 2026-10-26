// device.service.ts
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  DEVICE_REPOSITORY,
} from '@/repositories/device.repository.interface.js';
import type { DeviceRepository } from '@/repositories/device.repository.interface.js';
import { PET_REPOSITORY } from '@/repositories/pet.repository.interface.js';
import type { PetRepository } from '@/repositories/pet.repository.interface.js';
import { FEEDING_REPOSITORY } from '@/repositories/feeding.repository.interface.js';
import type { FeedingRepository } from '@/repositories/feeding.repository.interface.js';
import { DeviceConnection } from '@/services/device-connection.service.js';
import { FeederDevice } from '@/models/feeder-device.model.js';
import { User } from '@/models/user.model.js';
import {
  buildConfigurationData,
  ConfigurationData,
} from '@/models/configuration.model.js';
import {
  DispenseRequest,
  DispenseRequestStatus,
} from '@/models/dispense-request.model.js';
import type { Id } from '@/models/types.js';

@Injectable()
export class DeviceService {
  constructor(
    @Inject(DEVICE_REPOSITORY)
    private readonly devices: DeviceRepository,
    @Inject(PET_REPOSITORY)
    private readonly pets: PetRepository,
    @Inject(FEEDING_REPOSITORY)
    private readonly feeding: FeedingRepository,
    private readonly connection: DeviceConnection,
  ) {}

  async registerDevice(user: User, bindingCode: string): Promise<FeederDevice> {
    const result = await this.connection.bind(user.id, bindingCode);
    if (result.isFailure) {
      throw new ConflictException(result.error);
    }
    const device = result.value;
    await this.devices.saveDevice(device);
    return device;
  }

  listDevices(user: User): Promise<FeederDevice[]> {
    return this.devices.listByOwner(user.id);
  }

  async getDevice(user: User, deviceId: Id): Promise<FeederDevice> {
    const device = await this.devices.findById(deviceId);
    if (!device) {
      throw new NotFoundException(`Device ${deviceId} not found`);
    }
    if (!user.owns(device.ownerId)) {
      throw new ForbiddenException(`User does not own device ${deviceId}`);
    }
    return device;
  }

  async getAppliedConfiguration(
    user: User,
    deviceId: Id,
  ): Promise<ConfigurationData | null> {
    await this.getDevice(user, deviceId);
    return this.devices.getAppliedConfiguration(deviceId);
  }

  async grantAccess(user: User, deviceId: Id, petId: Id): Promise<number> {
    const device = await this.getDevice(user, deviceId);
    await this.requireOwnedPet(user, petId);
    device.addAuthorizedPet(petId);
    await this.devices.saveDevice(device);
    await this.devices.saveAuthorizedPets(deviceId, device.authorizedPetIds);
    return this.bumpRevision(device);
  }

  async revokeAccess(user: User, deviceId: Id, petId: Id): Promise<number> {
    const device = await this.getDevice(user, deviceId);
    device.removeAuthorizedPet(petId);
    await this.devices.saveDevice(device);
    await this.devices.saveAuthorizedPets(deviceId, device.authorizedPetIds);
    return this.bumpRevision(device);
  }

  async applyConfiguration(user: User, deviceId: Id): Promise<number> {
    const device = await this.getDevice(user, deviceId);
    const plan = await this.feeding.findPlanByDevice(deviceId);
    const data = buildConfigurationData(device, plan, device.desiredRevision + 1);

    const result = await this.connection.sendConfiguration(deviceId, data);
    if (result.isFailure) {
      throw new ServiceUnavailableException(result.error);
    }

    const revision = await this.devices.saveDesiredConfiguration(
      deviceId,
      data,
      data.revision,
    );
    device.markRequested(revision);
    await this.devices.saveDevice(device);
    return revision;
  }

  async refreshDevicesForPet(user: User, petId: Id): Promise<void> {
    await this.requireOwnedPet(user, petId);
    const deviceIds = await this.devices.listDeviceIdsForPet(petId);
    for (const deviceId of deviceIds) {
      const device = await this.devices.findById(deviceId);
      if (!device) {
        continue;
      }
      await this.bumpRevision(device);
    }
  }

  async requestDispense(
    user: User,
    deviceId: Id,
    requestId: Id,
    targetGrams: number,
  ): Promise<Id> {
    const device = await this.getDevice(user, deviceId);
    if (targetGrams <= 0 || targetGrams > device.maxBowlGrams) {
      throw new BadRequestException(
        `Target grams must be between 0 and ${device.maxBowlGrams}`,
      );
    }

    const data: DispenseRequest = {
      id: requestId,
      deviceId,
      targetGrams,
      requestedAt: new Date(),
      status: DispenseRequestStatus.PENDING,
    };

    const result = await this.connection.sendDispenseRequest(data);
    if (result.isFailure) {
      throw new ServiceUnavailableException(result.error);
    }

    data.status = DispenseRequestStatus.SENT;
    await this.devices.saveRequest(data);
    return requestId;
  }

  async synchronize(deviceId: Id): Promise<void> {
    const events = await this.connection.readResults(deviceId, 50);
    if (events.length === 0) {
      return;
    }
    for (const event of events) {
      await this.devices.saveObservedState(deviceId, event);
    }
    await this.connection.confirmResults(
      deviceId,
      events.map((event) => event.id),
    );
  }

  private async bumpRevision(device: FeederDevice): Promise<number> {
    const revision = device.desiredRevision + 1;
    device.markRequested(revision);
    await this.devices.saveDevice(device);
    return revision;
  }

  private async requireOwnedPet(user: User, petId: Id) {
    const pet = await this.pets.findById(user.id, petId);
    if (!pet) {
      throw new NotFoundException(`Pet ${petId} not found`);
    }
    return pet;
  }
}
