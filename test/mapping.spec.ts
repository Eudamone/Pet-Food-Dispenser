import { DataSource, type EntityTarget, type ObjectLiteral } from 'typeorm';
import { User } from '../dist/domain/User.js';
import { Pet } from '../dist/domain/Pet.js';
import { RfidTag } from '../dist/domain/RfidTag.js';
import { FeederDevice } from '../dist/domain/FeederDevice.js';

const ownerId = '11111111-1111-4111-8111-111111111111';
const petId = '22222222-2222-4222-8222-222222222222';
const deviceId = '33333333-3333-4333-8333-333333333333';
const database = new DataSource({
  type: 'postgres',
  entities: [User, Pet, RfidTag, FeederDevice],
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

  it('recupera perfiles con sus métodos y conserva las columnas existentes', () => {
    const user = hydrate(User, {
      id: ownerId,
      name: 'Ana',
      email: 'ana@example.com',
    });
    expect(user).toBeInstanceOf(User);
    expect(user.owns(ownerId)).toBe(true);
    user.rename('Ana María');
    expect(user.name).toBe('Ana María');
    expect(
      database.getMetadata(User).columns.map((column) => column.databaseName),
    ).toEqual(['id', 'name', 'email']);
  });

  it('recupera mascotas sin perder la fecha parcial y las validaciones', () => {
    const pet = hydrate(Pet, {
      id: petId,
      ownerId,
      name: 'Luna',
      species: null,
      dailyLimitGrams: 60,
      birthYear: 2022,
      birthMonth: 5,
      birthDay: null,
    });
    expect(pet).toBeInstanceOf(Pet);
    expect(pet.formatBirthDate()).toBe('05/2022');
    expect(() => pet.setDailyLimit(-1)).toThrow();
    expect(pet.dailyLimitGrams).toBe(60);
  });

  it('recupera el collar y conserva la restricción de asignación', () => {
    const tag = hydrate(RfidTag, { uid: '00AB', ownerId, petId, active: true });
    expect(tag).toBeInstanceOf(RfidTag);
    expect(() => tag.assignTo('another-pet')).toThrow();
    tag.unassign();
    tag.assignTo('another-pet');
    expect(tag.petId).toBe('another-pet');
    const metadata = database.getMetadata(RfidTag);
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
    const device = hydrate(FeederDevice, {
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
    expect(device.isPetAuthorized(petId)).toBe(true);
    expect(device.hasPendingConfiguration()).toBe(true);
    device.addAuthorizedPet('another-pet');
    const column = database
      .getMetadata(FeederDevice)
      .findColumnWithPropertyName('authorizedPetIds')!;
    expect(
      database.driver.preparePersistentValue(
        column.getEntityValue(device),
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
      .into(FeederDevice)
      .values(device)
      .getQueryAndParameters();
    expect(sql).toContain('INSERT INTO "feeders"');
    expect(parameters).toContain(deviceId);
    expect(parameters).toContain(JSON.stringify([petId]));
    expect(database.getMetadata(Pet).foreignKeys[0].onDelete).toBe('RESTRICT');
  });
});
