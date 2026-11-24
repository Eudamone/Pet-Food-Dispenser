import { Column, Entity, ForeignKey, PrimaryColumn } from 'typeorm';
import { FeedingSlot } from '../../../../domain/entities/FeedingSlot.js';
import { FOOD_OPEN_SECONDS } from '../../../../domain/entities/FeedingPlan.js';
import { FeederDeviceModel } from './feeder-device.model.js';

@Entity('feeding_plans')
@ForeignKey(() => FeederDeviceModel, ['deviceId'], ['id'], {
  onDelete: 'CASCADE',
})
export class FeedingPlanModel {
  @Column({ type: 'uuid', unique: true })
  id!: string;

  @PrimaryColumn('uuid')
  deviceId!: string;

  @Column({
    type: 'jsonb',
    transformer: {
      to: (slots: readonly FeedingSlot[]) =>
        slots.map((slot) => ({
          id: slot.id,
          time: slot.time,
          days: slot.days,
          targetGrams: slot.targetGrams,
          durationSeconds: slot.durationSeconds,
          enabled: slot.enabled,
        })),
      from: (
        slots: readonly Pick<
          FeedingSlot,
          'id' | 'time' | 'days' | 'targetGrams' | 'durationSeconds' | 'enabled'
        >[],
      ) =>
        slots.map(
          (slot) =>
            new FeedingSlot(
              slot.id,
              slot.time,
              slot.days,
              slot.targetGrams,
              slot.enabled,
              slot.durationSeconds,
            ),
        ),
    },
  })
  slots: FeedingSlot[] = [];

  @Column('boolean')
  enabled = false;

  @Column('double precision')
  maxDailyDispensedGrams!: number;

  @Column({ type: 'integer', nullable: true })
  maxDailyOpenSeconds: number | null = null;

  @Column({ type: 'integer', default: FOOD_OPEN_SECONDS })
  foodOpenSeconds: number = FOOD_OPEN_SECONDS;
}
