import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Pet } from '@/entity-model/pet.model.js';
import * as PetRepo from '@/repositories/pet.repository.interface.js';
import * as UserRepo from '@/repositories/user.repository.interface.js';
import { CreatePetDto, UpdatePetDto } from '@/dto/pet.dto.js';

@Injectable()
export class PetsService {
  constructor(
    @Inject(PetRepo.PET_REPOSITORY)
    private readonly petRepository: PetRepo.IPetRepository,
    @Inject(UserRepo.USER_REPOSITORY)
    private readonly userRepository: UserRepo.IUserRepository,
  ) {}

  async create(dto: CreatePetDto): Promise<Pet> {
    await this.ensureUserExists(dto.userId);
    return this.petRepository.save(
      Pet.create({ id: randomUUID(), userId: dto.userId, name: dto.name }),
    );
  }

  async findAll(): Promise<Pet[]> {
    return this.petRepository.findAll();
  }

  async findOne(id: string): Promise<Pet> {
    const pet = await this.petRepository.findById(id);
    if (!pet) throw new NotFoundException(`Pet with id ${id} not found`);
    return pet;
  }

  async update(id: string, dto: UpdatePetDto): Promise<Pet> {
    return this.petRepository.save((await this.findOne(id)).updateName(dto.name));
  }

  async delete(id: string): Promise<void> {
    await this.findOne(id);
    await this.petRepository.delete(id);
  }

  private async ensureUserExists(userId: string): Promise<void> {
    if (!(await this.userRepository.findById(userId))) {
      throw new NotFoundException(`User with id ${userId} not found`);
    }
  }
}
