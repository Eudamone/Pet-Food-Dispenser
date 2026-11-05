import { Injectable, NotFoundException } from '@nestjs/common';
import { User } from '../domain/User.js';
import { UserRepository } from '../repositories/user.repository.js';
import type {
  CreateUserDto,
  UpdateUserDto,
} from '../presentation/dto/user.dto.js';

@Injectable()
export class UserService {
  constructor(private readonly users: UserRepository) {}

  async create(session: User, dto: CreateUserDto): Promise<User> {
    const existing = await this.users.findById(session.id);
    if (existing) return this.findOne(session);
    return this.users.save(new User(session.id, dto.name, session.email));
  }

  async findOne(session: User): Promise<User> {
    const user = await this.users.findById(session.id);
    if (!user)
      throw new NotFoundException('Primero debes completar tu perfil.');

    if (user.email !== session.email) {
      user.applyVerifiedEmail(session.email);
      return this.users.save(user);
    }
    return user;
  }

  async update(session: User, dto: UpdateUserDto): Promise<User> {
    const current = await this.findOne(session);
    const user = new User(current.id, current.name, current.email);
    if (dto.name !== undefined) user.rename(dto.name);
    return this.users.save(user);
  }
}
