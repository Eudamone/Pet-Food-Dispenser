import { Test } from '@nestjs/testing';
import { randomUUID } from 'crypto';
import { AuthModule } from '@/auth.module.js';
import { PersistenceMemoryModule } from '@/persistence.memory.module.js';
import { AuthService } from '@/services/auth.service.js';
import { PetService } from '@/services/pet.service.js';
import { FeedingService } from '@/services/feeding.service.js';
import { DeviceService } from '@/services/device.service.js';
import { DeviceConnection } from '@/services/device-connection.service.js';
import { FeedingSlot } from '@/models/feeding-slot.model.js';
import { LocalTime } from '@/helpers/local-time.vo.js';
import { Day } from '@/helpers/local-date.vo.js';
import { PartialDate } from '@/helpers/partial-date.vo.js';

describe('wiring (in-memory)', () => {
  it('runs the full register -> authenticate -> configure -> dispense flow', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AuthModule, PersistenceMemoryModule],
      providers: [AuthService, PetService, FeedingService, DeviceService, DeviceConnection],
    }).compile();

    const auth = moduleRef.get(AuthService);
    const pets = moduleRef.get(PetService);
    const feeding = moduleRef.get(FeedingService);
    const devices = moduleRef.get(DeviceService);

    const registration = await auth.register('Ana', 'ana@mail.com', 'secret1');
    expect(registration.isOk).toBe(true);
    const { user, accessToken } = registration.value;
    expect(accessToken).toBeTruthy();

    // El token identifica al usuario (lo que hace el JwtAuthGuard).
    const authenticated = await auth.authenticate(accessToken);
    expect(authenticated?.id).toBe(user.id);

    // Credenciales inválidas fallan.
    const badSignIn = await auth.signIn('ana@mail.com', 'wrong-password');
    expect(badSignIn.isFailure).toBe(true);

    // Registro duplicado falla.
    const duplicate = await auth.register('Ana', 'ana@mail.com', 'secret1');
    expect(duplicate.isFailure).toBe(true);

    const pet = await pets.registerPet(user, 'Firulais', 'dog', PartialDate.empty());
    expect(await pets.countPets(user)).toBe(1);
    expect(await pets.listPets(user)).toHaveLength(1);

    const device = await devices.registerDevice(user, 'BIND-1');
    expect(device.ownerId).toBe(user.id);
    expect(await devices.listDevices(user)).toHaveLength(1);

    const plan = await feeding.createPlan(user, device.id, 200);
    expect(plan.deviceId).toBe(device.id);
    expect((await feeding.getPlan(user, device.id))?.deviceId).toBe(device.id);

    const slot = FeedingSlot.create({
      id: randomUUID(),
      time: LocalTime.parse('08:00'),
      days: [Day.MONDAY],
      targetGrams: 120,
    });
    const revision = await feeding.saveSlot(user, device.id, slot);
    expect(revision).toBeGreaterThan(0);

    const requestId = await devices.requestDispense(user, device.id, randomUUID(), 50);
    expect(requestId).toBeTruthy();

    const budget = await feeding.getDailyBudget(user, device.id, pet.id);
    expect(budget.completeMeasurements).toBe(true);
    expect(budget.consumedGrams).toBe(0);

    await pets.setDailyLimit(user, pet.id, 150);
    const budgetWithLimit = await feeding.getDailyBudget(user, device.id, pet.id);
    expect(budgetWithLimit.remainingGrams).toBe(150);
  });
});
