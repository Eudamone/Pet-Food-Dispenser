import { readFileSync } from 'node:fs';

export type MqttConnectionConfig = {
  url: string;
  username?: string;
  password?: string;
  ca?: Buffer;
  rejectUnauthorized: boolean;
};

const LOCAL_HOSTS = ['localhost', '127.0.0.1', '[::1]'];

export function resolveMqttConfig(): MqttConnectionConfig {
  const address = process.env.MQTT_URL;
  if (!address) {
    throw new Error('MQTT_URL no está configurada.');
  }

  const url = new URL(address);
  const local =
    LOCAL_HOSTS.includes(url.hostname) ||
    process.env.MQTT_ALLOW_INSECURE === 'true';

  if (url.protocol !== 'mqtts:' && !(local && url.protocol === 'mqtt:')) {
    throw new Error('MQTT_URL debe usar MQTT sobre TLS.');
  }
  if (!local && (!process.env.MQTT_USERNAME || !process.env.MQTT_PASSWORD)) {
    throw new Error('Configura las credenciales del broker MQTT.');
  }

  return {
    url: url.toString(),
    username: process.env.MQTT_USERNAME,
    password: process.env.MQTT_PASSWORD,
    ca: process.env.MQTT_CA_FILE
      ? readFileSync(process.env.MQTT_CA_FILE)
      : undefined,
    rejectUnauthorized: true,
  };
}
