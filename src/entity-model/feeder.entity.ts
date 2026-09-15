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
import type { PetOrmEntity } from '@/entity-model/pet.entity.js';

@Entity('feeders')
export class FeederOrmEntity {
  @PrimaryColumn('uuid')
  id: string;

  @Column('uuid')
  userId: string;

  @Column()
  name: string;

  @Column('uuid', { nullable: true, unique: true })
  petId: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne('UserOrmEntity', (user: UserOrmEntity) => user.feeders, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: UserOrmEntity;

  @OneToOne('PetOrmEntity', (pet: PetOrmEntity) => pet.feeder, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'petId' })
  pet: PetOrmEntity | null;
}
