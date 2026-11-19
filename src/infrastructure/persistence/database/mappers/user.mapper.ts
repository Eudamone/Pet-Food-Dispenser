import { User } from '../../../../domain/entities/User.js';
import { UserModel } from '../models/user.model.js';

/** Convierte entre `users` y la entidad de dominio User. */
export class UserMapper {
  static toDomain(row: UserModel): User {
    return new User(row.id, row.name, row.email);
  }

  static toModel(user: User): UserModel {
    const row = new UserModel();
    row.id = user.id;
    row.name = user.name;
    row.email = user.email;
    return row;
  }
}
