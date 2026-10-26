// dispensing-record.entity.ts
import { Column, Entity, PrimaryColumn } from 'typeorm';
import { DispensingSource, DispensingStatus } from '@/models/types.js';

@Entity('dispensing_records')
export class DispensingRecordOrmEntity {
  @PrimaryColumn('uuid')
  id: string;

  @Column('uuid')
  deviceId: string;

  @Column({ type: 'uuid', nullable: true })
  slotId: string | null;

  @Column({ type: 'varchar' })
  source: DispensingSource;

  @Column({ type: 'double precision' })
  targetGrams: number;

  @Column({ type: 'double precision', nullable: true })
  initialGrams: number | null;

  @Column({ type: 'double precision', nullable: true })
  finalGrams: number | null;

  @Column({ default: false })
  measurementValid: boolean;

  @Column({ type: 'varchar' })
  status: DispensingStatus;

  @Column({ type: 'timestamptz', nullable: true })
  startedAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  finishedAt: Date | null;

  @Column({ type: 'varchar', nullable: true })
  reason: string | null;
}
