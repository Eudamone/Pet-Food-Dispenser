import { User } from '@/entity-model/user.model.js';

export interface IUserRepository {
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  findAll(): Promise<User[]>;
  save(user: User): Promise<User>;
  delete(id: string): Promise<void>;
  exists(email: string): Promise<boolean>;
}

export const USER_REPOSITORY = Symbol('IUserRepository');