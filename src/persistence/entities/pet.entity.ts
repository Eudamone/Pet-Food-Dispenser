import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  type Relation,
} from 'typeorm';
import { UserOrmEntity } from './user.entity.js';

@Entity('pets')
export class PetOrmEntity {
  @PrimaryColumn('uuid')
  id: string;

  @Column('uuid')
  ownerId: string;

  @ManyToOne(() => UserOrmEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'ownerId' })
  owner: Relation<UserOrmEntity>;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  species: string | null;

  @Column({ type: 'double precision', nullable: true })
  dailyLimitGrams: number | null;

  @Column({ type: 'int', nullable: true })
  birthYear: number | null;

  @Column({ type: 'int', nullable: true })
  birthMonth: number | null;

  @Column({ type: 'int', nullable: true })
  birthDay: number | null;
}
