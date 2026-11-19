import { Column, Entity, PrimaryColumn } from 'typeorm';

/** Modelo TypeORM de la tabla `users`. Solo persistencia. */
@Entity('users')
export class UserModel {
  @PrimaryColumn('uuid')
  id!: string;

  @Column('varchar')
  name!: string;

  @Column('varchar')
  email!: string;
}
