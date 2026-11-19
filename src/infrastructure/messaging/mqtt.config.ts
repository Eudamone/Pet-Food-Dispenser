import { readFileSync } from 'node:fs';

export type MqttConnectionConfig = {
  url: string;
  username?: string;
  password?: string;
  ca?: Buffer;
  rejectUnauthorized: boolean;
};

const LOCAL_HOSTS = ['localhost', '127.0.0.1', '[::1]'];

/**
 * Valida y normaliza la configuración MQTT del entorno (MQTT_URL).
 * - Exige `mqtts://` salvo para brokers locales (`mqtt://` permitido).
 * - Exige MQTT_USERNAME/MQTT_PASSWORD cuando el broker no es local.
 * - MQTT_CA_FILE es opcional (certificado CA para TLS).
 */
export function resolveMqttConfig(): MqttConnectionConfig {
  const address = process.env.MQTT_URL;
  if (!address) {
    throw new Error('MQTT_URL no está configurada.');
  }

  const url = new URL(address);
  const local = LOCAL_HOSTS.includes(url.hostname);

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
