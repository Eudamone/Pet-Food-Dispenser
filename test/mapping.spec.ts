import { DataSource, type EntityTarget, type ObjectLiteral } from 'typeorm';
import { User } from '../dist/domain/entities/User.js';
import { Pet } from '../dist/domain/entities/Pet.js';
import { RfidTag } from '../dist/domain/entities/RfidTag.js';
import { FeederDevice } from '../dist/domain/entities/FeederDevice.js';
import { UserModel } from '../dist/infrastructure/persistence/database/models/user.model.js';
import { PetModel } from '../dist/infrastructure/persistence/database/models/pet.model.js';
import { RfidTagModel } from '../dist/infrastructure/persistence/database/models/rfid-tag.model.js';
import { FeederDeviceModel } from '../dist/infrastructure/persistence/database/models/feeder-device.model.js';
import { FeedingPlanModel } from '../dist/infrastructure/persistence/database/models/feeding-plan.model.js';
import { AccessSessionModel } from '../dist/infrastructure/persistence/database/models/access-session.model.js';
import { DispensingRecordModel } from '../dist/infrastructure/persistence/database/models/dispensing-record.model.js';
import { UserMapper } from '../dist/infrastructure/persistence/database/mappers/user.mapper.js';
import { PetMapper } from '../dist/infrastructure/persistence/database/mappers/pet.mapper.js';
import { RfidTagMapper } from '../dist/infrastructure/persistence/database/mappers/rfid-tag.mapper.js';
import { FeederDeviceMapper } from '../dist/infrastructure/persistence/database/mappers/feeder-device.mapper.js';
import { FeedingPlanMapper } from '../dist/infrastructure/persistence/database/mappers/feeding-plan.mapper.js';
import { AccessSessionMapper } from '../dist/infrastructure/persistence/database/mappers/access-session.mapper.js';

const ownerId = '11111111-1111-4111-8111-111111111111';
const petId = '22222222-2222-4222-8222-222222222222';
const deviceId = '33333333-3333-4333-8333-333333333333';
const database = new DataSource({
  type: 'postgres',
  entities: [
    UserModel,
    PetModel,
    RfidTagModel,
    FeederDeviceModel,
    FeedingPlanModel,
    AccessSessionModel,
    DispensingRecordModel,
  ],
  entitySkipConstructor: true,
});

function hydrate<T extends ObjectLiteral>(
  target: EntityTarget<T>,
  row: Record<string, unknown>,
): T {
  const metadata = database.getMetadata(target);
  const entity = metadata.create(undefined, { fromDeserializer: true }) as T;
  for (const column of metadata.columns) {
    column.setEntityValue(
      entity,
      database.driver.prepareHydratedValue(row[column.databaseName], column),
    );
  }
  return entity;
}

describe('Mapeo del dominio', () => {
  beforeAll(async () => {
    await (
      database as unknown as { buildMetadatas(): Promise<void> }
    ).buildMetadatas();
  });

  it('recupera un solo plan por equipo con horarios de dominio', () => {
    const row = hydrate(FeedingPlanModel, {
      id: '44444444-4444-4444-8444-444444444444',
      deviceId,
      enabled: true,
      maxDailyDispensedGrams: 160,
      slots: [
        {
          id: 'slot-1',
          time: '07:00',
          days: [1],
          targetGrams: 40,
          enabled: true,
        },
      ],
    });
    const plan = FeedingPlanMapper.toDomain(row);
    expect(plan.slots[0].occursOn(1)).toBe(true);
    expect(() => plan.validate(100)).not.toThrow();
    const metadata = database.getMetadata(FeedingPlanModel);
    expect(
      metadata.primaryColumns.map((column) => column.propertyName),
    ).toEqual(['deviceId']);
    expect(metadata.foreignKeys[0]).toMatchObject({
      referencedTablePath: 'feeders',
      onDelete: 'CASCADE',
    });
  });

  it('recupera visitas anteriores y conserva la identidad por equipo', () => {
    const row = hydrate(AccessSessionModel, {
      id: 'visit-1',
      deviceId,
      petId,
      tagUid: '00FF',
      accountingDay: '2026-11-08',
      openedAt: new Date('2026-11-08T15:00:00Z'),
      closedAt: null,
      initialGrams: 30,
      finalGrams: null,
      measurementValid: false,
      status: 'interrupted',
      issue: 'Se perdió la medición final.',
    });
    const session = AccessSessionMapper.toDomain(row);
    expect(session.status).toBe('interrupted');
    expect(session).not.toHaveProperty('initialGrams');
    expect(
      database
        .getMetadata(AccessSessionModel)
        .primaryColumns.map((column) => column.propertyName),
    ).toEqual(['id', 'deviceId']);
    expect(
      database.getMetadata(DispensingRecordModel).foreignKeys[0]
        .referencedTablePath,
    ).toBe('feeders');
    expect(
      database.getMetadata(DispensingRecordModel).foreignKeys[0].onDelete,
    ).toBe('RESTRICT');
    expect(
      database.getMetadata(AccessSessionModel).foreignKeys[0].onDelete,
    ).toBe('RESTRICT');
  });

  it('recupera perfiles con sus métodos y conserva las columnas existentes', () => {
    const row = hydrate(UserModel, {
      id: ownerId,
      name: 'Ana',
      email: 'ana@example.com',
    });
    const user = UserMapper.toDomain(row);
    expect(user).toBeInstanceOf(User);
    expect(user.owns(ownerId)).toBe(true);
    user.rename('Ana María');
    expect(user.name).toBe('Ana María');
    expect(
      database
        .getMetadata(UserModel)
        .columns.map((column) => column.databaseName),
    ).toEqual(['id', 'name', 'email']);
  });

  it('recupera mascotas sin perder la fecha parcial y las validaciones', () => {
    const row = hydrate(PetModel, {
      id: petId,
      ownerId,
      name: 'Luna',
      species: null,
      dailyLimitGrams: 60,
      birthYear: 2022,
      birthMonth: 5,
      birthDay: null,
    });
    const pet = PetMapper.toDomain(row);
    expect(pet).toBeInstanceOf(Pet);
    expect(pet.formatBirthDate()).toBe('05/2022');
    expect(() => pet.setDailyLimit(-1)).toThrow();
    expect(pet.dailyLimitGrams).toBe(60);
    expect(database.getMetadata(PetModel).foreignKeys[0].onDelete).toBe(
      'RESTRICT',
    );
  });

  it('recupera el collar y conserva la restricción de asignación', () => {
    const row = hydrate(RfidTagModel, {
      uid: '00AB',
      ownerId,
      petId,
      active: true,
    });
    const tag = RfidTagMapper.toDomain(row);
    expect(tag).toBeInstanceOf(RfidTag);
    expect(() => tag.assignTo('another-pet')).toThrow();
    tag.unassign();
    tag.assignTo('another-pet');
    expect(tag.petId).toBe('another-pet');
    const metadata = database.getMetadata(RfidTagModel);
    expect(
      metadata.uniques.some((unique) =>
        unique.columns.some((column) => column.propertyName === 'petId'),
      ),
    ).toBe(true);
    expect(
      metadata.foreignKeys.find((key) => key.referencedTablePath === 'pets')
        ?.onDelete,
    ).toBe('SET NULL');
  });

  it('recupera y guarda el conjunto de mascotas autorizadas como JSON', () => {
    const row = hydrate(FeederDeviceModel, {
      id: deviceId,
      ownerId,
      name: 'Comedero',
      maxBowlGrams: 100,
      authorizedPetIds: [petId],
      desiredRevision: 3,
      appliedRevision: 2,
      lastSeenAt: new Date('2026-11-05T15:00:00Z'),
      lastBowlGrams: 20,
      gateState: 'closed',
      lastFault: null,
    });
    const device = FeederDeviceMapper.toDomain(row);
    expect(device.isPetAuthorized(petId)).toBe(true);
    expect(device.hasPendingConfiguration()).toBe(true);
    device.addAuthorizedPet('another-pet');
    const saved = FeederDeviceMapper.toModel(device);
    const column = database
      .getMetadata(FeederDeviceModel)
      .findColumnWithPropertyName('authorizedPetIds')!;
    expect(
      database.driver.preparePersistentValue(
        column.getEntityValue(saved),
        column,
      ),
    ).toBe(JSON.stringify([petId, 'another-pet']));
    const copy = device.authorizedPetIds as Set<string>;
    copy.clear();
    expect(device.isPetAuthorized(petId)).toBe(true);
  });

  it('genera inserciones desde la misma instancia de dominio', () => {
    const device = new FeederDevice(deviceId, ownerId, 'Comedero', 100);
    device.addAuthorizedPet(petId);
    const [sql, parameters] = database
      .createQueryBuilder()
      .insert()
      .into(FeederDeviceModel)
      .values(FeederDeviceMapper.toModel(device))
      .getQueryAndParameters();
    expect(sql).toContain('INSERT INTO "feeders"');
    expect(parameters).toContain(deviceId);
    expect(parameters).toContain(JSON.stringify([petId]));
    expect(database.getMetadata(PetModel).foreignKeys[0].onDelete).toBe(
      'RESTRICT',
    );
  });
});
