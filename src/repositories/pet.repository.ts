import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Pet } from '../domain/Pet.js';
import { RfidTag } from '../domain/RfidTag.js';
import { PetOrmEntity } from '../persistence/entities/pet.entity.js';
import { RfidTagOrmEntity } from '../persistence/entities/rfid-tag.entity.js';
import { UserOrmEntity } from '../persistence/entities/user.entity.js';

@Injectable()
export class PetRepository {
  constructor(
    @InjectRepository(PetOrmEntity)
    private readonly store: Repository<PetOrmEntity>,
    @InjectRepository(RfidTagOrmEntity)
    private readonly tags: Repository<RfidTagOrmEntity>,
    private readonly database: DataSource,
  ) {}

  async findById(ownerId: string, petId: string): Promise<Pet | null> {
    const row = await this.store.findOneBy({ id: petId, ownerId });
    return row ? this.toPet(row) : null;
  }

  async listByOwner(ownerId: string): Promise<Pet[]> {
    return (
      await this.store.find({ where: { ownerId }, order: { name: 'ASC' } })
    ).map((row) => this.toPet(row));
  }

  countByOwner(ownerId: string): Promise<number> {
    return this.store.countBy({ ownerId });
  }

  async savePet(pet: Pet): Promise<Pet> {
    const row = await this.store.save({
      id: pet.id,
      ownerId: pet.ownerId,
      name: pet.name,
      species: pet.species ?? null,
      dailyLimitGrams: pet.dailyLimitGrams ?? null,
      birthYear: pet.birthYear,
      birthMonth: pet.birthMonth,
      birthDay: pet.birthDay,
    });
    return this.toPet(row);
  }

  async delete(ownerId: string, petId: string): Promise<void> {
    const result = await this.store.delete({ id: petId, ownerId });
    if (!result.affected)
      throw new NotFoundException('No se encontró la mascota.');
  }

  async findTag(ownerId: string, uid: string): Promise<RfidTag | null> {
    const row = await this.tags.findOneBy({ uid, ownerId });
    return row ? this.toTag(row) : null;
  }

  async listTagsByOwner(ownerId: string): Promise<RfidTag[]> {
    return (
      await this.tags.find({ where: { ownerId }, order: { uid: 'ASC' } })
    ).map((row) => this.toTag(row));
  }

  async registerTag(tag: RfidTag): Promise<RfidTag> {
    try {
      await this.tags.insert({
        uid: tag.uid,
        ownerId: tag.ownerId,
        petId: null,
        active: tag.active,
      });
      return tag;
    } catch (error) {
      if (
        (error as { driverError?: { code?: string } }).driverError?.code ===
        '23505'
      ) {
        throw new ConflictException('El tag ya está registrado.');
      }
      throw error;
    }
  }

  async setTagActive(
    ownerId: string,
    uid: string,
    active: boolean,
  ): Promise<RfidTag> {
    const result = await this.tags.update({ ownerId, uid }, { active });
    if (!result.affected) throw new NotFoundException('No se encontró el tag.');
    return (await this.findTag(ownerId, uid))!;
  }

  async unassignTag(ownerId: string, uid: string): Promise<RfidTag> {
    const result = await this.tags.update({ ownerId, uid }, { petId: null });
    if (!result.affected) throw new NotFoundException('No se encontró el tag.');
    return (await this.findTag(ownerId, uid))!;
  }

  replaceAssignment(
    ownerId: string,
    petId: string,
    uid: string,
  ): Promise<RfidTag> {
    return this.database.transaction(async (manager) => {
      const owner = await manager.findOne(UserOrmEntity, {
        where: { id: ownerId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!owner) throw new NotFoundException('No se encontró el perfil.');

      const pet = await manager.findOneBy(PetOrmEntity, { id: petId, ownerId });
      const row = await manager.findOneBy(RfidTagOrmEntity, { uid, ownerId });
      if (!pet || !row) {
        throw new NotFoundException(
          'La mascota o el tag no pertenecen a tu cuenta.',
        );
      }

      await manager.update(
        RfidTagOrmEntity,
        [
          { ownerId, petId },
          { ownerId, uid },
        ],
        { petId: null },
      );

      const tag = this.toTag(row);
      tag.unassign();
      tag.assignTo(petId);
      await manager.update(
        RfidTagOrmEntity,
        { ownerId, uid },
        { petId: tag.petId },
      );
      const saved = await manager.findOneBy(RfidTagOrmEntity, { ownerId, uid });
      return this.toTag(saved!);
    });
  }

  private toPet(row: PetOrmEntity): Pet {
    const pet = new Pet(row.id, row.ownerId, row.name);
    pet.changeSpecies(row.species);
    if (row.dailyLimitGrams !== null) pet.setDailyLimit(row.dailyLimitGrams);
    pet.setBirthDate(row.birthYear, row.birthMonth, row.birthDay, new Date());
    return pet;
  }

  private toTag(row: RfidTagOrmEntity): RfidTag {
    const tag = new RfidTag(row.uid, row.ownerId);
    if (row.petId !== null) tag.assignTo(row.petId);
    if (!row.active) tag.deactivate();
    return tag;
  }
}
