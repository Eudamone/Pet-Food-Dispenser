import { Column, Entity, ForeignKey, PrimaryColumn } from 'typeorm';
import { UserModel } from './user.model.js';

@Entity('pets')
@ForeignKey(() => UserModel, ['ownerId'], ['id'], { onDelete: 'RESTRICT' })
export class PetModel {
  @PrimaryColumn('uuid')
  id!: string;

  @Column('uuid')
  ownerId!: string;

  @Column('varchar')
  name!: string;

  @Column({ type: 'text', nullable: true })
  species: string | null = null;

  @Column({ type: 'double precision', nullable: true })
  dailyLimitGrams: number | null = null;

  @Column({ type: 'int', nullable: true })
  birthYear: number | null = null;

  @Column({ type: 'int', nullable: true })
  birthMonth: number | null = null;

  @Column({ type: 'int', nullable: true })
  birthDay: number | null = null;
}
