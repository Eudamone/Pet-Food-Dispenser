// dispensing-record.entity.ts
// Relaciones por nombre de clase + `import type`: evitan ciclos ESM en runtime (docs/RELACIONES.md).
import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { DispensingSource, DispensingStatus } from '@/models/types.js';
import type { FeederDeviceOrmEntity } from '@/database/feeder-device.entity.js';
import type { FeedingSlotOrmEntity } from '@/database/feeding-slot.entity.js';

@Entity('dispensing_records')
export class DispensingRecordOrmEntity {
  @PrimaryColumn('uuid')
  id: string;

  @Column('uuid')
  deviceId: string;

  // FeederDevice 1 ── PRODUCES ── 0..* DispensingRecord
  @ManyToOne('FeederDeviceOrmEntity', (device: FeederDeviceOrmEntity) => device.dispensingRecords)
  @JoinColumn({ name: 'deviceId' })
  device: FeederDeviceOrmEntity;

  @Column({ type: 'uuid', nullable: true })
  slotId: string | null;

  // Un horario produce muchos dispensados; si se borra el slot el registro
  // conserva sus datos y el vínculo queda nulo (ON DELETE SET NULL).
  @ManyToOne('FeedingSlotOrmEntity', { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'slotId' })
  slot: FeedingSlotOrmEntity | null;

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
