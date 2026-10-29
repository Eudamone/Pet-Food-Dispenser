// feeding-slot.entity.ts
// Horario puntual dentro de un plan de alimentación.
// Relaciones por nombre de clase + `import type`: evitan ciclos ESM en runtime (docs/RELACIONES.md).
import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import type { FeedingPlanOrmEntity } from '@/database/feeding-plan.entity.js';

@Entity('feeding_slots')
export class FeedingSlotOrmEntity {
  @PrimaryColumn('uuid')
  id: string;

  @Column('uuid')
  planId: string;

  // FeedingPlan 1 ── CONTAINS ── 0..* FeedingSlot
  @ManyToOne('FeedingPlanOrmEntity', (plan: FeedingPlanOrmEntity) => plan.slots, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'planId' })
  plan: FeedingPlanOrmEntity;

  @Column({ type: 'varchar' })
  time: string;

  @Column({ type: 'simple-array' })
  days: string[];

  @Column({ type: 'double precision' })
  targetGrams: number;

  @Column({ default: true })
  enabled: boolean;

  // Orden de inserción en el plan: la BD no garantiza el orden de las filas.
  @Column({ type: 'int' })
  position: number;
}
