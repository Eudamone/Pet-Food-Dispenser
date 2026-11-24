import { useState } from 'react';
import { ScrollView, Text } from 'react-native';
import { useSession } from './Session';
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
  styles,
  useAction,
} from './ui';

export function ServerConnection() {
  const { baseUrl, setServer } = useSession();
  const [url, setUrl] = useState(baseUrl);
  const action = useAction();
  return (
    <Card>
      <Text style={styles.heading}>Conexión</Text>
      <Copy>
        Usa la dirección del servidor de tu equipo. El teléfono debe poder
        acceder a esa red.
      </Copy>
      <Field
        label="Dirección del servidor"
        value={url}
        onChangeText={setUrl}
        autoCapitalize="none"
        keyboardType="url"
        placeholder="http://192.168.1.10:3000"
      />
      <Button
        title={action.busy ? 'Conectando…' : 'Conectar y guardar'}
        secondary
        disabled={action.busy}
        onPress={() =>
          action.run(
            () => setServer(url),
            'Conexión guardada. Ya puedes iniciar sesión.',
          )
        }
      />
      <Feedback action={action} />
    </Card>
  );
}

export function AuthScreen() {
  const { authenticate } = useSession();
  const [register, setRegister] = useState(false);
  const [connection, setConnection] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const action = useAction();
  async function submit() {
    await action.run(async () => {
      if (register && !name.trim()) throw new Error('Escribe tu nombre.');
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
        throw new Error('Escribe un correo válido.');
      if (password.length < 8)
        throw new Error('La contraseña debe tener al menos 8 caracteres.');
      await authenticate(register, {
        email: email.trim().toLowerCase(),
        password,
        ...(register ? { name: name.trim() } : {}),
      });
    });
  }
  return (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={[
        styles.content,
        { flexGrow: 1, justifyContent: 'center' },
      ]}
    >
      <Title>Pet Feeder</Title>
      <Copy>Cuida su alimentación, estés donde estés.</Copy>
      <Card>
        <Row>
          <Choice
            title="Ingresar"
            selected={!register}
            onPress={() => setRegister(false)}
          />
          <Choice
            title="Crear cuenta"
            selected={register}
            onPress={() => setRegister(true)}
          />
        </Row>
        {register ? (
          <Field
            label="Nombre"
            value={name}
            onChangeText={setName}
            autoComplete="name"
          />
        ) : null}
        <Field
          label="Correo"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
        />
        <Field
          label="Contraseña"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoCapitalize="none"
          autoComplete={register ? 'new-password' : 'current-password'}
          onSubmitEditing={submit}
        />
        <Feedback action={action} />
        <Button
          title={
            action.busy ? 'Espera…' : register ? 'Crear cuenta' : 'Ingresar'
          }
          disabled={action.busy}
          onPress={submit}
        />
      </Card>
      <Button
        title={connection ? 'Ocultar conexión' : 'Configurar servidor'}
        secondary
        onPress={() => setConnection(!connection)}
      />
      {connection ? <ServerConnection /> : null}
    </ScrollView>
  );
}

export function Settings({ feeder, request, refresh }) {
  const { user, updateUser, logout } = useSession();
  const [name, setName] = useState(user?.name || '');
  const [feederName, setFeederName] = useState(feeder?.name || '');
  const [connection, setConnection] = useState(false);
  const action = useAction();
  return (
    <>
      <Title>Ajustes</Title>
      <Card>
        <Text style={styles.heading}>Mi cuenta</Text>
        <Copy>{user?.email}</Copy>
        <Field label="Nombre" value={name} onChangeText={setName} />
        <Button
          title="Guardar nombre"
          disabled={action.busy}
          onPress={() =>
            action.run(async () => {
              if (!name.trim()) throw new Error('Escribe tu nombre.');
              await updateUser(
                await request('/users/me', {
                  method: 'PATCH',
                  body: { name: name.trim() },
                }),
              );
            }, 'Perfil actualizado.')
          }
        />
      </Card>
      {feeder ? (
        <Card>
          <Text style={styles.heading}>Alimentador</Text>
          <Copy>{feeder.id}</Copy>
          <Field
            label="Nombre del alimentador"
            value={feederName}
            onChangeText={setFeederName}
          />
          <Copy>Última conexión: {dateLabel(feeder.lastSeenAt)}</Copy>
          <Copy>
            Configuración:{' '}
            {feeder.configurationPending
              ? 'Pendiente de recibir en el alimentador'
              : 'Aplicada'}
          </Copy>
          <Button
            title="Guardar alimentador"
            disabled={action.busy}
            onPress={() =>
              action.run(async () => {
                if (!feederName.trim())
                  throw new Error('Escribe el nombre del alimentador.');
                await request(`/feeders/${feeder.id}`, {
                  method: 'PATCH',
                  body: { name: feederName.trim() },
                });
                await refresh();
              }, 'Alimentador actualizado.')
            }
          />
          <Button
            title="Eliminar alimentador"
            danger
            disabled={action.busy}
            onPress={() =>
              confirmDelete('¿Eliminar este alimentador?', () =>
                action.run(async () => {
                  await request(`/feeders/${feeder.id}`, { method: 'DELETE' });
                  await refresh();
                }),
              )
            }
          />
        </Card>
      ) : null}
      <Feedback action={action} />
      <Button
        title="Cambiar conexión"
        secondary
        onPress={() => setConnection(!connection)}
      />
      {connection ? (
        <>
          <Copy>Al cambiar de servidor se cerrará tu sesión.</Copy>
          <ServerConnection />
        </>
      ) : null}
      <Button title="Cerrar sesión" onPress={() => action.run(logout)} />
    </>
  );
}
