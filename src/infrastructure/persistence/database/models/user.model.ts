import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('users')
export class UserModel {
  @PrimaryColumn('uuid')
  id!: string;

  @Column('varchar')
  name!: string;

  @Column('varchar')
  email!: string;
}
