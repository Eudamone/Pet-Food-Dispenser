import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../domain/User.js';
import { UserOrmEntity } from '../persistence/entities/user.entity.js';

@Injectable()
export class UserRepository {
  constructor(
    @InjectRepository(UserOrmEntity)
    private readonly store: Repository<UserOrmEntity>,
  ) {}

  async findById(id: string): Promise<User | null> {
    const row = await this.store.findOneBy({ id });
    return row ? new User(row.id, row.name, row.email) : null;
  }

  async save(user: User): Promise<User> {
    const row = await this.store.save({
      id: user.id,
      name: user.name,
      email: user.email,
    });
    return new User(row.id, row.name, row.email);
  }
}
