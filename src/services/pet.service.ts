import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Pet } from '../domain/Pet.js';
import { RfidTag } from '../domain/RfidTag.js';
import type { User } from '../domain/User.js';
import type {
  CreatePetDto,
  UpdatePetDto,
} from '../presentation/dto/pet.dto.js';
import { PetRepository } from '../repositories/pet.repository.js';
import { UserRepository } from '../repositories/user.repository.js';

@Injectable()
export class PetService {
  constructor(
    private readonly pets: PetRepository,
    private readonly users: UserRepository,
  ) {}

  async registerPet(user: User, dto: CreatePetDto): Promise<Pet> {
    await this.ensureProfile(user.id);
    return this.pets.savePet(this.buildPet(randomUUID(), user.id, dto));
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
    return this.pets.savePet(pet);
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

  assignTag(user: User, petId: string, uid: string): Promise<RfidTag> {
    return this.pets.replaceAssignment(
      user.id,
      petId,
      uid.trim().toUpperCase(),
    );
  }

  async unassignTag(user: User, uid: string): Promise<RfidTag> {
    const tag = await this.findTag(user, uid);
    tag.unassign();
    return this.pets.unassignTag(user.id, tag.uid);
  }

  async setTagActive(
    user: User,
    uid: string,
    active: boolean,
  ): Promise<RfidTag> {
    const tag = await this.findTag(user, uid);
    if (active) tag.activate();
    else tag.deactivate();
    return this.pets.setTagActive(user.id, tag.uid, tag.active);
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
