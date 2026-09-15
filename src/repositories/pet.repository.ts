import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PetOrmEntity } from '@/entity-model/pet.entity.js';
import { Pet } from '@/entity-model/pet.model.js';
import { IPetRepository } from '@/repositories/pet.repository.interface.js';

@Injectable()
export class TypeOrmPetRepository implements IPetRepository {
  constructor(
    @InjectRepository(PetOrmEntity)
    private readonly repository: Repository<PetOrmEntity>,
  ) {}

  async findById(id: string): Promise<Pet | null> {
    const entity = await this.repository.findOne({ where: { id } });
    return entity ? this.toDomain(entity) : null;
  }

  async findAll(): Promise<Pet[]> {
    return (await this.repository.find()).map((entity) => this.toDomain(entity));
  }

  async save(pet: Pet): Promise<Pet> {
    return this.toDomain(await this.repository.save(this.toOrmEntity(pet)));
  }

  async delete(id: string): Promise<void> {
    await this.repository.delete(id);
  }

  private toDomain(entity: PetOrmEntity): Pet {
    return new Pet(entity.id, entity.userId, entity.name, entity.createdAt, entity.updatedAt);
  }

  private toOrmEntity(pet: Pet): PetOrmEntity {
    return Object.assign(new PetOrmEntity(), pet);
  }
}
