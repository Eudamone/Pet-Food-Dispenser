import { Column, Entity, ForeignKey, PrimaryColumn } from 'typeorm';
import type {
  DispensingSource,
  DispensingStatus,
} from '../../../../domain/entities/DispensingRecord.js';
import { FeederDeviceModel } from './feeder-device.model.js';

@Entity('dispensing_records')
@ForeignKey(() => FeederDeviceModel, ['deviceId'], ['id'], {
  onDelete: 'RESTRICT',
})
export class DispensingRecordModel {
  @PrimaryColumn({ type: 'varchar', length: 120 })
  id!: string;

  @PrimaryColumn('uuid')
  deviceId!: string;

  @Column('text')
  source!: DispensingSource;

  @Column({ type: 'double precision', nullable: true })
  targetGrams: number | null = null;

  @Column({ type: 'integer', nullable: true })
  durationSeconds: number | null = null;

  @Column({ type: 'text', nullable: true })
  slotId: string | null = null;

  @Column({ type: 'double precision', nullable: true })
  initialGrams: number | null = null;

  @Column({ type: 'double precision', nullable: true })
  finalGrams: number | null = null;

  @Column('boolean')
  measurementValid = false;

  @Column('text')
  status!: DispensingStatus;

  @Column({ type: 'timestamptz', nullable: true })
  startedAt: Date | null = null;

  @Column({ type: 'timestamptz', nullable: true })
  finishedAt: Date | null = null;

  @Column({ type: 'text', nullable: true })
  reason: string | null = null;
}
