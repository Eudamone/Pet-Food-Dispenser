# Pet Feeder

La app Android se conecta por HTTP al backend NestJS. El backend guarda las cuentas, los planes y el historial en PostgreSQL y se comunica por MQTT con el ESP32.

## Servidor local en Windows

Con Docker Desktop iniciado, ejecuta desde PowerShell en la raíz del repositorio:

```powershell
./tools/start-local.ps1
```

El script levanta PostgreSQL, Mosquitto y la API, y anuncia `petfeeder.local` en la red. Para una interfaz con otro nombre, usa `-InterfaceAlias`. La app toma `http://petfeeder.local:3000` por defecto. Si el teléfono o la red no resuelven mDNS, usa en Ajustes la IPv4 del PC, con el puerto 3000. El ESP32 busca el mismo nombre para MQTT y admite una IP fija en su configuración. El ESP32 necesita Wi-Fi de 2,4 GHz. Puede usar la zona móvil del PC cuando el router solo anuncia 5 GHz. Ambos clientes deben poder alcanzar el PC.

Los puertos TCP 3000 (API), 1883 (MQTT) y UDP 5353 (mDNS) deben quedar accesibles desde la LAN que usa el montaje. El broker requiere credenciales y el usuario del ESP32 solo puede operar los temas de su UUID. Mantén esta configuración en la red local. PostgreSQL queda dentro de Docker.

### Cambiar de red para la presentación

Conecta el PC a la red elegida y comprueba que esté disponible en 2,4 GHz para el ESP32. Con el servidor encendido y el ESP32 por USB, ejecuta `./tools/configure-wifi.ps1 -Port COM4` desde PowerShell. El script toma la Wi-Fi activa del PC, configura el ESP32 por USB y comprueba que vuelva a MQTT. El equipo guarda esa red y una IP de respaldo. Puedes indicar otro SSID de la misma LAN con `-Ssid`, y el argumento `-AskPassword` permite ingresar su clave sin mostrarla.

## ESP32 y montaje final

Para compilar `FeederFirmware`, usa ESP32 Dev Module y las bibliotecas ArduinoJson, PubSubClient, RTClib, Adafruit PN532 y Adafruit BusIO. Copia `Secrets.h.example` a `Secrets.h` y completa la Wi-Fi. El usuario MQTT es el UUID de `DeviceConfig.h` y su contraseña es `MQTT_DEVICE_PASSWORD` de `backend/.env.local`. Los archivos con credenciales quedan fuera de Git.

| Componente | Conexión a ESP32 |
| --- | --- |
| PN532 V3 en I²C, selector 1 ON y selector 2 OFF | SDA 16, SCL 17, `Wire1`, 3,3 V |
| DS3231 | SDA 21, SCL 22, `Wire`, 3,3 V |
| FC-51 | OUT 33, presencia activa en LOW, 3,3 V |
| D2000St, acceso | PWM 25, 2500 µs cerrado y 1500 µs abierto |
| D1090PL, tolva | PWM 26, 1600 µs cerrado y 800 µs abierto |

Los servos usan 5 V externos y GND común. Desconecta el positivo de VIN externo al programar por USB. El DS3231 conserva la hora local de Bogotá. El firmware usa esa hora para los horarios y convierte a UTC al publicar eventos.

El FC-51 se usa para detectar a la mascota. La posición de la compuerta se estima por tiempo. Mantén despejada la trayectoria al probar movimientos y haz las pruebas de banco sin mascota.

## Uso de la app

- **Inicio.** Vincula un alimentador, consulta su conexión y estado, envía una dosis manual en gramos estimados y abre o cierra cada compuerta. El acceso queda abierto tras una orden manual hasta que se cierre. La tolva se cierra a los 10 segundos o al pulsar Cerrar.
- **Mascotas.** Crea, edita y elimina mascotas. Registra etiquetas RFID desde el lector o por UID, asígnalas y activa o retira permisos de acceso.
- **Horarios.** Crea, edita, pausa o elimina horarios por hora y día y configura el máximo diario estimado. La tolva permanece abierta 10 segundos por ciclo. Calibra los gramos por ciclo con el alimento que vas a usar.
- **Historial.** Consulta visitas RFID y resultados de dispensación manual o programada. Una solicitud pendiente puede volver a enviarse con el mismo identificador.
- **Ajustes.** Registra una cuenta local, inicia o cierra sesión, edita el perfil y cambia la dirección del servidor o el nombre del alimentador.

El montaje mide presencia e identifica etiquetas. Las porciones son estimadas por ciclos, sin medición de peso o consumo.
