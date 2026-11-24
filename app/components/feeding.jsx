import { useState } from 'react';
import { Text } from 'react-native';
import { statusText } from './dashboard';
import {
  Button,
  Card,
  Choice,
  Copy,
  Feedback,
  Field,
  Row,
  Title,
  confirmDelete,
  dateLabel,
  positiveNumber,
  styles,
  useAction,
} from './ui';

const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

function SlotForm({ slot, busy, onSave, close }) {
  const [time, setTime] = useState(slot?.time || '');
  const [grams, setGrams] = useState(slot?.targetGrams?.toString() || '');
  const [days, setDays] = useState(slot?.days || []);
  const [enabled, setEnabled] = useState(slot?.enabled ?? true);
  const action = useAction();
  async function submit() {
    await action.run(async () => {
      if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time))
        throw new Error('Escribe la hora en formato de 24 horas: HH:mm.');
      if (!days.length) throw new Error('Selecciona al menos un día.');
      const result = await onSave({
        ...(slot?.id ? { id: slot.id } : {}),
        time,
        days: [...days].sort((a, b) => a - b),
        targetGrams: positiveNumber(grams, 'La porción'),
        enabled,
      });
      if (result) close();
    });
  }
  return (
    <Card>
      <Text style={styles.heading}>
        {slot ? 'Editar horario' : 'Nuevo horario'}
      </Text>
      <Field
        label="Hora (24 horas)"
        value={time}
        onChangeText={setTime}
        placeholder="HH:mm"
        keyboardType="numbers-and-punctuation"
        maxLength={5}
      />
      <Field
        label="Porción estimada (g)"
        value={grams}
        onChangeText={setGrams}
        keyboardType="decimal-pad"
      />
      <Copy>Días</Copy>
      <Row>
        {dayNames.map((day, index) => (
          <Choice
            key={day}
            title={day}
            selected={days.includes(index)}
            onPress={() =>
              setDays(
                days.includes(index)
                  ? days.filter((item) => item !== index)
                  : [...days, index],
              )
            }
          />
        ))}
      </Row>
      <Choice
        title={enabled ? 'Horario activo' : 'Horario desactivado'}
        selected={enabled}
        onPress={() => setEnabled(!enabled)}
      />
      <Feedback action={action} />
      <Button
        title="Guardar horario"
        disabled={busy || action.busy}
        onPress={submit}
      />
      <Button
        title="Cancelar"
        secondary
        disabled={busy || action.busy}
        onPress={close}
      />
    </Card>
  );
}

export function Schedules({ feeder, plan, revision, request, refresh }) {
  const [editing, setEditing] = useState(null);
  const [daily, setDaily] = useState(
    plan?.maxDailyDispensedGrams?.toString() || '',
  );
  const [opening, setOpening] = useState(
    String(plan?.foodOpenSeconds ?? 10),
  );
  const action = useAction();
  if (!feeder)
    return (
      <>
        <Title>Horarios</Title>
        <Card>
          <Copy>Primero vincula tu alimentador desde Inicio.</Copy>
        </Card>
      </>
    );
  const slots = plan?.slots || [];
  async function save(nextSlots, enabled = plan?.enabled ?? false) {
    return action.run(async () => {
      const maxDailyDispensedGrams = positiveNumber(daily, 'El máximo diario');
      const foodOpenSeconds = Number(opening);
      if (!Number.isInteger(foodOpenSeconds) || foodOpenSeconds < 1 || foodOpenSeconds > 60)
        throw new Error('La apertura debe durar entre 1 y 60 segundos.');
      await request(`/feeders/${feeder.id}/plan`, {
        method: 'PUT',
        body: {
          expectedRevision: revision,
          maxDailyDispensedGrams,
          foodOpenSeconds,
          enabled,
          slots: nextSlots,
        },
      });
      await refresh();
    }, 'Plan guardado. Esperando confirmación del alimentador.');
  }
  async function saveSlot(slot) {
    const next = slot.id
      ? slots.map((item) => (item.id === slot.id ? slot : item))
      : [...slots, slot];
    return save(next);
  }
  return (
    <>
      <Title>Horarios</Title>
      <Card>
        <Text style={styles.heading}>{feeder.name}</Text>
        <Copy>
          {plan?.enabled ? 'Programación activa' : 'Programación pausada'}
        </Copy>
        <Copy>
          Las porciones son estimadas. No se registra peso ni consumo real.
        </Copy>
        <Field
          label="Máximo diario programado (g)"
          value={daily}
          onChangeText={setDaily}
          keyboardType="decimal-pad"
        />
        <Field
          label="Apertura de la tolva por ciclo (segundos)"
          value={opening}
          onChangeText={setOpening}
          keyboardType="number-pad"
        />
        <Button
          title="Guardar ajustes de dosificación"
          secondary
          disabled={action.busy}
          onPress={() => save(slots)}
        />
        <Button
          title={plan?.enabled ? 'Pausar programación' : 'Activar programación'}
          disabled={
            action.busy ||
            (!plan?.enabled && !slots.some((slot) => slot.enabled))
          }
          onPress={() => save(slots, !plan?.enabled)}
        />
      </Card>
      <Feedback action={action} />
      <Button
        title="Agregar horario"
        secondary
        disabled={action.busy}
        onPress={() => setEditing('new')}
      />
      {editing ? (
        <SlotForm
          key={editing === 'new' ? 'new' : editing.id}
          slot={editing === 'new' ? null : editing}
          busy={action.busy}
          onSave={saveSlot}
          close={() => setEditing(null)}
        />
      ) : null}
      {!slots.length ? (
        <Card>
          <Copy>
            Aún no hay horarios. Define el máximo diario y agrega tu primer
            horario.
          </Copy>
        </Card>
      ) : (
        slots.map((slot) => (
          <Card key={slot.id}>
            <Text style={styles.title}>{slot.time}</Text>
            <Copy>
              {slot.targetGrams} g estimados ·{' '}
              {slot.days.map((day) => dayNames[day]).join(', ')}
            </Copy>
            <Copy>{slot.enabled ? 'Activo' : 'Desactivado'}</Copy>
            <Row>
              <Button
                small
                title="Editar"
                secondary
                disabled={action.busy}
                onPress={() => setEditing(slot)}
              />
              <Button
                small
                title={slot.enabled ? 'Desactivar' : 'Activar'}
                disabled={action.busy}
                onPress={() => {
                  const next = slots.map((item) =>
                    item.id === slot.id
                      ? { ...item, enabled: !item.enabled }
                      : item,
                  );
                  save(next, plan.enabled && next.some((item) => item.enabled));
                }}
              />
              <Button
                small
                title="Eliminar"
                danger
                disabled={action.busy}
                onPress={() =>
                  confirmDelete('¿Eliminar este horario?', () => {
                    const next = slots.filter((item) => item.id !== slot.id);
                    save(
                      next,
                      plan.enabled && next.some((item) => item.enabled),
                    );
                  })
                }
              />
            </Row>
          </Card>
        ))
      )}
    </>
  );
}

export function History({
  feeder,
  pets,
  dispensing,
  access,
  pending = [],
  request,
  refresh,
  rememberRequest,
}) {
  const [type, setType] = useState('dispensing');
  const action = useAction();
  if (!feeder)
    return (
      <>
        <Title>Historial</Title>
        <Card>
          <Copy>Vincula tu alimentador para ver sus registros.</Copy>
        </Card>
      </>
    );
  const waiting = pending.filter(
    (item) =>
      item.deviceId === feeder.id &&
      !dispensing.some((record) => record.id === item.requestId),
  );
  const records =
    type === 'dispensing'
      ? [...dispensing].sort(
          (a, b) =>
            new Date(b.startedAt || b.finishedAt || 0) -
            new Date(a.startedAt || a.finishedAt || 0),
        )
      : [...access].sort(
          (a, b) => new Date(b.openedAt || 0) - new Date(a.openedAt || 0),
        );
  return (
    <>
      <Title>Historial</Title>
      <Row>
        <Choice
          title="Dispensaciones"
          selected={type === 'dispensing'}
          onPress={() => setType('dispensing')}
        />
        <Choice
          title="Visitas RFID"
          selected={type === 'access'}
          onPress={() => setType('access')}
        />
      </Row>
      <Copy>{feeder.name} · Se actualiza automáticamente</Copy>
      <Feedback action={action} />
      {type === 'dispensing'
        ? waiting.map((item) => (
            <Card key={item.requestId}>
              <Text style={styles.heading}>Pendiente de confirmación</Text>
              <Copy>{item.targetGrams} g objetivo · Solicitud manual</Copy>
              <Copy>{dateLabel(item.requestedAt)}</Copy>
              <Copy>
                La solicitud fue enviada. El alimentador aún no ha confirmado el
                resultado.
              </Copy>
              <Button
                title="Reintentar la misma solicitud"
                secondary
                disabled={action.busy}
                onPress={() =>
                  action.run(async () => {
                    const result = await request(
                      `/feeders/${feeder.id}/dispense`,
                      {
                        method: 'POST',
                        body: {
                          targetGrams: item.targetGrams,
                          requestId: item.requestId,
                        },
                      },
                    );
                    await rememberRequest(result);
                    await refresh();
                  }, 'Solicitud reenviada. Esperando confirmación.')
                }
              />
            </Card>
          ))
        : null}
      {!records.length && !(type === 'dispensing' && waiting.length) ? (
        <Card>
          <Copy>
            {type === 'dispensing'
              ? 'Aún no hay dispensaciones registradas.'
              : 'Aún no hay visitas registradas.'}
          </Copy>
        </Card>
      ) : (
        records.map((item) => (
          <Card key={item.id}>
            <Text style={styles.heading}>
              {type === 'dispensing'
                ? `${item.targetGrams} g objetivo`
                : pets.find((pet) => pet.id === item.petId)?.name ||
                  'Mascota eliminada'}
            </Text>
            <Copy>
              {statusText(item.status)}
              {type === 'dispensing'
                ? ` · ${item.source === 'manual' ? 'Manual' : 'Programada'}`
                : ` · RFID ${item.tagUid}`}
            </Copy>
            <Copy>
              Inicio:{' '}
              {dateLabel(
                type === 'dispensing' ? item.startedAt : item.openedAt,
              )}
            </Copy>
            <Copy>
              Fin:{' '}
              {dateLabel(
                type === 'dispensing' ? item.finishedAt : item.closedAt,
              )}
            </Copy>
            {item.reason || item.issue ? (
              <Copy>{item.reason || item.issue}</Copy>
            ) : null}
            {type === 'dispensing' ? (
              <Copy>Cantidad real no medida.</Copy>
            ) : (
              <Copy>Visita registrada; consumo no medido.</Copy>
            )}
          </Card>
        ))
      )}
    </>
  );
}
