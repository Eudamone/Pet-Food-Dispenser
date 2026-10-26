// feeding-plan.entity.ts
import { Column, Entity, PrimaryColumn } from 'typeorm';
import type { FeedingSlotConfiguration } from '@/models/configuration.model.js';

@Entity('feeding_plans')
export class FeedingPlanOrmEntity {
  @PrimaryColumn('uuid')
  id: string;

  @Column('uuid')
  deviceId: string;

  @Column({ default: false })
  enabled: boolean;

  @Column({ type: 'double precision' })
  maxDailyDispensedGrams: number;

  @Column({ type: 'jsonb', default: () => "'[]'" })
  slots: FeedingSlotConfiguration[];
}
