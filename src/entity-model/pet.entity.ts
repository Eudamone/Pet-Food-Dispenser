import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import type { UserOrmEntity } from '@/entity-model/user.entity.js';
import type { FeederOrmEntity } from '@/entity-model/feeder.entity.js';

@Entity('pets')
export class PetOrmEntity {
  @PrimaryColumn('uuid')
  id: string;

  @Column('uuid')
  userId: string;

  @Column()
  name: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne('UserOrmEntity', (user: UserOrmEntity) => user.pets, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: UserOrmEntity;

  @OneToOne('FeederOrmEntity', (feeder: FeederOrmEntity) => feeder.pet)
  feeder: FeederOrmEntity | null;
}
