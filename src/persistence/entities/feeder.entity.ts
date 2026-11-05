import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  type Relation,
} from 'typeorm';
import type { GateState } from '../../domain/FeederDevice.js';
import { UserOrmEntity } from './user.entity.js';

@Entity('feeders')
export class FeederOrmEntity {
  @PrimaryColumn('uuid')
  id: string;

  @Column('uuid')
  ownerId: string;

  @ManyToOne(() => UserOrmEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'ownerId' })
  owner: Relation<UserOrmEntity>;

  @Column()
  name: string;

  @Column('double precision')
  maxBowlGrams: number;

  @Column({ type: 'jsonb', default: () => "'[]'::jsonb" })
  authorizedPetIds: string[];

  @Column({ default: 0 })
  desiredRevision: number;

  @Column({ default: 0 })
  appliedRevision: number;

  @Column({ type: 'timestamptz', nullable: true })
  lastSeenAt: Date | null;

  @Column({ type: 'double precision', nullable: true })
  lastBowlGrams: number | null;

  @Column({ type: 'text', default: 'unknown' })
  gateState: GateState;

  @Column({ type: 'text', nullable: true })
  lastFault: string | null;
}
