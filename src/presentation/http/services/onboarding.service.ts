import { Injectable } from '@nestjs/common';
import type { FeederDevice } from '../../../domain/entities/FeederDevice.js';
import type { Pet } from '../../../domain/entities/Pet.js';
import type { RfidTag } from '../../../domain/entities/RfidTag.js';
import type { User } from '../../../domain/entities/User.js';
import type { OnboardingDto } from '../dtos/onboarding.dto.js';
import type { CreateUserDto } from '../dtos/user.dto.js';
import { AuthService } from './auth.service.js';
import { DeviceService } from './device.service.js';
import { PetService } from './pet.service.js';

export type ProfileCreationResult = {
  readonly user: User;
  readonly linkedFeeder: FeederDevice | null;
};

export type OnboardingResult = {
  readonly user: User;
  readonly feeder: FeederDevice | null;
  readonly pet: Pet | null;
  readonly tag: RfidTag | null;
  readonly mqttDispatched: boolean;
};

@Injectable()
export class OnboardingService {
  constructor(
    private readonly auth: AuthService,
    private readonly devices: DeviceService,
    private readonly pets: PetService,
  ) {}

  async createProfileWithAutoLink(
    identity: User,
    dto: CreateUserDto,
  ): Promise<ProfileCreationResult> {
    const user = await this.auth.createProfile(identity, dto.name);
    const linkedFeeder =
      dto.autoLinkFeeder === false
        ? null
        : await this.devices.claimAvailableFeeder(user, {
            deviceId: dto.feederId,
            name: dto.feederName,
            maxBowlGrams: dto.maxBowlGrams,
          });
    return { user, linkedFeeder };
  }

  async setup(identity: User, dto: OnboardingDto): Promise<OnboardingResult> {
    const user = await this.auth.createProfile(identity, dto.userName);
    let feeder = await this.devices.claimAvailableFeeder(user, dto.feeder);

    let pet: Pet | null = null;
    let tag: RfidTag | null = null;
    if (dto.pet) {
      const registration = await this.pets.registerPetWithLinks(user, {
        name: dto.pet.name,
        species: dto.pet.species,
        dailyLimitGrams: dto.pet.dailyLimitGrams,
        birth: dto.pet.birth,
        tagUid: dto.pet.tagUid,
        feederId: feeder?.id,
        autoAuthorizeFeeder: Boolean(feeder),
      });
      pet = registration.pet;
      tag = registration.tag;
      if (feeder) {
        feeder = await this.devices.getDevice(user, feeder.id);
      }
    }

    return {
      user,
      feeder,
      pet,
      tag,
      mqttDispatched: this.devices.isMessengerConnected(),
    };
  }
}
