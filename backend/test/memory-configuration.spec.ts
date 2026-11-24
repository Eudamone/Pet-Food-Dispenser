import { FeederDevice } from '../dist/domain/entities/FeederDevice.js';
import { FeedingPlan } from '../dist/domain/entities/FeedingPlan.js';
import { FeedingSlot } from '../dist/domain/entities/FeedingSlot.js';
import { MemoryDatabase } from '../dist/infrastructure/persistence/memory/memory.database.js';
import { MemoryDeviceRepository } from '../dist/infrastructure/persistence/memory/memory-device.repository.js';

it('conserva los días de los horarios al serializar una configuración en memoria', async () => {
  const db = new MemoryDatabase();
  const device = new FeederDevice('device-1', 'owner-1', 'Cocina', 500);
  device.markRequested(1);
  const plan = new FeedingPlan('plan-1', device.id, 100);
  plan.addSlot(new FeedingSlot('slot-1', '08:00', [1, 3, 5], 30), 500);
  plan.enableScheduling(500);
  db.devices.set(device.id, device);
  db.plans.set(device.id, plan);
  const repository = new MemoryDeviceRepository(db);
  const serialized = JSON.parse(
    JSON.stringify(await repository.pendingPlans()),
  );
  expect(serialized[0].slots[0]).toEqual({
    id: 'slot-1',
    time: '08:00',
    days: [1, 3, 5],
    targetGrams: 30,
    enabled: true,
  });
});
