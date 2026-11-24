import { Test } from '@nestjs/testing';
import { ValidationPipe, type INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PresentationModule } from '../dist/presentation/presentation.module.js';
import { PersistenceModule } from '../dist/infrastructure/persistence/persistence.module.js';
import { PetService } from '../dist/presentation/http/services/pet.service.js';
import { AuthService } from '../dist/presentation/http/services/auth.service.js';
import { DeviceService } from '../dist/presentation/http/services/device.service.js';
import { AccessSession } from '../dist/domain/entities/AccessSession.js';
import { DispensingRecord } from '../dist/domain/entities/DispensingRecord.js';
import { Pet } from '../dist/domain/entities/Pet.js';
import { USER_REPOSITORY } from '../dist/domain/repositories/user.repository.js';
import { PET_REPOSITORY } from '../dist/domain/repositories/pet.repository.js';
import { DEVICE_REPOSITORY } from '../dist/domain/repositories/device.repository.js';
import {
  FEEDING_REPOSITORY,
  type PlanRevision,
} from '../dist/domain/repositories/feeding.repository.js';
import { DEVICE_MESSENGER } from '../dist/domain/ports/device-messenger.port.js';
import { FeederDevice } from '../dist/domain/entities/FeederDevice.js';
import { User } from '../dist/domain/entities/User.js';
import type { FeedingPlan } from '../dist/domain/entities/FeedingPlan.js';

describe('API y autorización', () => {
  let app: INestApplication;
  let deviceService: DeviceService;
  const connection = {
    connected: false,
    sendConfiguration: vi.fn(),
    sendManualDispense: vi.fn(),
    sendServoPosition: vi.fn(),
    confirmResults: vi.fn(),
  };
  const user = new User('owner-1', 'Ana', 'ana@example.com');
  const feederId = 'ae4db682-69a8-41ce-a90f-c6d29c9ce994';
  const feeder = new FeederDevice(feederId, user.id, 'Cocina', 100);
  const users = { findById: vi.fn(async () => user) };
  const pets = {
    listByOwner: vi.fn(async () => []),
    listTagsByOwner: vi.fn(async () => []),
    findById: vi.fn(async (): Promise<Pet | null> => null),
    savePet: vi.fn(async (pet: Pet) => pet),
  };
  const devices = {
    exists: vi.fn(async (id: string) => id === feederId),
    requireDevice: vi.fn(async () => undefined),
    findById: vi.fn(async (ownerId: string, id: string) =>
      ownerId === user.id && id === feederId ? feeder : null,
    ),
    listByOwner: vi.fn(async () => [feeder]),
    create: vi.fn(async (device: FeederDevice) => device),
    saveDevice: vi.fn(async (device: FeederDevice) => device),
  };
  const plans = {
    saveAccess: vi.fn(async (_session: AccessSession) => undefined),
    saveDispensing: vi.fn(async () => undefined),
    findDispensing: vi.fn(async (): Promise<DispensingRecord | null> => null),
    listAccess: vi.fn(async (): Promise<AccessSession[]> => []),
    listDispensing: vi.fn(async () => []),
    listAccessByDay: vi.fn(async (): Promise<AccessSession[]> => []),
    findPlanByDevice: vi.fn(async (): Promise<FeedingPlan | null> => null),
    savePlan: vi.fn(
      async (
        _ownerId: string,
        _plan: FeedingPlan,
        revision: number,
      ): Promise<PlanRevision> => ({
        desiredRevision: revision + 1,
        appliedRevision: 0,
      }),
    ),
  };

  beforeAll(async () => {
    const fixture = await Test.createTestingModule({
      imports: [
        PersistenceModule.register({ driver: 'memory' }),
        PresentationModule,
      ],
    })
      .overrideProvider(USER_REPOSITORY)
      .useValue(users)
      .overrideProvider(PET_REPOSITORY)
      .useValue(pets)
      .overrideProvider(DEVICE_REPOSITORY)
      .useValue(devices)
      .overrideProvider(FEEDING_REPOSITORY)
      .useValue(plans)
      .overrideProvider(AuthService)
      .useValue({
        currentUser: vi.fn(async () => user),
        createProfile: vi.fn(async () => user),
      })
      .overrideProvider(DEVICE_MESSENGER)
      .useValue(connection)
      .compile();
    expect(fixture.get(PetService)).toBeDefined();
    deviceService = fixture.get(DeviceService);
    app = fixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
  });

  it('expone el estado del backend', async () => {
    await request(app.getHttpServer()).get('/').expect(200, { status: 'ok' });
  });

  it('rechaza solicitudes sin sesión', async () => {
    await request(app.getHttpServer()).get('/pets').expect(401);
  });

  it('confirma una visita únicamente después de guardar el resultado', async () => {
    const event = {
      id: 'access-1',
      kind: 'access',
      petId: '40ab954e-2476-447d-90d9-1284021596c8',
      tagUid: '00FF',
      accountingDay: '2026-11-08',
      status: 'closed',
      openedAt: '2026-11-08T15:00:00Z',
      closedAt: '2026-11-08T15:01:00Z',
    };
    plans.saveAccess.mockRejectedValueOnce(new Error('Fallo de escritura'));
    await expect(deviceService.synchronize(feederId, event)).rejects.toThrow(
      'Fallo de escritura',
    );
    expect(connection.confirmResults).not.toHaveBeenCalled();

    await deviceService.synchronize(feederId, event);
    const [visit] = plans.saveAccess.mock.calls.at(-1)!;
    expect(visit.status).toBe('closed');
    expect(visit).not.toHaveProperty('initialGrams');
    expect(connection.confirmResults).toHaveBeenCalledWith(feederId, [
      event.id,
    ]);

    plans.listAccess.mockResolvedValueOnce([visit]);
    await request(app.getHttpServer())
      .get('/feeders/' + feederId + '/access')
      .set('Authorization', 'Bearer test')
      .expect(200)
      .expect(({ body }) =>
        expect(body[0]).toMatchObject({ id: event.id, consumedGrams: null }),
      );

    pets.findById.mockResolvedValueOnce(new Pet(event.petId, user.id, 'Luna'));
    plans.listAccessByDay.mockResolvedValueOnce([visit]);
    await request(app.getHttpServer())
      .get('/feeders/' + feederId + '/pets/' + event.petId + '/consumption')
      .query({ day: event.accountingDay })
      .set('Authorization', 'Bearer test')
      .expect(200)
      .expect(({ body }) =>
        expect(body).toMatchObject({
          measuredGrams: null,
          remainingGrams: null,
          sessionCount: 1,
          budgetStatus: 'unavailable',
        }),
      );
  });

  it('consulta el plan solo para un equipo del usuario', async () => {
    const api = request(app.getHttpServer());
    await api.get('/feeders/' + feederId + '/plan').expect(401);
    await api
      .get('/feeders/451fb170-3085-46f1-867d-00c73054fa76/plan')
      .set('Authorization', 'Bearer test')
      .expect(404);
    expect(plans.findPlanByDevice).not.toHaveBeenCalled();
    await api
      .get('/feeders/' + feederId + '/plan')
      .set('Authorization', 'Bearer test')
      .expect(200, { plan: null, desiredRevision: 0, appliedRevision: 0 });
  });

  it('valida los horarios y devuelve una revisión pendiente al guardar', async () => {
    const api = request(app.getHttpServer());
    const payload = {
      expectedRevision: 0,
      enabled: true,
      maxDailyDispensedGrams: 160,
      slots: [{ time: '07:00', days: [1, 2], targetGrams: 40, enabled: true }],
    };
    await api
      .put('/feeders/' + feederId + '/plan')
      .set('Authorization', 'Bearer test')
      .send({ ...payload, slots: [{ ...payload.slots[0], targetGrams: 110 }] })
      .expect(400);
    await api
      .put('/feeders/' + feederId + '/plan')
      .set('Authorization', 'Bearer test')
      .send({ ...payload, slots: [payload.slots[0], payload.slots[0]] })
      .expect(400);
    expect(plans.savePlan).not.toHaveBeenCalled();
    const response = await api
      .put('/feeders/' + feederId + '/plan')
      .set('Authorization', 'Bearer test')
      .send(payload)
      .expect(200);
    expect(response.body.desiredRevision).toBe(1);
    expect(response.body.appliedRevision).toBe(0);
    expect(response.body.plan.slots).toEqual([
      { ...payload.slots[0], id: expect.any(String) },
    ]);
    expect(plans.savePlan).toHaveBeenCalledWith(
      user.id,
      expect.objectContaining({ deviceId: feederId }),
      0,
    );
  });

  it('rechaza un plan con 17 horarios antes de persistirlo', async () => {
    const previousCalls = plans.savePlan.mock.calls.length;
    const response = await request(app.getHttpServer())
      .put('/feeders/' + feederId + '/plan')
      .set('Authorization', 'Bearer test')
      .send({
        expectedRevision: 0,
        enabled: true,
        maxDailyDispensedGrams: 100,
        slots: Array.from({ length: 17 }, (_, index) => ({
          time: String(index).padStart(2, '0') + ':00',
          days: [1],
          targetGrams: 1,
          enabled: true,
        })),
      })
      .expect(400);
    expect(response.body.message).toContain(
      'El alimentador admite hasta 16 horarios.',
    );
    expect(plans.savePlan).toHaveBeenCalledTimes(previousCalls);
  });

  it('consulta las mascotas usando el propietario verificado', async () => {
    await request(app.getHttpServer())
      .get('/pets')
      .set('Authorization', 'Bearer test')
      .expect(200, []);
    expect(pets.listByOwner).toHaveBeenCalledWith('owner-1');
  });

  it('ignora un propietario enviado por el cliente y conserva el de la sesión', async () => {
    const response = await request(app.getHttpServer())
      .post('/pets')
      .set('Authorization', 'Bearer test')
      .send({ name: 'Luna', ownerId: 'another-owner' })
      .expect(201);
    expect(response.body.ownerId).toBe('owner-1');
    expect(response.body.dailyLimitGrams).toBeNull();
  });

  it('rechaza un límite negativo antes de guardar', async () => {
    const calls = pets.savePet.mock.calls.length;
    await request(app.getHttpServer())
      .post('/pets')
      .set('Authorization', 'Bearer test')
      .send({ name: 'Luna', dailyLimitGrams: -1 })
      .expect(400);
    expect(pets.savePet.mock.calls.length).toBe(calls);
  });

  it('no devuelve mascotas ajenas o inexistentes', async () => {
    await request(app.getHttpServer())
      .get('/pets/11111111-1111-4111-8111-111111111111')
      .set('Authorization', 'Bearer test')
      .expect(404);
    expect(pets.findById).toHaveBeenCalledWith(
      'owner-1',
      '11111111-1111-4111-8111-111111111111',
    );
  });

  it('autoriza y revoca mascotas en el alimentador e incrementa desiredRevision', async () => {
    const petId = '22222222-2222-4222-8222-222222222222';
    const pet = new Pet(petId, user.id, 'Max');
    pet.setDailyLimit(80);
    pets.findById.mockResolvedValueOnce(pet);

    const authResponse = await request(app.getHttpServer())
      .put(`/feeders/${feederId}/pets/${petId}`)
      .set('Authorization', 'Bearer test')
      .expect(200);
    expect(authResponse.body.authorizedPetIds).toContain(petId);
    expect(authResponse.body.desiredRevision).toBeGreaterThan(0);

    const revokeResponse = await request(app.getHttpServer())
      .delete(`/feeders/${feederId}/pets/${petId}`)
      .set('Authorization', 'Bearer test')
      .expect(200);
    expect(revokeResponse.body.authorizedPetIds).not.toContain(petId);
  });

  it('rechaza la mascota autorizada número 17 sin modificar el equipo', async () => {
    const ids = Array.from(
      { length: 16 - feeder.authorizedPetIds.size },
      (_, index) => 'limit-pet-' + index,
    );
    for (const id of ids) feeder.addAuthorizedPet(id);
    const petId = '00000000-0000-4000-8000-000000000017';
    pets.findById.mockResolvedValueOnce(new Pet(petId, user.id, 'Luna'));
    try {
      const response = await request(app.getHttpServer())
        .put(`/feeders/${feederId}/pets/${petId}`)
        .set('Authorization', 'Bearer test')
        .expect(400);
      expect(response.body.message).toBe(
        'El alimentador admite hasta 16 mascotas autorizadas.',
      );
      expect(feeder.authorizedPetIds.size).toBe(16);
      expect(feeder.isPetAuthorized(petId)).toBe(false);
    } finally {
      for (const id of ids) feeder.removeAuthorizedPet(id);
    }
  });

  it('mantiene la apertura en 10 segundos con clientes anteriores', async () => {
    const path = `/feeders/${feederId}/plan`;
    const payload = { expectedRevision: 0, maxDailyDispensedGrams: 100, enabled: false, slots: [] };
    const api = request(app.getHttpServer());
    await api.put(path).set('Authorization', 'Bearer test').send(payload).expect(200)
      .expect(({ body }) => expect(body.plan.foodOpenSeconds).toBe(10));
    await api.put(path).set('Authorization', 'Bearer test')
      .send({ ...payload, foodOpenSeconds: 17 }).expect(200)
      .expect(({ body }) => expect(body.plan.foodOpenSeconds).toBe(10));
  });

  it('controla cada servo y espera el resultado del dispositivo', async () => {
    const path = `/feeders/${feederId}/servos`;
    const api = request(app.getHttpServer());
    feeder.updateObservedState(new Date(), 'closed', null);
    connection.connected = true;
    try {
      await api.post(path).set('Authorization', 'Bearer test')
        .send({ servo: 'food', position: 'other' }).expect(400);
      for (const [servo, position, applied] of [
        ['food', 'open', true],
        ['access', 'closed', false],
      ] as const) {
        const { body } = await api.post(path).set('Authorization', 'Bearer test')
          .send({ servo, position }).expect(202);
        expect(body.status).toBe('pending');
        expect(connection.sendServoPosition).toHaveBeenLastCalledWith(
          feederId, expect.objectContaining({ requestId: body.requestId, servo, position }),
        );
        await deviceService.synchronize(feederId, {
          id: body.requestId, kind: 'servoResult', applied,
        });
        await api.get(`${path}/${body.requestId}`).set('Authorization', 'Bearer test').expect(200)
          .expect(({ body: result }) => expect(result.status).toBe(applied ? 'applied' : 'rejected'));
      }
    } finally {
      connection.connected = false;
    }
  });

  it('rechaza la dispensación manual mientras el broker está desconectado', async () => {
    connection.connected = false;
    await request(app.getHttpServer())
      .post(`/feeders/${feederId}/dispense`)
      .set('Authorization', 'Bearer test')
      .send({ targetGrams: 35, requestId: 'offline-request' })
      .expect(503);
    expect(connection.sendManualDispense).not.toHaveBeenCalled();
  });

  it('despacha solicitud de dispensación manual al firmware y sincroniza el resultado', async () => {
    connection.connected = true;
    const response = await request(app.getHttpServer())
      .post(`/feeders/${feederId}/dispense`)
      .set('Authorization', 'Bearer test')
      .send({ targetGrams: 35, requestId: 'manual-req-01' })
      .expect(202);
    expect(response.body).toMatchObject({
      requestId: 'manual-req-01',
      deviceId: feederId,
      targetGrams: 35,
      status: 'pending',
    });
    expect(connection.sendManualDispense).toHaveBeenCalledWith(
      feederId,
      expect.objectContaining({
        kind: 'manualDispense',
        requestId: 'manual-req-01',
        targetGrams: 35,
      }),
    );

    await deviceService.synchronize(feederId, {
      id: 'manual-req-01',
      kind: 'dispensing',
      source: 'manual',
      targetGrams: 35,
      startedAt: '2026-11-19T14:00:00Z',
      status: 'completed',
      finishedAt: '2026-11-19T14:00:25Z',
    });
    expect(plans.saveDispensing).toHaveBeenCalled();
    expect(connection.confirmResults).toHaveBeenCalledWith(feederId, [
      'manual-req-01',
    ]);
  });

  it('reutiliza el comando pendiente y rechaza otra cantidad con el mismo identificador', async () => {
    const body = { targetGrams: 20, requestId: 'pending-retry' };
    const first = await request(app.getHttpServer())
      .post(`/feeders/${feederId}/dispense`)
      .set('Authorization', 'Bearer test')
      .send(body)
      .expect(202);
    const firstCommand = connection.sendManualDispense.mock.calls.at(-1)![1];
    await new Promise((resolve) => setTimeout(resolve, 10));
    const second = await request(app.getHttpServer())
      .post(`/feeders/${feederId}/dispense`)
      .set('Authorization', 'Bearer test')
      .send(body)
      .expect(202);
    expect(second.body.requestedAt).toBe(first.body.requestedAt);
    expect(connection.sendManualDispense.mock.calls.at(-1)![1]).toBe(
      firstCommand,
    );
    const previousCalls = connection.sendManualDispense.mock.calls.length;
    await request(app.getHttpServer())
      .post(`/feeders/${feederId}/dispense`)
      .set('Authorization', 'Bearer test')
      .send({ ...body, targetGrams: 21 })
      .expect(409);
    expect(connection.sendManualDispense).toHaveBeenCalledTimes(previousCalls);
  });

  it('devuelve el resultado persistido sin republicar y rechaza cambios de cantidad u origen', async () => {
    const record = new DispensingRecord(
      'already-completed',
      feederId,
      'manual',
      20,
    );
    record.markStarted(new Date('2026-11-19T14:00:00Z'));
    record.markCompleted(new Date('2026-11-19T14:00:01Z'));
    connection.connected = false;
    const previousCalls = connection.sendManualDispense.mock.calls.length;
    plans.findDispensing.mockResolvedValueOnce(record);
    const response = await request(app.getHttpServer())
      .post(`/feeders/${feederId}/dispense`)
      .set('Authorization', 'Bearer test')
      .send({ targetGrams: 20, requestId: record.id })
      .expect(202);
    expect(response.body).toMatchObject({
      status: 'completed',
      dispatched: false,
    });
    expect(plans.findDispensing).toHaveBeenCalledWith(
      user.id,
      feederId,
      record.id,
    );
    plans.findDispensing.mockResolvedValueOnce(record);
    await request(app.getHttpServer())
      .post(`/feeders/${feederId}/dispense`)
      .set('Authorization', 'Bearer test')
      .send({ targetGrams: 21, requestId: record.id })
      .expect(409);
    const scheduled = new DispensingRecord(
      'schedule-collision',
      feederId,
      'schedule',
      20,
      'slot-1',
    );
    plans.findDispensing.mockResolvedValueOnce(scheduled);
    await request(app.getHttpServer())
      .post(`/feeders/${feederId}/dispense`)
      .set('Authorization', 'Bearer test')
      .send({ targetGrams: 20, requestId: scheduled.id })
      .expect(409);
    expect(connection.sendManualDispense).toHaveBeenCalledTimes(previousCalls);
    connection.connected = true;
  });

  it('expone alimentadores descubiertos por MQTT y permite onboarding en un paso', async () => {
    const discoveredId = '99999999-9999-4999-8999-999999999999';
    await deviceService.synchronize(discoveredId, {
      id: 'obs-discovered-1',
      kind: 'observation',
      at: new Date(Date.now() - 1000).toISOString(),
      gate: 'closed',
      fault: null,
    });

    const discovered = await request(app.getHttpServer())
      .get('/feeders/discovered')
      .set('Authorization', 'Bearer test')
      .expect(200);
    expect(discovered.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          deviceId: discoveredId,
          source: 'mqtt',
        }),
      ]),
    );

    const onboarded = await request(app.getHttpServer())
      .post('/onboarding')
      .set('Authorization', 'Bearer test')
      .send({
        userName: 'Ana',
        pet: { name: 'Toby', dailyLimitGrams: 120 },
      })
      .expect(201);
    expect(onboarded.body.user.id).toBe(user.id);
    expect(onboarded.body.feeder.id).toBe(feederId);
    expect(onboarded.body.pet.name).toBe('Toby');
  });

  it('expone tags RFID escaneados recientemente vía GET /feeders/:id/rfid-scanned', async () => {
    await deviceService.synchronize(feederId, {
      id: 'scan-e2e-1',
      kind: 'rfidScanned',
      tagUid: '04a3b2c1d2',
      at: new Date(Date.now() - 1000).toISOString(),
    });
    expect(connection.confirmResults).toHaveBeenCalledWith(feederId, [
      'scan-e2e-1',
    ]);

    const response = await request(app.getHttpServer())
      .get(`/feeders/${feederId}/rfid-scanned`)
      .set('Authorization', 'Bearer test')
      .expect(200);
    expect(response.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          tagUid: '04A3B2C1D2',
          alreadyRegistered: false,
          assignedPetId: null,
        }),
      ]),
    );
  });
});
