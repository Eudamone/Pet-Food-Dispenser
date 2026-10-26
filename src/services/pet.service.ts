// pet.service.ts
import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PET_REPOSITORY } from '@/repositories/pet.repository.interface.js';
import type { PetRepository } from '@/repositories/pet.repository.interface.js';
import { DeviceService } from '@/services/device.service.js';
import { Pet } from '@/models/pet.model.js';
import { RfidTag } from '@/models/rfid-tag.model.js';
import { User } from '@/models/user.model.js';
import { PartialDate } from '@/helpers/partial-date.vo.js';
import type { Id } from '@/models/types.js';

@Injectable()
export class PetService {
  constructor(
    @Inject(PET_REPOSITORY)
    private readonly pets: PetRepository,
    private readonly devices: DeviceService,
  ) {}

  async registerPet(
    user: User,
    name: string,
    species: string | null,
    birth: PartialDate,
  ): Promise<Pet> {
    const pet = Pet.create({ id: randomUUID(), ownerId: user.id, name, species });
    if (!birth.isEmpty) {
      pet.applyBirth(birth, new Date());
    }
    await this.pets.savePet(pet);
    return pet;
  }

  async updatePet(
    user: User,
    petId: Id,
    name: string,
    species: string | null,
    birth: PartialDate,
  ): Promise<void> {
    const pet = await this.requirePet(user, petId);
    pet.rename(name);
    pet.changeSpecies(species);
    if (!birth.isEmpty) {
      pet.applyBirth(birth, new Date());
    }
    await this.pets.savePet(pet);
    await this.devices.refreshDevicesForPet(user, petId);
  }

  async setDailyLimit(user: User, petId: Id, grams: number): Promise<void> {
    const pet = await this.requirePet(user, petId);
    pet.setDailyLimit(grams);
    await this.pets.savePet(pet);
  }

  async countPets(user: User): Promise<number> {
    return this.pets.countByOwner(user.id);
  }

  async listPets(user: User): Promise<Pet[]> {
    return this.pets.listByOwner(user.id);
  }

  async registerTag(user: User, uid: string): Promise<RfidTag> {
    const existing = await this.pets.findTag(uid);
    if (existing) {
      throw new ConflictException(`Tag ${uid} is already registered`);
    }
    const tag = RfidTag.create({ uid, ownerId: user.id });
    await this.pets.saveTag(tag);
    return tag;
  }

  async assignTag(user: User, petId: Id, uid: string): Promise<void> {
    await this.requirePet(user, petId);
    const tag = await this.requireOwnedTag(user, uid);
    if (tag.active && tag.petId !== null && tag.petId !== petId) {
      throw new ConflictException(`Tag ${uid} is already assigned to another pet`);
    }
    await this.pets.replaceAssignment(user.id, petId, uid);
    await this.devices.refreshDevicesForPet(user, petId);
  }

  async unassignTag(user: User, uid: string): Promise<void> {
    const tag = await this.requireOwnedTag(user, uid);
    tag.unassign();
    await this.pets.saveTag(tag);
  }

  async revokeTag(user: User, petId: Id): Promise<void> {
    await this.requirePet(user, petId);
    const tag = await this.pets.getActiveTag(petId);
    if (!tag) {
      return;
    }
    tag.deactivate();
    tag.unassign();
    await this.pets.saveTag(tag);
    await this.devices.refreshDevicesForPet(user, petId);
  }

  private async requirePet(user: User, petId: Id): Promise<Pet> {
    const pet = await this.pets.findById(user.id, petId);
    if (!pet) {
      throw new NotFoundException(`Pet ${petId} not found`);
    }
    return pet;
  }

  private async requireOwnedTag(user: User, uid: string): Promise<RfidTag> {
    const tag = await this.pets.findTag(uid);
    if (!tag || tag.ownerId !== user.id) {
      throw new NotFoundException(`Tag ${uid} not found`);
    }
    return tag;
  }
}
