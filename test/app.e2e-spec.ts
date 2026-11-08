import { Test } from '@nestjs/testing';
import { ValidationPipe, type INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PresentationModule } from '../dist/presentation/presentation.module.js';
import { RepositoriesModule } from '../dist/repositories/repositories.module.js';
import { PetService } from '../dist/services/pet.service.js';
import { AuthService } from '../dist/services/auth.service.js';
import { DeviceService } from '../dist/services/device.service.js';
import { UserRepository } from '../dist/repositories/user.repository.js';
import { PetRepository } from '../dist/repositories/pet.repository.js';
import { DeviceRepository } from '../dist/repositories/device.repository.js';
import { FeedingRepository } from '../dist/repositories/feeding.repository.js';
import { FeederDevice } from '../dist/domain/FeederDevice.js';
import { User } from '../dist/domain/User.js';

describe('API y autorización', () => {
  let app: INestApplication;
  const user = new User('owner-1', 'Ana', 'ana@example.com');
  const feederId = 'ae4db682-69a8-41ce-a90f-c6d29c9ce994';
  const feeder = new FeederDevice(feederId, user.id, 'Cocina', 100);
  const users = { findById: vi.fn(async () => user) };
  const pets = {
    listByOwner: vi.fn(async () => []),
    findById: vi.fn(async () => null),
    savePet: vi.fn(async (pet) => pet),
  };
  const devices = {
    findById: vi.fn(async (ownerId, id) =>
      ownerId === user.id && id === feederId ? feeder : null,
    ),
  };
  const plans = {
    findPlanByDevice: vi.fn(async () => null),
    savePlan: vi.fn(async (_ownerId, _plan, revision) => ({
      desiredRevision: revision + 1,
      appliedRevision: 0,
    })),
  };

  beforeAll(async () => {
    const fixture = await Test.createTestingModule({
      imports: [PresentationModule],
    })
      .overrideModule(RepositoriesModule)
      .useModule({
        module: class TestRepositoriesModule {},
        providers: [
          { provide: UserRepository, useValue: users },
          { provide: PetRepository, useValue: pets },
          { provide: DeviceRepository, useValue: devices },
          { provide: FeedingRepository, useValue: plans },
        ],
        exports: [
          UserRepository,
          PetRepository,
          DeviceRepository,
          FeedingRepository,
        ],
      })
      .overrideProvider(AuthService)
      .useValue({ currentUser: vi.fn(async () => user) })
      .compile();
    expect(fixture.get(PetService)).toBeDefined();
    expect(fixture.get(DeviceService)).toBeDefined();
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
});
