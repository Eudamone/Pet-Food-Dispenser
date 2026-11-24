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
    await deviceService.synchronize(feederId, {
      id: 'obs-boot-1',
      kind: 'observation',
      at: observedAt,
      gate: 'closed',
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
      gateState: 'closed',
    });
    const identity = new User('user-1', 'ana@example.com', 'ana@example.com');
    const created = await onboardingService.createProfileWithAutoLink(
      identity,
      { name: 'Ana' },
    );

    expect(created.user.name).toBe('Ana');
    expect(created.linkedFeeder).not.toBeNull();
    expect(created.linkedFeeder?.id).toBe(feederId);
    expect(created.linkedFeeder?.gateState).toBe('closed');
    expect(created.linkedFeeder).not.toHaveProperty('lastBowlGrams');
    expect(await deviceService.listDiscovered()).toHaveLength(0);
    const petResult = await petService.registerPetWithLinks(created.user, {
      name: 'Firulais',
      species: 'Perro',
      dailyLimitGrams: 180,
      tagUid: '04a3b2c1d2',
    });

    expect(petResult.tag?.uid).toBe('04A3B2C1D2');
    expect(petResult.tag?.petId).toBe(petResult.pet.id);
    expect(petResult.authorizedFeederId).toBe(feederId);
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

  it('captura tags RFID escaneados por MQTT (rfidScanned) y permite auto-vincularlos al crear mascota', async () => {
    const feederId = '123e4567-e89b-42d3-a456-426614174000';
    const identity = new User(
      'user-4',
      'carla@example.com',
      'carla@example.com',
    );
    await deviceService.synchronize(feederId, {
      id: 'obs-pilot-1',
      kind: 'observation',
      at: new Date(Date.now() - 2000).toISOString(),
      gate: 'closed',
      fault: null,
    });
    await deviceService.synchronize(feederId, {
      id: 'scan-pilot-1',
      kind: 'rfidScanned',
      tagUid: '0a1b2c3d4e',
      at: new Date(Date.now() - 1000).toISOString(),
    });
    expect(messenger.confirmResults).toHaveBeenCalledWith(feederId, [
      'scan-pilot-1',
    ]);
    const profile = await onboardingService.createProfileWithAutoLink(identity, {
      name: 'Carla',
    });
    expect(profile.linkedFeeder?.id).toBe(feederId);
    const scannedBefore = await deviceService.listScannedTags(
      profile.user,
      feederId,
    );
    expect(scannedBefore).toHaveLength(1);
    expect(scannedBefore[0]).toMatchObject({
      tagUid: '0A1B2C3D4E',
      alreadyRegistered: false,
      assignedPetId: null,
    });
    const petResult = await petService.registerPetWithLinks(profile.user, {
      name: 'Nala',
      dailyLimitGrams: 150,
      autoLinkScannedTag: true,
    });
    expect(petResult.tag?.uid).toBe('0A1B2C3D4E');
    expect(petResult.tag?.petId).toBe(petResult.pet.id);
    expect(petResult.authorizedFeederId).toBe(feederId);
    expect(
      await deviceService.listScannedTags(profile.user, feederId),
    ).toHaveLength(0);

    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(messenger.sendConfiguration).toHaveBeenCalledWith(
      feederId,
      expect.objectContaining({
        revision: 1,
        authorizedPets: [
          {
            petId: petResult.pet.id,
            tagUid: '0A1B2C3D4E',
            dailyLimitGrams: 150,
          },
        ],
      }),
    );
  });
});
