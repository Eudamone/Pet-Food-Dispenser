import { Test } from '@nestjs/testing';
import { PersistenceModule } from '../dist/infrastructure/persistence/persistence.module.js';
import { PresentationModule } from '../dist/presentation/presentation.module.js';
import { DEVICE_MESSENGER } from '../dist/domain/ports/device-messenger.port.js';
import { User } from '../dist/domain/entities/User.js';
import { DeviceService } from '../dist/presentation/http/services/device.service.js';
import { OnboardingService } from '../dist/presentation/http/services/onboarding.service.js';
import { PetService } from '../dist/presentation/http/services/pet.service.js';

describe('Descubrimiento MQTT, auto-vinculación y onboarding', () => {
  const messenger = {
    connected: true,
    sendConfiguration: vi.fn(),
    sendManualDispense: vi.fn(),
    confirmResults: vi.fn(),
  };

  let deviceService: DeviceService;
  let petService: PetService;
  let onboardingService: OnboardingService;

  beforeEach(async () => {
    vi.clearAllMocks();
    delete process.env.DEFAULT_FEEDER_ID;
    delete process.env.DEFAULT_FEEDER_NAME;
    delete process.env.DEFAULT_FEEDER_MAX_BOWL_GRAMS;

    const moduleRef = await Test.createTestingModule({
      imports: [
        PersistenceModule.register({ driver: 'memory' }),
        PresentationModule,
      ],
    })
      .overrideProvider(DEVICE_MESSENGER)
      .useValue(messenger)
      .compile();

    deviceService = moduleRef.get(DeviceService);
    petService = moduleRef.get(PetService);
    onboardingService = moduleRef.get(OnboardingService);
  });

  it('detecta un alimentador no registrado vía MQTT, lo vincula al crear usuario y sincroniza mascota + RFID al firmware', async () => {
    const feederId = 'ae4db682-69a8-41ce-a90f-c6d29c9ce994';
    const observedAt = new Date(Date.now() - 5000).toISOString();

    // 1. El ESP32 envía telemetría antes de que exista el usuario.
    await deviceService.synchronize(feederId, {
      id: 'obs-boot-1',
      kind: 'observation',
      at: observedAt,
      gate: 'closed',
      weight: 42.5,
      fault: null,
    });

    expect(messenger.confirmResults).toHaveBeenCalledWith(feederId, [
      'obs-boot-1',
    ]);

    const discoveredBefore = await deviceService.listDiscovered();
    expect(discoveredBefore).toHaveLength(1);
    expect(discoveredBefore[0]).toMatchObject({
      deviceId: feederId,
      source: 'mqtt',
      lastBowlGrams: 42.5,
      gateState: 'closed',
    });

    // 2. El usuario crea su perfil y hereda automáticamente el alimentador descubierto.
    const identity = new User('user-1', 'ana@example.com', 'ana@example.com');
    const created = await onboardingService.createProfileWithAutoLink(
      identity,
      { name: 'Ana' },
    );

    expect(created.user.name).toBe('Ana');
    expect(created.linkedFeeder).not.toBeNull();
    expect(created.linkedFeeder?.id).toBe(feederId);
    expect(created.linkedFeeder?.lastBowlGrams).toBe(42.5);
    expect(await deviceService.listDiscovered()).toHaveLength(0);

    // 3. El usuario crea su mascota con tag RFID; se vincula y despacha configuración MQTT al instante.
    const petResult = await petService.registerPetWithLinks(created.user, {
      name: 'Firulais',
      species: 'Perro',
      dailyLimitGrams: 180,
      tagUid: '04a3b2c1d2',
    });

    expect(petResult.tag?.uid).toBe('04A3B2C1D2');
    expect(petResult.tag?.petId).toBe(petResult.pet.id);
    expect(petResult.authorizedFeederId).toBe(feederId);

    // Esperar microtask del envío asíncrono de planes pendientes.
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(messenger.sendConfiguration).toHaveBeenCalledWith(
      feederId,
      expect.objectContaining({
        kind: 'feedingPlan',
        deviceId: feederId,
        revision: 1,
        authorizedPetIds: [petResult.pet.id],
        authorizedPets: [
          {
            petId: petResult.pet.id,
            tagUid: '04A3B2C1D2',
            dailyLimitGrams: 180,
          },
        ],
      }),
    );

    // 4. Actualizar el límite diario o cambiar el tag vuelve a incrementar desiredRevision y reenviar MQTT.
    messenger.sendConfiguration.mockClear();
    await petService.setDailyLimit(created.user, petResult.pet.id, 220);
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(messenger.sendConfiguration).toHaveBeenCalledWith(
      feederId,
      expect.objectContaining({
        revision: 2,
        authorizedPets: [
          {
            petId: petResult.pet.id,
            tagUid: '04A3B2C1D2',
            dailyLimitGrams: 220,
          },
        ],
      }),
    );
  });

  it('ejecuta onboarding completo en una sola operación usando DEFAULT_FEEDER_ID si aún no hay telemetría', async () => {
    const defaultFeederId = '550e8400-e29b-41d4-a716-446655440000';
    process.env.DEFAULT_FEEDER_ID = defaultFeederId;

    const identity = new User('user-2', 'luis@example.com', 'luis@example.com');
    const result = await onboardingService.setup(identity, {
      userName: 'Luis',
      pet: {
        name: 'Michi',
        species: 'Gato',
        dailyLimitGrams: 90,
        tagUid: 'AABBCCDD',
      },
    });

    expect(result.user.name).toBe('Luis');
    expect(result.feeder?.id).toBe(defaultFeederId);
    expect(result.feeder?.authorizedPetIds.has(result.pet!.id)).toBe(true);
    expect(result.feeder?.desiredRevision).toBe(1);
    expect(result.tag?.uid).toBe('AABBCCDD');
    expect(result.mqttDispatched).toBe(true);

    // Un segundo usuario no puede robar el alimentador ya reclamado.
    const secondUser = new User(
      'user-3',
      'otro@example.com',
      'otro@example.com',
    );
    const secondProfile = await onboardingService.createProfileWithAutoLink(
      secondUser,
      { name: 'Otro' },
    );
    expect(secondProfile.linkedFeeder).toBeNull();
  });
});
