import { Column, Entity, ForeignKey, Index, PrimaryColumn } from 'typeorm';
import type { AccessStatus } from '../../../../domain/entities/AccessSession.js';
import { FeederDeviceModel } from './feeder-device.model.js';

@Entity('access_sessions')
@ForeignKey(() => FeederDeviceModel, ['deviceId'], ['id'], {
  onDelete: 'RESTRICT',
})
@Index(['deviceId', 'accountingDay'])
export class AccessSessionModel {
  @PrimaryColumn({ type: 'varchar', length: 120 })
  id!: string;

  @PrimaryColumn('uuid')
  deviceId!: string;

  @Column('text')
  tagUid!: string;

  @Column('uuid')
  petId!: string;

  @Column({ type: 'varchar', length: 10 })
  accountingDay!: string;

  @Column({ type: 'timestamptz', nullable: true })
  openedAt: Date | null = null;

  @Column({ type: 'timestamptz', nullable: true })
  closedAt: Date | null = null;

  @Column({ type: 'double precision', nullable: true })
  initialGrams: number | null = null;

  @Column({ type: 'double precision', nullable: true })
  finalGrams: number | null = null;

  @Column('boolean')
  measurementValid = false;

  @Column('text')
  status!: AccessStatus;

  @Column({ type: 'text', nullable: true })
  issue: string | null = null;
}
