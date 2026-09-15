import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Feeder } from '@/entity-model/feeder.model.js';
import * as FeederRepo from '@/repositories/feeder.repository.interface.js';
import * as PetRepo from '@/repositories/pet.repository.interface.js';
import * as UserRepo from '@/repositories/user.repository.interface.js';
import { CreateFeederDto, UpdateFeederDto } from '@/dto/feeder.dto.js';

@Injectable()
export class FeedersService {
  constructor(
    @Inject(FeederRepo.FEEDER_REPOSITORY)
    private readonly feederRepository: FeederRepo.IFeederRepository,
    @Inject(PetRepo.PET_REPOSITORY)
    private readonly petRepository: PetRepo.IPetRepository,
    @Inject(UserRepo.USER_REPOSITORY)
    private readonly userRepository: UserRepo.IUserRepository,
  ) {}

  async create(dto: CreateFeederDto): Promise<Feeder> {
    await this.ensureUserExists(dto.userId);
    if (dto.petId) await this.ensurePetBelongsToUser(dto.petId, dto.userId);
    return this.feederRepository.save(
      Feeder.create({
        id: randomUUID(),
        userId: dto.userId,
        name: dto.name,
        petId: dto.petId,
      }),
    );
  }

  async findAll(): Promise<Feeder[]> {
    return this.feederRepository.findAll();
  }

  async findOne(id: string): Promise<Feeder> {
    const feeder = await this.feederRepository.findById(id);
    if (!feeder) throw new NotFoundException(`Feeder with id ${id} not found`);
    return feeder;
  }

  async update(id: string, dto: UpdateFeederDto): Promise<Feeder> {
    let feeder = await this.findOne(id);
    if (dto.name !== undefined) feeder = feeder.updateName(dto.name);
    if (dto.petId !== undefined) {
      if (dto.petId) await this.ensurePetBelongsToUser(dto.petId, feeder.userId);
      feeder = feeder.assignPet(dto.petId);
    }
    return this.feederRepository.save(feeder);
  }

  async delete(id: string): Promise<void> {
    await this.findOne(id);
    await this.feederRepository.delete(id);
  }

  private async ensureUserExists(userId: string): Promise<void> {
    if (!(await this.userRepository.findById(userId))) {
      throw new NotFoundException(`User with id ${userId} not found`);
    }
  }

  private async ensurePetBelongsToUser(petId: string, userId: string): Promise<void> {
    const pet = await this.petRepository.findById(petId);
    if (!pet) throw new NotFoundException(`Pet with id ${petId} not found`);
    if (pet.userId !== userId) {
      throw new NotFoundException(`Pet with id ${petId} does not belong to this user`);
    }
  }
}
