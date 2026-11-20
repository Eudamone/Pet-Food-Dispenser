import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../domain/User.js';

@Injectable()
export class UserRepository {
  constructor(
    @InjectRepository(User)
    private readonly store: Repository<User>,
  ) {}

  async findById(id: string): Promise<User | null> {
    const row = await this.store.findOneBy({ id });
    return row;
  }

  async save(user: User): Promise<User> {
    return this.store.save(user);
  }
}
