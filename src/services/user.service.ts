// users.service.ts
import { Inject, Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';

import * as UserRepo from '@/repositories/user.repository.interface.js';
import { User } from '@/entity-model/user.model.js';
import * as dto from '@/dto/user.dto.js';

@Injectable()
export class UsersService {
  constructor(
    @Inject(UserRepo.USER_REPOSITORY) // Inyecta el repositorio tipado para User
    private readonly userRepository:  UserRepo.IUserRepository,
  ) {}

  async create(dto: dto.CreateUserDto): Promise<User> {
    // Check if user already exists
    const emailExists = await this.userRepository.exists(dto.email);
    if (emailExists) {
      throw new ConflictException('User with this email already exists');
    }

    // Create domain entity
    const user = User.create({
      id: randomUUID(),
      email: dto.email,
      name: dto.name,
    });

    // Persist
    return await this.userRepository.save(user);
  }

  async update(id: string, dto: dto.UpdateUserDto) : Promise<User>{
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new NotFoundException(`User with id ${id} not found`);
    }

    let updatedUser = user;

    if (dto.name !== undefined) {
      updatedUser = updatedUser.updateName(dto.name);
    }

    if (dto.isActive !== undefined) {
      updatedUser = dto.isActive
        ? updatedUser.activate()
        : updatedUser.deactivate();
    }

    return await this.userRepository.save(updatedUser);

  } 

  async findAll(): Promise<User[]> {
    return this.userRepository.findAll();
  }

  async findOne(id: string): Promise<User> {
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new NotFoundException(`User with id ${id} not found`);
    }
    return user;
  }

  async findByEmail(email: string): Promise<User> {
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      throw new NotFoundException(`User with email ${email} not found`);
    }
    return user;
  }

  async delete(id: string): Promise<void> {
    await this.findOne(id);
    await this.userRepository.delete(id);
  }
}
