import { FeedingSlot } from '../dist/domain/FeedingSlot.js';
import { FeedingPlan } from '../dist/domain/FeedingPlan.js';
import { AccessSession } from '../dist/domain/AccessSession.js';
import { DispensingRecord } from '../dist/domain/DispensingRecord.js';
import { DailyConsumption } from '../dist/domain/DailyConsumption.js';
import { DailyAccessControl } from '../dist/domain/DailyAccessControl.js';

const day = '2026-11-05';
const start = new Date('2026-11-06T04:55:00Z');
const end = new Date('2026-11-06T05:05:00Z');

function visit(
  id = 'visit-1',
  petId = 'pet-1',
  deviceId = 'device-1',
  accountingDay = day,
): AccessSession {
  return new AccessSession(id, deviceId, '00AB', petId, accountingDay);
}

describe('Horarios y plan', () => {
  it('crea propuestas sin modificar el horario anterior', () => {
    const days = [1, 2];
    const slot = new FeedingSlot('slot-1', '07:00', days, 40);
    days.push(3);
    expect(slot.days).toEqual([1, 2]);
    expect(slot.withSchedule('08:00', [3]).time).toBe('08:00');
    expect(slot.time).toBe('07:00');
    expect(slot.withTarget(50).targetGrams).toBe(50);
    expect(slot.targetGrams).toBe(40);
    expect(slot.withEnabled(false).occursOn(1)).toBe(false);
    expect(slot.occursOn(1)).toBe(true);
  });

  it.each(['24:00', '7:00', '12:60', '00:00:00'])(
    'rechaza la hora %s',
    (time) => {
      expect(() => new FeedingSlot('slot-1', time, [1], 40)).toThrow();
    },
  );

  it.each([[], [1, 1], [-1], [7], [1.5]])(
    'rechaza días inválidos %s',
    (...days) => {
      expect(() => new FeedingSlot('slot-1', '07:00', days, 40)).toThrow();
    },
  );

  it('rechaza conflictos y conserva intacto el plan', () => {
    const plan = new FeedingPlan('plan-1', 'device-1', 100);
    plan.addSlot(new FeedingSlot('slot-1', '07:00', [1], 40), 60);
    plan.addSlot(new FeedingSlot('slot-2', '08:00', [1], 40), 60);
    plan.enableScheduling(60);
    expect(() =>
      plan.replaceSlot(plan.slots[1].withSchedule('07:00', [1]), 60),
    ).toThrow();
    expect(plan.slots[1].time).toBe('08:00');
    expect(() =>
      plan.addSlot(new FeedingSlot('slot-3', '07:00', [1], 40), 60),
    ).toThrow();
    expect(() =>
      plan.addSlot(new FeedingSlot('slot-1', '09:00', [2], 40), 60),
    ).toThrow();
    expect(plan.slots).toHaveLength(2);
    expect(plan.enabled).toBe(true);
  });

  it('permite horas iguales en distintos días y no suma los objetivos como suministro', () => {
    const plan = new FeedingPlan('plan-1', 'device-1', 20);
    plan.addSlot(new FeedingSlot('slot-1', '07:00', [1], 50), 60);
    plan.addSlot(new FeedingSlot('slot-2', '07:00', [2], 50), 60);
    plan.enableScheduling(60);
    expect(plan.enabled).toBe(true);
    expect(plan.maxDailyDispensedGrams).toBe(20);
  });

  it('comprueba capacidad, activación y horarios existentes', () => {
    const plan = new FeedingPlan('plan-1', 'device-1', 100);
    expect(() => plan.enableScheduling(60)).toThrow();
    expect(() =>
      plan.addSlot(new FeedingSlot('slot-1', '07:00', [1], 61), 60),
    ).toThrow();
    expect(() =>
      plan.replaceSlot(new FeedingSlot('slot-1', '07:00', [1], 40), 60),
    ).toThrow();
    plan.addSlot(new FeedingSlot('slot-1', '07:00', [1], 40), 60);
    plan.enableScheduling(60);
    plan.removeSlot('slot-1');
    expect(plan.enabled).toBe(false);
    expect(plan.slots).toEqual([]);
    expect(() => plan.setMaxDailyDispensed(NaN)).toThrow();
    expect(plan.maxDailyDispensedGrams).toBe(100);
  });
});

describe('Visitas y consumo', () => {
  it('calcula el consumo y conserva el día de apertura al cruzar medianoche', () => {
    const session = visit();
    session.open(30, start);
    session.close(18, end, 1);
    expect(session.consumedGrams()).toBe(12);
    expect(session.accountingDay).toBe(day);
    expect(() => session.open(20, start)).toThrow();
    expect(() => session.markInterrupted('reinicio')).toThrow();
  });

  it('no permite mutar las fechas desde fuera de la visita', () => {
    const session = visit();
    const at = new Date(start);
    session.open(30, at);
    at.setFullYear(2000);
    session.openedAt!.setFullYear(2001);
    expect(session.openedAt).toEqual(start);
  });

  it('no cambia el estado cuando falla la fecha o la tolerancia', () => {
    const session = visit();
    session.open(30, start);
    expect(() => session.close(20, new Date(start.getTime() - 1), 1)).toThrow();
    expect(() => session.close(20, end, -1)).toThrow();
    expect(() => session.close(NaN, end, 1)).toThrow();
    expect(session.status).toBe('open');
    expect(session.finalGrams).toBeNull();
  });

  it('conserva la incertidumbre por lecturas ausentes, aumentos o invalidación', () => {
    for (const finalGrams of [null, 35]) {
      const session = visit();
      session.open(30, start);
      session.close(finalGrams, end, 1);
      expect(session.consumedGrams()).toBeNull();
    }
    const session = visit();
    session.open(30, start);
    session.invalidateMeasurement('Se añadió comida.');
    session.close(20, end, 1);
    expect(session.consumedGrams()).toBeNull();
    expect(session.issue).toBe('Se añadió comida.');
  });

  it('tolera variaciones pequeñas y no inventa consumo negativo', () => {
    const session = visit();
    session.open(30, start);
    session.close(30.5, null, 1);
    expect(session.consumedGrams()).toBe(0);
    expect(session.closedAt).toBeNull();
  });

  it('filtra el contexto, evita duplicados y cuenta visitas desconocidas', () => {
    const session = visit();
    session.open(30, start);
    session.close(18, end, 1);
    const interrupted = visit('visit-2');
    interrupted.open(18, start);
    interrupted.markInterrupted('Reinicio.');
    const other = visit('visit-3', 'pet-2');
    const summary = DailyConsumption.fromSessions('pet-1', 'device-1', day, [
      session,
      session,
      interrupted,
      other,
      visit('visit-4', 'pet-1', 'device-2'),
      visit('visit-5', 'pet-1', 'device-1', '2026-11-06'),
    ]);
    expect(summary.measuredTotal()).toBe(12);
    expect(summary.unknownSessions).toBe(1);
    expect(summary.hasCompleteMeasurements()).toBe(false);
  });

  it('usa la última versión recibida para cada identificador de visita', () => {
    const pending = visit();
    const closed = visit();
    closed.open(30, start);
    closed.close(20, end, 1);
    const summary = DailyConsumption.fromSessions('pet-1', 'device-1', day, [
      pending,
      closed,
    ]);
    expect(summary.measuredTotal()).toBe(10);
    expect(summary.hasCompleteMeasurements()).toBe(true);
  });

  it.each(['2026-02-30', '2026-13-01', '2026-2-01', '0000-01-01', 'invalid'])(
    'rechaza el día %s',
    (invalidDay) => {
      expect(() => visit('visit-1', 'pet-1', 'device-1', invalidDay)).toThrow();
      expect(() =>
        DailyConsumption.fromSessions('pet-1', 'device-1', invalidDay, []),
      ).toThrow();
      expect(() => new DailyAccessControl('device-1', invalidDay)).toThrow();
    },
  );
});

describe('Presupuesto individual', () => {
  const policy = new DailyAccessControl('device-1', day);
  const session = visit();
  session.open(60, start);
  session.close(15, end, 1);
  const summary = DailyConsumption.fromSessions('pet-1', 'device-1', day, [
    session,
  ]);

  it('calcula el saldo y limita a cero cuando se alcanza o reduce el máximo', () => {
    expect(policy.evaluate('pet-1', 60, summary)).toEqual({
      status: 'available',
      remainingGrams: 15,
    });
    expect(policy.remainingGrams('pet-1', 60, summary)).toEqual({
      value: 15,
      reason: null,
    });
    expect(policy.evaluate('pet-1', 30, summary)).toEqual({
      status: 'limit_reached',
      remainingGrams: 0,
    });
  });

  it.each([null, 0, -1, NaN, Infinity])(
    'no inventa presupuesto con un máximo %s',
    (limit) => {
      expect(policy.evaluate('pet-1', limit, summary)).toEqual({
        status: 'limit_not_configured',
        remainingGrams: null,
      });
    },
  );

  it('rechaza datos de otra mascota, equipo o día', () => {
    expect(policy.evaluate('pet-2', 60, summary).status).toBe(
      'invalid_context',
    );
    expect(
      new DailyAccessControl('device-2', day).evaluate('pet-1', 60, summary)
        .status,
    ).toBe('invalid_context');
    expect(
      new DailyAccessControl('device-1', '2026-11-06').evaluate(
        'pet-1',
        60,
        summary,
      ).status,
    ).toBe('invalid_context');
  });

  it('una visita desconocida solo afecta al presupuesto de esa mascota', () => {
    const unknown = visit('unknown');
    unknown.markInterrupted('Sin cierre.');
    const incomplete = DailyConsumption.fromSessions('pet-1', 'device-1', day, [
      unknown,
    ]);
    expect(policy.remainingGrams('pet-1', 60, incomplete)).toEqual({
      value: null,
      reason: 'incomplete_measurements',
    });
    const other = DailyConsumption.fromSessions('pet-2', 'device-1', day, [
      unknown,
    ]);
    expect(policy.evaluate('pet-2', 60, other)).toEqual({
      status: 'available',
      remainingGrams: 60,
    });
  });
});

describe('Dispensaciones', () => {
  it('calcula lo servido y permite completar con cero añadido', () => {
    const record = new DispensingRecord(
      'record-1',
      'device-1',
      'schedule',
      40,
      'slot-1',
    );
    record.markStarted(15, start);
    record.markCompleted(40, end, 1);
    expect(record.dispensedGrams()).toBe(25);
    expect(() => record.markFailed('Error.')).toThrow();
    const full = new DispensingRecord('record-2', 'device-1', 'manual', 40);
    full.markStarted(50, start);
    full.markCompleted(50, end, 1);
    expect(full.dispensedGrams()).toBe(0);
  });

  it('distingue una omisión, un fallo parcial y una interrupción', () => {
    const skipped = new DispensingRecord('record-1', 'device-1', 'manual', 40);
    skipped.markSkipped('Sin presupuesto.');
    expect(skipped.dispensedGrams()).toBe(0);
    const partial = new DispensingRecord('record-2', 'device-1', 'manual', 40);
    partial.markStarted(15, start);
    expect(() => partial.markSkipped('Omitir.')).toThrow();
    partial.markFailed('Atasco.', 22, end);
    expect(partial.dispensedGrams()).toBe(7);
    const interrupted = new DispensingRecord(
      'record-3',
      'device-1',
      'manual',
      40,
    );
    interrupted.markStarted(15, start);
    interrupted.markInterrupted('Reinicio.');
    expect(interrupted.dispensedGrams()).toBeNull();
    expect(interrupted.finishedAt).toBeNull();
  });

  it('rechaza pesos incoherentes, exceso de objetivo y fechas anteriores sin alterar el registro', () => {
    const record = new DispensingRecord('record-1', 'device-1', 'manual', 40);
    record.markStarted(15, start);
    expect(() => record.markCompleted(20, end, 1)).toThrow();
    expect(() => record.markCompleted(80, end, 1)).toThrow();
    expect(() =>
      record.markCompleted(40, new Date(start.getTime() - 1), 1),
    ).toThrow();
    expect(() => record.markFailed('Atasco.', NaN, end)).toThrow();
    expect(() => record.markInterrupted('')).toThrow();
    expect(record.status).toBe('running');
    expect(record.finalGrams).toBeNull();
  });

  it('exige horario para solicitudes programadas y no lo permite en las manuales', () => {
    expect(
      () => new DispensingRecord('record-1', 'device-1', 'schedule', 40),
    ).toThrow();
    expect(
      () =>
        new DispensingRecord('record-1', 'device-1', 'manual', 40, 'slot-1'),
    ).toThrow();
  });
});
