// feeding-plan.entity.ts
// Relaciones por nombre de clase + `import type`: evitan ciclos ESM en runtime (docs/RELACIONES.md).
import { Column, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryColumn } from 'typeorm';
import type { FeederDeviceOrmEntity } from '@/database/feeder-device.entity.js';
import type { FeedingSlotOrmEntity } from '@/database/feeding-slot.entity.js';

@Entity('feeding_plans')
export class FeedingPlanOrmEntity {
  @PrimaryColumn('uuid')
  id: string;

  @Column('uuid')
  deviceId: string;

  // FeederDevice 1 ── USES (Agregación) ── 0..* FeedingPlan
  @ManyToOne('FeederDeviceOrmEntity', (device: FeederDeviceOrmEntity) => device.plans)
  @JoinColumn({ name: 'deviceId' })
  device: FeederDeviceOrmEntity;

  @Column({ default: false })
  enabled: boolean;

  @Column({ type: 'double precision' })
  maxDailyDispensedGrams: number;

  // FeedingPlan 1 ── CONTAINS ── 0..* FeedingSlot (antes era la columna slots)
  @OneToMany('FeedingSlotOrmEntity', (slot: FeedingSlotOrmEntity) => slot.plan, {
    cascade: true,
  })
  slots: FeedingSlotOrmEntity[];
}
