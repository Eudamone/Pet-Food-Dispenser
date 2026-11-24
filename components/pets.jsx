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
  confirmDelete,
  dateLabel,
  positiveNumber,
  styles,
  useAction,
} from './ui';

function PetForm({ pet, feeder, request, refresh, close }) {
  const [name, setName] = useState(pet?.name || '');
  const [species, setSpecies] = useState(pet?.species || '');
  const [limit, setLimit] = useState(pet?.dailyLimitGrams?.toString() || '');
  const [year, setYear] = useState(pet?.birthYear?.toString() || '');
  const [month, setMonth] = useState(pet?.birthMonth?.toString() || '');
  const [day, setDay] = useState(pet?.birthDay?.toString() || '');
  const action = useAction();
  async function save() {
    await action.run(async () => {
      if (!name.trim()) throw new Error('Escribe el nombre de tu mascota.');
      const birth = {};
      for (const [key, value] of Object.entries({ year, month, day })) {
        if (value) {
          if (!/^\d+$/.test(value))
            throw new Error('La fecha debe contener solo números.');
          birth[key] = Number(value);
        }
      }
      const body = {
        name: name.trim(),
        species: species.trim() || null,
        ...(limit.trim()
          ? { dailyLimitGrams: positiveNumber(limit, 'La referencia diaria') }
          : {}),
        ...(Object.keys(birth).length ? { birth } : {}),
      };
      if (!pet)
        Object.assign(body, {
          autoLinkScannedTag: false,
          autoAuthorizeFeeder: !!feeder,
          ...(feeder ? { feederId: feeder.id } : {}),
        });
      await request(pet ? `/pets/${pet.id}` : '/pets', {
        method: pet ? 'PATCH' : 'POST',
        body,
      });
      await refresh();
      close();
    });
  }
  return (
    <Card>
      <Text style={styles.heading}>
        {pet ? 'Editar mascota' : 'Nueva mascota'}
      </Text>
      <Field label="Nombre" value={name} onChangeText={setName} />
      <Field
        label="Especie (opcional)"
        value={species}
        onChangeText={setSpecies}
      />
      <Field
        label="Referencia diaria en gramos (opcional)"
        value={limit}
        onChangeText={setLimit}
        keyboardType="decimal-pad"
      />
      <Copy>
        Esta referencia no mide el consumo. El equipo no cuenta con sensor de
        peso.
      </Copy>
      <Copy>Fecha de nacimiento (opcional)</Copy>
      <Field
        label="Año"
        value={year}
        onChangeText={setYear}
        keyboardType="number-pad"
        maxLength={4}
      />
      <Row>
        <Field
          label="Mes"
          value={month}
          onChangeText={setMonth}
          keyboardType="number-pad"
          maxLength={2}
        />
        <Field
          label="Día"
          value={day}
          onChangeText={setDay}
          keyboardType="number-pad"
          maxLength={2}
        />
      </Row>
      <Feedback action={action} />
      <Button
        title={action.busy ? 'Guardando…' : 'Guardar mascota'}
        disabled={action.busy}
        onPress={save}
      />
      <Button
        title="Cancelar"
        secondary
        disabled={action.busy}
        onPress={close}
      />
    </Card>
  );
}

function RfidAssignment({ pet, tags, feeder, request, refresh }) {
  const feederId = feeder?.id;
  const [uid, setUid] = useState('');
  const [scanned, setScanned] = useState([]);
  const [scanError, setScanError] = useState('');
  const action = useAction();
  useEffect(() => {
    if (!feederId) return;
    let active = true;
    let busy = false;
    async function load() {
      if (busy || AppState.currentState !== 'active') return;
      busy = true;
      try {
        const result = await request(`/feeders/${feederId}/rfid-scanned`);
        if (active) {
          setScanned(result);
          setScanError('');
        }
      } catch (error) {
        if (active) setScanError(error.message);
      } finally {
        busy = false;
      }
    }
    load();
    const timer = setInterval(load, 3000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [feederId, request]);
  async function assign() {
    await action.run(async () => {
      const normalized = uid.trim().toUpperCase();
      if (!normalized)
        throw new Error('Selecciona una tarjeta leída o escribe su UID.');
      if (!tags.some((tag) => tag.uid.toUpperCase() === normalized))
        await request('/rfid-tags', {
          method: 'POST',
          body: { uid: normalized },
        });
      await request(`/rfid-tags/${encodeURIComponent(normalized)}/pet`, {
        method: 'PUT',
        body: { petId: pet.id },
      });
      await refresh();
      setUid('');
    }, 'Tarjeta asignada a tu mascota.');
  }
  const assigned = tags.filter((tag) => tag.petId === pet.id);
  return (
    <Card>
      <Text style={styles.heading}>Tarjetas de {pet.name}</Text>
      {assigned.length ? (
        assigned.map((tag) => (
          <Card key={tag.uid}>
            <Copy>
              {tag.uid} · {tag.active ? 'Activa' : 'Desactivada'}
            </Copy>
            <Row>
              <Button
                small
                secondary
                title={tag.active ? 'Desactivar' : 'Activar'}
                disabled={action.busy}
                onPress={() =>
                  action.run(async () => {
                    await request(
                      `/rfid-tags/${encodeURIComponent(tag.uid)}/${tag.active ? 'deactivate' : 'activate'}`,
                      { method: 'PATCH' },
                    );
                    await refresh();
                  })
                }
              />
              <Button
                small
                danger
                title="Desasignar"
                disabled={action.busy}
                onPress={() =>
                  action.run(async () => {
                    await request(
                      `/rfid-tags/${encodeURIComponent(tag.uid)}/pet`,
                      { method: 'DELETE' },
                    );
                    await refresh();
                  })
                }
              />
            </Row>
          </Card>
        ))
      ) : (
        <Copy>Aún no tiene una tarjeta asignada.</Copy>
      )}
      <Copy>
        {feeder
          ? `Acerca la tarjeta al lector de ${feeder.name}. Las lecturas aparecen automáticamente.`
          : 'Vincula un alimentador para leer tarjetas automáticamente.'}
      </Copy>
      {scanError ? (
        <Copy style={{ color: colors.red }}>{scanError}</Copy>
      ) : null}
      {scanned.map((item) => (
        <Choice
          key={item.tagUid}
          title={`${item.tagUid} · ${dateLabel(item.scannedAt)}${item.assignedPetId ? ' · Asignada' : ''}`}
          selected={uid === item.tagUid}
          onPress={() => setUid(item.tagUid)}
        />
      ))}
      {tags.filter((tag) => !tag.petId).length ? (
        <>
          <Copy>Tarjetas sin asignar</Copy>
          <Row>
            {tags
              .filter((tag) => !tag.petId)
              .map((tag) => (
                <Choice
                  key={tag.uid}
                  title={tag.uid}
                  selected={uid === tag.uid}
                  onPress={() => setUid(tag.uid)}
                />
              ))}
          </Row>
        </>
      ) : null}
      <Field
        label="UID de la tarjeta"
        value={uid}
        onChangeText={setUid}
        autoCapitalize="characters"
      />
      <Button title="Asignar tarjeta" disabled={action.busy} onPress={assign} />
      <Feedback action={action} />
    </Card>
  );
}

export function Pets({ pets, tags, feeder, request, refresh }) {
  const [editing, setEditing] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const action = useAction();
  const selected = pets.find((item) => item.id === selectedId);
  return (
    <>
      <Title>Mis mascotas</Title>
      <Button
        title="Agregar mascota"
        secondary
        onPress={() => setEditing('new')}
      />
      {editing ? (
        <PetForm
          key={editing === 'new' ? 'new' : editing.id}
          pet={editing === 'new' ? null : editing}
          feeder={feeder}
          request={request}
          refresh={refresh}
          close={() => setEditing(null)}
        />
      ) : null}
      {!pets.length ? (
        <Card>
          <Copy>Registra tu primera mascota y asígnale su tarjeta RFID.</Copy>
        </Card>
      ) : (
        pets.map((pet) => (
          <Card key={pet.id}>
            <Text style={styles.heading}>{pet.name}</Text>
            <Copy>
              {pet.species || 'Especie sin registrar'}
              {pet.dailyLimitGrams
                ? ` · Referencia diaria ${pet.dailyLimitGrams} g`
                : ''}
            </Copy>
            {pet.birthYear || pet.birthMonth || pet.birthDay ? (
              <Copy>
                Nacimiento: {pet.birthDay || '—'}/{pet.birthMonth || '—'}/
                {pet.birthYear || '—'}
              </Copy>
            ) : null}
            <Copy>
              {tags.find((tag) => tag.petId === pet.id)?.uid
                ? `RFID: ${tags.find((tag) => tag.petId === pet.id).uid}`
                : 'Sin tarjeta RFID'}
            </Copy>
            {feeder ? (
              <Copy>
                {feeder.authorizedPetIds.includes(pet.id)
                  ? `Autorizada en ${feeder.name}`
                  : `Sin acceso a ${feeder.name}`}
              </Copy>
            ) : null}
            <Row>
              <Button
                title="Editar"
                small
                secondary
                onPress={() => setEditing(pet)}
              />
              <Button
                title={
                  selectedId === pet.id ? 'Cerrar tarjetas' : 'Tarjetas RFID'
                }
                small
                secondary
                onPress={() =>
                  setSelectedId(selectedId === pet.id ? null : pet.id)
                }
              />
            </Row>
            {feeder ? (
              <Button
                title={
                  feeder.authorizedPetIds.includes(pet.id)
                    ? 'Quitar acceso al alimentador'
                    : 'Autorizar en este alimentador'
                }
                disabled={action.busy}
                onPress={() =>
                  action.run(async () => {
                    await request(`/feeders/${feeder.id}/pets/${pet.id}`, {
                      method: feeder.authorizedPetIds.includes(pet.id)
                        ? 'DELETE'
                        : 'PUT',
                    });
                    await refresh();
                  })
                }
              />
            ) : null}
            <Button
              title="Eliminar mascota"
              small
              danger
              disabled={action.busy}
              onPress={() =>
                confirmDelete(`¿Eliminar a ${pet.name}?`, () =>
                  action.run(async () => {
                    await request(`/pets/${pet.id}`, { method: 'DELETE' });
                    await refresh();
                  }),
                )
              }
            />
          </Card>
        ))
      )}
      <Feedback action={action} />
      {selected ? (
        <RfidAssignment
          key={`${selected.id}-${feeder?.id || ''}`}
          pet={selected}
          tags={tags}
          feeder={feeder}
          request={request}
          refresh={refresh}
        />
      ) : null}
    </>
  );
}
