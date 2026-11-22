import { readDeviceResult } from '../dist/presentation/http/services/device-result.js';
import { FeedingSlot } from '../dist/domain/entities/FeedingSlot.js';
import { FeedingPlan } from '../dist/domain/entities/FeedingPlan.js';
import { AccessSession } from '../dist/domain/entities/AccessSession.js';
import { DispensingRecord } from '../dist/domain/entities/DispensingRecord.js';

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

  it.each(['24:00', '7:00', '12:60', '00:00:00', '07:00\n'])(
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

describe('Visitas', () => {
  it('registra apertura y cierre sin mediciones y conserva el día', () => {
    const session = visit();
    session.open(start);
    session.close(end);
    expect(session.status).toBe('closed');
    expect(session.accountingDay).toBe(day);
    expect(session.closedAt).toEqual(end);
    expect(() => session.open(start)).toThrow();
    expect(() => session.markInterrupted('Reinicio.')).toThrow();
    expect(session).not.toHaveProperty('initialGrams');
    expect(session).not.toHaveProperty('measurementValid');
  });

  it('protege las fechas y rechaza un cierre anterior a la apertura', () => {
    const session = visit();
    const at = new Date(start);
    expect(() => session.close(end)).toThrow();
    expect(() => session.open(new Date(NaN))).toThrow();
    session.open(at);
    at.setFullYear(2000);
    session.openedAt!.setFullYear(2001);
    expect(session.openedAt).toEqual(start);
    expect(() => session.close(new Date(start.getTime() - 1))).toThrow();
    expect(() => session.close(new Date(NaN))).toThrow();
    expect(session.status).toBe('open');
    session.close(end);
    session.closedAt!.setFullYear(2001);
    expect(session.closedAt).toEqual(end);
  });

  it('registra interrupciones incluso antes de abrir', () => {
    const session = visit();
    expect(() => session.markInterrupted(' ')).toThrow();
    session.markInterrupted('Reinicio.');
    expect(session.status).toBe('interrupted');
    expect(session.issue).toBe('Reinicio.');
    expect(session.openedAt).toBeNull();
    expect(() => session.close(end)).toThrow();
  });

  it.each(['2026-02-30', '2026-13-01', '2026-2-01', '0000-01-01', 'invalid'])(
    'rechaza el día %s',
    (invalidDay) => {
      expect(() => visit('visit-1', 'pet-1', 'device-1', invalidDay)).toThrow();
    },
  );
});

describe('Dispensaciones', () => {
  it('registra la finalización reportada por el equipo sin exigir peso', () => {
    const record = new DispensingRecord(
      'record-1',
      'device-1',
      'schedule',
      40,
      'slot-1',
    );
    expect(() => record.markCompleted(end)).toThrow();
    record.markStarted(start);
    record.markCompleted(end);
    expect(record.status).toBe('completed');
    expect(record.targetGrams).toBe(40);
    expect(record.finishedAt).toEqual(end);
    expect(record).not.toHaveProperty('initialGrams');
    expect(record).not.toHaveProperty('measurementValid');
    expect(() => record.markFailed('Error.')).toThrow();
  });

  it('distingue omisiones, fallos e interrupciones', () => {
    const skipped = new DispensingRecord('record-1', 'device-1', 'manual', 40);
    skipped.markSkipped('Horario desactivado.');
    expect(skipped.status).toBe('skipped');
    const failed = new DispensingRecord('record-2', 'device-1', 'manual', 40);
    failed.markStarted(start);
    expect(() => failed.markSkipped('Omitir.')).toThrow();
    failed.markFailed('Atasco.', end);
    expect(failed.status).toBe('failed');
    expect(failed.reason).toBe('Atasco.');
    const interrupted = new DispensingRecord(
      'record-3',
      'device-1',
      'manual',
      40,
    );
    interrupted.markStarted(start);
    interrupted.markInterrupted('Reinicio.');
    expect(interrupted.status).toBe('interrupted');
    expect(interrupted.finishedAt).toBeNull();
  });

  it('rechaza fechas inválidas sin alterar el registro', () => {
    const record = new DispensingRecord('record-1', 'device-1', 'manual', 40);
    expect(() => record.markStarted(new Date(NaN))).toThrow();
    record.markStarted(start);
    expect(() => record.markCompleted(new Date(start.getTime() - 1))).toThrow();
    expect(() => record.markCompleted(new Date(NaN))).toThrow();
    expect(() => record.markFailed('Atasco.', new Date(NaN))).toThrow();
    expect(() => record.markInterrupted('')).toThrow();
    expect(record.status).toBe('running');
    expect(record.finishedAt).toBeNull();
  });

  it('exige horario para solicitudes programadas y valida la porción solicitada', () => {
    expect(
      () => new DispensingRecord('record-1', 'device-1', 'schedule', 40),
    ).toThrow();
    expect(
      () =>
        new DispensingRecord('record-1', 'device-1', 'manual', 40, 'slot-1'),
    ).toThrow();
    expect(
      () => new DispensingRecord('record-1', 'device-1', 'manual', 0),
    ).toThrow();
  });
});

describe('Eventos de equipo sin sensor de peso', () => {
  it('acepta observaciones sin peso e ignora campos de versiones anteriores', () => {
    const observation = {
      id: 'obs-1',
      kind: 'observation',
      at: start.toISOString(),
      gate: 'closed',
    };
    const expected = {
      id: 'obs-1',
      kind: 'observation',
      at: start,
      gate: 'closed',
      fault: null,
    };
    expect(readDeviceResult('device-1', observation)).toEqual(expected);
    expect(
      readDeviceResult('device-1', { ...observation, weight: 'sin sensor' }),
    ).toEqual(expected);
  });

  it('acepta una visita finalizada sin mediciones', () => {
    const event = readDeviceResult('device-1', {
      id: 'visit-1',
      kind: 'access',
      petId: '22222222-2222-4222-8222-222222222222',
      tagUid: '00AB',
      accountingDay: day,
      status: 'closed',
      openedAt: start.toISOString(),
      closedAt: end.toISOString(),
    });
    expect(event.kind).toBe('access');
    if (event.kind !== 'access') throw new Error('Tipo de evento inesperado.');
    expect(event.record.status).toBe('closed');
    expect(event.record.closedAt).toEqual(end);
  });

  it.each(['completed', 'failed', 'interrupted', 'skipped'])(
    'procesa una dispensación %s sin lecturas ni tolerancia',
    (status) => {
      const event = readDeviceResult('device-1', {
        id: 'dispense-1',
        kind: 'dispensing',
        source: 'manual',
        targetGrams: 30,
        status,
        reason: 'Resultado del equipo.',
        finishedAt: end.toISOString(),
        ...(status === 'skipped' ? {} : { startedAt: start.toISOString() }),
      });
      if (event.kind !== 'dispensing')
        throw new Error('Tipo de evento inesperado.');
      expect(event.record.status).toBe(status);
      expect(event.record).not.toHaveProperty('finalGrams');
    },
  );

  it('exige fechas de apertura y cierre para resultados finalizados', () => {
    expect(() =>
      readDeviceResult('device-1', {
        id: 'visit-1',
        kind: 'access',
        petId: '22222222-2222-4222-8222-222222222222',
        tagUid: '00AB',
        accountingDay: day,
        status: 'closed',
        closedAt: end.toISOString(),
      }),
    ).toThrow();
    expect(() =>
      readDeviceResult('device-1', {
        id: 'dispense-1',
        kind: 'dispensing',
        source: 'manual',
        targetGrams: 30,
        status: 'completed',
        startedAt: start.toISOString(),
      }),
    ).toThrow();
  });
});
