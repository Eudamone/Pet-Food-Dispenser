import { useEffect, useState } from 'react';
import { AppState, Text } from 'react-native';
import {
  Button,
  Card,
  Choice,
  Copy,
  Feedback,
  Field,
  Row,
  Title,
  colors,
  dateLabel,
  positiveNumber,
  styles,
  useAction,
} from './ui';

const gateLabels = {
  moving: 'En movimiento',
  closed: 'Cerrada',
  open: 'Abierta',
  opening: 'Abriendo',
  closing: 'Cerrando',
  blocked: 'Bloqueada',
  unknown: 'Sin confirmar',
};

function ServoControls({ feeder, online, request, refresh }) {
  const action = useAction();
  async function move(servo, position) {
    await action.run(async () => {
      const path = `/feeders/${feeder.id}/servos`;
      let result = await request(path, {
        method: 'POST',
        body: { servo, position },
      });
      const deadline = Date.now() + 12000;
      while (result.status === 'pending' && Date.now() < deadline) {
        await new Promise((resolve) => setTimeout(resolve, 600));
        result = await request(`${path}/${result.requestId}`);
      }
      if (result.status !== 'applied')
        throw new Error(result.reason || 'El alimentador no confirmó el movimiento.');
      await refresh();
    }, 'El alimentador aplicó la orden.');
  }

  return (
    <Card>
      <Text style={styles.heading}>Control de compuertas</Text>
      <Copy>Comprueba que el acceso esté despejado antes de cerrarlo.</Copy>
      <Copy>La tolva se cierra sola a los 10 segundos.</Copy>
      {[
        ['access', 'Acceso'],
        ['food', 'Tolva'],
      ].map(([servo, label]) => (
        <Row key={servo}>
          <Button
            small
            title={`Abrir ${label.toLowerCase()}`}
            disabled={!online || action.busy}
            onPress={() => move(servo, 'open')}
          />
          <Button
            small
            secondary
            title={`Cerrar ${label.toLowerCase()}`}
            disabled={!online || action.busy}
            onPress={() => move(servo, 'closed')}
          />
        </Row>
      ))}
      <Feedback action={action} />
    </Card>
  );
}

export function FeederLink({ request, refresh, onSelect }) {
  const [discovered, setDiscovered] = useState([]);
  const [deviceId, setDeviceId] = useState('');
  const [name, setName] = useState('');
  const [capacity, setCapacity] = useState('');
  const [manual, setManual] = useState(false);
  const [scanError, setScanError] = useState('');
  const action = useAction();
  useEffect(() => {
    let active = true;
    let busy = false;
    async function load() {
      if (busy || AppState.currentState !== 'active') return;
      busy = true;
      try {
        const result = await request('/feeders/discovered');
        if (active) {
          setDiscovered(result);
          setScanError('');
        }
      } catch (error) {
        if (active) setScanError(error.message);
      } finally {
        busy = false;
      }
    }
    load();
    const timer = setInterval(load, 5000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [request]);
  async function link() {
    await action.run(async () => {
      if (!deviceId.trim())
        throw new Error(
          'Selecciona un alimentador o escribe su identificador.',
        );
      if (!name.trim()) throw new Error('Escribe el nombre del alimentador.');
      const body = {
        deviceId: deviceId.trim(),
        name: name.trim(),
        maxBowlGrams: positiveNumber(capacity, 'La capacidad'),
      };
      const result = await request(manual ? '/feeders' : '/feeders/claim', {
        method: 'POST',
        body,
      });
      onSelect(result.id);
      await refresh();
      setDeviceId('');
      setName('');
      setCapacity('');
    }, 'Alimentador vinculado.');
  }
  return (
    <Card>
      <Text style={styles.heading}>Vincular alimentador</Text>
      <Copy>
        Enciende el alimentador y conéctalo a la misma red del servidor.
        Aparecerá aquí al enviar su estado.
      </Copy>
      {scanError ? (
        <Copy style={{ color: colors.red }}>{scanError}</Copy>
      ) : null}
      {!discovered.length ? (
        <Copy>Buscando alimentadores disponibles…</Copy>
      ) : (
        <Row>
          {discovered.map((item) => (
            <Choice
              key={item.deviceId}
              title={item.deviceId}
              selected={!manual && deviceId === item.deviceId}
              onPress={() => {
                setManual(false);
                setDeviceId(item.deviceId);
              }}
            />
          ))}
        </Row>
      )}
      <Button
        title={
          manual ? 'Buscar automáticamente' : 'Usar identificador del equipo'
        }
        secondary
        onPress={() => {
          setManual(!manual);
          setDeviceId('');
        }}
      />
      {manual ? (
        <Field
          label="Identificador del alimentador"
          value={deviceId}
          onChangeText={setDeviceId}
          autoCapitalize="none"
          placeholder="UUID configurado en el ESP32"
        />
      ) : null}
      <Field
        label="Nombre"
        value={name}
        onChangeText={setName}
        placeholder="Nombre de tu alimentador"
      />
      <Field
        label="Capacidad nominal del plato (g)"
        value={capacity}
        onChangeText={setCapacity}
        keyboardType="decimal-pad"
      />
      <Button
        title={action.busy ? 'Vinculando…' : 'Vincular'}
        disabled={action.busy}
        onPress={link}
      />
      <Feedback action={action} />
    </Card>
  );
}

export function Dashboard({
  feeder,
  feeders,
  pets,
  plan,
  dispensing,
  pending,
  rememberRequest,
  request,
  refresh,
  onSelect,
  onTab,
}) {
  const [linking, setLinking] = useState(false);
  const [grams, setGrams] = useState('');
  const [pendingRequest, setPendingRequest] = useState(null);
  const [now, setNow] = useState(() => Date.now());
  const action = useAction();
  const online =
    feeder?.lastSeenAt && now - new Date(feeder.lastSeenAt).getTime() < 90000;
  const retryRequest =
    pendingRequest &&
    !dispensing.some(
      (item) =>
        item.id === pendingRequest.requestId &&
        !['pending', 'running'].includes(item.status),
    )
      ? pendingRequest
      : null;
  const latest =
    dispensing.find((item) => item.id === pendingRequest?.requestId) ||
    dispensing[0];
  async function dispense() {
    await action.run(async () => {
      const targetGrams =
        retryRequest?.targetGrams ?? positiveNumber(grams, 'La porción');
      if (targetGrams > feeder.maxBowlGrams)
        throw new Error(
          'La porción supera la capacidad configurada del plato.',
        );
      const requestId =
        retryRequest?.requestId ||
        `app-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      setPendingRequest({ requestId, targetGrams });
      const result = await request(`/feeders/${feeder.id}/dispense`, {
        method: 'POST',
        body: { targetGrams, requestId },
      });
      await rememberRequest(result);
      if (result.requestId)
        setPendingRequest({ requestId: result.requestId, targetGrams });
      await refresh();
    }, 'Solicitud enviada. Revisa el resultado en el historial.');
  }
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 5000);
    return () => clearInterval(timer);
  }, []);
  return (
    <>
      <Title>Inicio</Title>
      {feeder ? (
        <>
          <Card
            style={{
              backgroundColor: colors.purple,
              borderColor: colors.purple,
            }}
          >
            <Text style={[styles.title, { color: colors.white }]}>
              {feeder.name}
            </Text>
            <Copy style={{ color: colors.white }}>
              {online ? 'En línea' : 'Sin conexión reciente'}
            </Copy>
            <Copy style={{ color: colors.white }}>
              Compuerta: {gateLabels[feeder.gateState] || feeder.gateState}
            </Copy>
            <Copy style={{ color: colors.white }}>
              Última conexión: {dateLabel(feeder.lastSeenAt)}
            </Copy>
            {feeder.lastFault ? (
              <Copy style={{ color: colors.yellow }}>
                Aviso: {feeder.lastFault}
              </Copy>
            ) : null}
            <Copy style={{ color: colors.white }}>
              {feeder.configurationPending
                ? 'Esperando confirmación de la configuración'
                : 'Configuración sincronizada'}
            </Copy>
          </Card>
          <Card>
            <Text style={styles.heading}>Alimentación</Text>
            <Copy>
              {plan?.enabled
                ? `${plan.slots.filter((slot) => slot.enabled).length} horarios activos`
                : 'Programación pausada'}
            </Copy>
            <Copy>
              {
                pets.filter((pet) => feeder.authorizedPetIds.includes(pet.id))
                  .length
              }{' '}
              mascotas autorizadas
            </Copy>
            <Button
              title="Ver horarios"
              secondary
              onPress={() => onTab('Horarios')}
            />
          </Card>
          <ServoControls feeder={feeder} online={online} request={request} refresh={refresh} />
          <Card>
            <Text style={styles.heading}>Dispensar ahora</Text>
            <Copy>
              La porción es estimada. El equipo no registra peso ni consumo
              real.
            </Copy>
            <Field
              label="Porción objetivo (g)"
              editable={!action.busy && !retryRequest}
              value={grams}
              onChangeText={(value) => {
                setGrams(value);
              }}
              keyboardType="decimal-pad"
            />
            {retryRequest ? (
              <Button
                title="Preparar otra porción"
                secondary
                disabled={action.busy}
                onPress={() => {
                  setPendingRequest(null);
                  setGrams('');
                }}
              />
            ) : null}
            <Button
              title={
                action.busy
                  ? 'Enviando…'
                  : retryRequest
                    ? 'Reintentar la misma solicitud'
                    : 'Dispensar'
              }
              onPress={dispense}
              disabled={action.busy || !online}
            />
            {!online ? (
              <Copy>
                Espera a que el alimentador esté conectado para dispensar.
              </Copy>
            ) : null}
            <Feedback action={action} />
            {latest ? (
              <Copy>
                Última solicitud: {latest.targetGrams} g objetivo ·{' '}
                {statusText(latest.status)}
              </Copy>
            ) : null}
            {pending.filter(
              (item) =>
                item.deviceId === feeder.id &&
                !dispensing.some((record) => record.id === item.requestId),
            ).length ? (
              <Copy>
                Hay solicitudes pendientes de confirmación. Revisa el historial
                antes de enviar otra porción.
              </Copy>
            ) : null}
            <Button
              title="Ver resultados"
              secondary
              onPress={() => onTab('Historial')}
            />
          </Card>
        </>
      ) : (
        <Card>
          <Text style={styles.heading}>Conecta tu alimentador</Text>
          <Copy>
            Vincula el equipo para programar comidas, registrar mascotas y
            revisar sus visitas.
          </Copy>
        </Card>
      )}
      <Button
        title={
          linking
            ? 'Cerrar vinculación'
            : feeders.length
              ? 'Vincular otro alimentador'
              : 'Buscar alimentador'
        }
        secondary
        onPress={() => setLinking(!linking)}
      />
      {linking || !feeder ? (
        <FeederLink request={request} refresh={refresh} onSelect={onSelect} />
      ) : null}
    </>
  );
}

export function statusText(status) {
  return (
    {
      pending: 'Pendiente',
      running: 'En curso',
      completed: 'Completada',
      skipped: 'Omitida',
      failed: 'Fallida',
      interrupted: 'Interrumpida',
      open: 'Abierta',
      closed: 'Cerrada',
    }[status] || status
  );
}
