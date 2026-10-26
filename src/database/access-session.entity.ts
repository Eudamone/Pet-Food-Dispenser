// access-session.entity.ts
import { Column, Entity, PrimaryColumn } from 'typeorm';
import { AccessStatus } from '@/models/types.js';

@Entity('access_sessions')
export class AccessSessionOrmEntity {
  @PrimaryColumn('uuid')
  id: string;

  @Column('uuid')
  deviceId: string;

  @Column()
  tagUid: string;

  @Column('uuid')
  petId: string;

  @Column({ type: 'date' })
  accountingDay: string;

  @Column({ type: 'timestamptz', nullable: true })
  openedAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  closedAt: Date | null;

  @Column({ type: 'double precision', nullable: true })
  initialGrams: number | null;

  @Column({ type: 'double precision', nullable: true })
  finalGrams: number | null;

  @Column({ default: false })
  measurementValid: boolean;

  @Column({ type: 'varchar' })
  status: AccessStatus;

  @Column({ type: 'varchar', nullable: true })
  issue: string | null;
}
