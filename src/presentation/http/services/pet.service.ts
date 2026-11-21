import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Pet } from '../../../domain/entities/Pet.js';
import { RfidTag } from '../../../domain/entities/RfidTag.js';
import type { User } from '../../../domain/entities/User.js';
import type { CreatePetDto, UpdatePetDto } from '../dtos/pet.dto.js';
import {
  PET_REPOSITORY,
  type PetRepository,
} from '../../../domain/repositories/pet.repository.js';
import {
  USER_REPOSITORY,
  type UserRepository,
} from '../../../domain/repositories/user.repository.js';
import { DeviceService } from './device.service.js';

export type PetRegistrationResult = {
  readonly pet: Pet;
  readonly tag: RfidTag | null;
  readonly authorizedFeederId: string | null;
};

@Injectable()
export class PetService {
  constructor(
    @Inject(PET_REPOSITORY) private readonly pets: PetRepository,
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    private readonly devices: DeviceService,
  ) {}

  async registerPet(user: User, dto: CreatePetDto): Promise<Pet> {
    const result = await this.registerPetWithLinks(user, dto);
    return result.pet;
  }

  async registerPetWithLinks(
    user: User,
    dto: CreatePetDto,
  ): Promise<PetRegistrationResult> {
    await this.ensureProfile(user.id);
    const pet = await this.pets.savePet(this.buildPet(randomUUID(), user.id, dto));

    let tag: RfidTag | null = null;
    if (dto.tagUid) {
      const cleanUid = dto.tagUid.trim().toUpperCase();
      const existing = await this.pets.findTag(user.id, cleanUid);
      const previousPetId = existing?.petId ?? null;
      if (!existing) {
        await this.pets.registerTag(new RfidTag(cleanUid, user.id));
      }
      tag = await this.pets.replaceAssignment(user.id, pet.id, cleanUid);
      if (previousPetId && previousPetId !== pet.id) {
        await this.devices.syncConfigurationForPet(user.id, previousPetId);
      }
    }

    let authorizedFeederId: string | null = null;
    if (dto.autoAuthorizeFeeder !== false) {
      const feeder = await this.devices.autoAuthorizePet(
        user,
        pet.id,
        dto.feederId,
      );
      authorizedFeederId = feeder?.id ?? null;
    }

    return { pet, tag, authorizedFeederId };
  }

  findAll(user: User): Promise<Pet[]> {
    return this.pets.listByOwner(user.id);
  }

  countPets(user: User): Promise<number> {
    return this.pets.countByOwner(user.id);
  }

  async findOne(user: User, id: string): Promise<Pet> {
    const pet = await this.pets.findById(user.id, id);
    if (!pet)
      throw new NotFoundException('No se encontró la mascota en tu cuenta.');
    return pet;
  }

  async updatePet(user: User, id: string, dto: UpdatePetDto): Promise<Pet> {
    const current = await this.findOne(user, id);
    const pet = this.buildPet(current.id, current.ownerId, {
      name: dto.name ?? current.name,
      species:
        dto.species === undefined ? (current.species ?? null) : dto.species,
      dailyLimitGrams: dto.dailyLimitGrams ?? current.dailyLimitGrams ?? null,
      birth: dto.birth ?? {
        year: current.birthYear,
        month: current.birthMonth,
        day: current.birthDay,
      },
    });
    const saved = await this.pets.savePet(pet);
    if (current.dailyLimitGrams !== saved.dailyLimitGrams) {
      await this.devices.syncConfigurationForPet(user.id, saved.id);
    }
    return saved;
  }

  async setDailyLimit(user: User, id: string, grams: number): Promise<Pet> {
    return this.updatePet(user, id, { dailyLimitGrams: grams });
  }

  async delete(user: User, id: string): Promise<void> {
    await this.findOne(user, id);
    await this.pets.delete(user.id, id);
  }

  async registerTag(user: User, uid: string): Promise<RfidTag> {
    await this.ensureProfile(user.id);
    return this.pets.registerTag(new RfidTag(uid, user.id));
  }

  listTags(user: User): Promise<RfidTag[]> {
    return this.pets.listTagsByOwner(user.id);
  }

  async findTag(user: User, uid: string): Promise<RfidTag> {
    const tag = await this.pets.findTag(user.id, uid.trim().toUpperCase());
    if (!tag)
      throw new NotFoundException('No se encontró el tag en tu cuenta.');
    return tag;
  }

  async assignTag(user: User, petId: string, uid: string): Promise<RfidTag> {
    const cleanUid = uid.trim().toUpperCase();
    const previous = await this.pets.findTag(user.id, cleanUid);
    const assigned = await this.pets.replaceAssignment(
      user.id,
      petId,
      cleanUid,
    );
    if (previous?.petId && previous.petId !== petId) {
      await this.devices.syncConfigurationForPet(user.id, previous.petId);
    }
    await this.devices.syncConfigurationForPet(user.id, petId);
    return assigned;
  }

  async unassignTag(user: User, uid: string): Promise<RfidTag> {
    const tag = await this.findTag(user, uid);
    const previousPetId = tag.petId;
    tag.unassign();
    const updated = await this.pets.unassignTag(user.id, tag.uid);
    if (previousPetId) {
      await this.devices.syncConfigurationForPet(user.id, previousPetId);
    }
    return updated;
  }

  async setTagActive(
    user: User,
    uid: string,
    active: boolean,
  ): Promise<RfidTag> {
    const tag = await this.findTag(user, uid);
    if (active) tag.activate();
    else tag.deactivate();
    const updated = await this.pets.setTagActive(user.id, tag.uid, tag.active);
    if (updated.petId) {
      await this.devices.syncConfigurationForPet(user.id, updated.petId);
    }
    return updated;
  }

  private async ensureProfile(userId: string): Promise<void> {
    if (!(await this.users.findById(userId))) {
      throw new NotFoundException('Primero debes completar tu perfil.');
    }
  }

  private buildPet(id: string, ownerId: string, dto: CreatePetDto): Pet {
    try {
      const pet = new Pet(id, ownerId, dto.name);
      pet.changeSpecies(dto.species ?? null);
      if (dto.dailyLimitGrams != null) pet.setDailyLimit(dto.dailyLimitGrams);
      if (dto.birth !== undefined) {
        pet.setBirthDate(
          dto.birth.year ?? null,
          dto.birth.month ?? null,
          dto.birth.day ?? null,
          new Date(),
        );
      }
      return pet;
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error ? error.message : 'Datos de mascota inválidos.',
      );
    }
  }
}
