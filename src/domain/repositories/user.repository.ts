import type { User } from '../entities/User.js';

export const USER_REPOSITORY = Symbol('USER_REPOSITORY');

export interface UserRepository {
  findById(id: string): Promise<User | null>;
  save(user: User): Promise<User>;
}
