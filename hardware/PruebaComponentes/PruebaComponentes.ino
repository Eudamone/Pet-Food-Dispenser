/*
  Prueba individual del alimentador.
  Placa: ESP32 Dev Module (Arduino-ESP32 3.x).
  Bibliotecas: Adafruit PN532 y Adafruit BusIO.
  PN532 V3 en modo I2C (selector 1 ON, selector 2 OFF).
  PN532: SDA GPIO16, SCL GPIO17 (Wire1).
  DS3231: SDA GPIO21, SCL GPIO22 (Wire).
  Monitor Serie: 115200 baudios, con nueva linea o NL y CR.
*/

#include <Arduino.h>
#include <Adafruit_PN532.h>
#include <Wire.h>
#include <stdlib.h>
#include <string.h>

constexpr uint8_t GPIO_PESADO = 25;
constexpr uint8_t GPIO_LIVIANO = 26;
constexpr uint8_t GPIO_FC = 33;
constexpr uint8_t GPIO_RFID_SDA = 16;
constexpr uint8_t GPIO_RFID_SCL = 17;
constexpr uint8_t GPIO_RELOJ_SDA = 21;
constexpr uint8_t GPIO_RELOJ_SCL = 22;
constexpr uint32_t FRECUENCIA_I2C_HZ = 100000;
constexpr uint8_t DIRECCION_DS3231 = 0x68;

constexpr uint16_t PESADO_MIN_US = 1500;
constexpr uint16_t PESADO_MAX_US = 2500;
constexpr uint16_t LIVIANO_MIN_US = 800;
constexpr uint16_t LIVIANO_MAX_US = 1600;
constexpr uint32_t PERIODO_PWM_US = 20000;
constexpr uint8_t RESOLUCION_PWM = 16;
constexpr uint32_t INTERVALO_RFID_MS = 100;
constexpr uint32_t AUSENCIA_TAG_MS = 1000;
constexpr uint32_t ESTABILIDAD_FC_MS = 50;
constexpr uint32_t INTERVALO_RELOJ_MS = 1000;

enum class Modo { Menu, Rfid, Pesado, Liviano, Fc, Reloj };
void cambiarModo(Modo siguiente);

Adafruit_PN532 lector(-1, -1, &Wire1);  // I2C sin IRQ ni reset.
Modo modo = Modo::Menu;
uint8_t pinServoActivo = 0;
bool busRfidIniciado = false;
bool busRelojIniciado = false;
uint32_t ultimaConsulta = 0;

uint8_t ultimoUid[10];
uint8_t longitudUltimoUid = 0;
uint32_t ultimoTagVisto = 0;

bool fcBruto = false;
bool fcEstable = false;
uint32_t fcCambio = 0;

char linea[48];
size_t longitudLinea = 0;
bool lineaLarga = false;

void mostrarMenu() {
  Serial.println();
  Serial.println("PRUEBA DE COMPONENTES");
  Serial.println("  rfid     Lee etiquetas en el PN532");
  Serial.println("  sp 1500  Mueve el servo pesado (1500-2500 us)");
  Serial.println("  sl 800   Mueve el servo liviano (800-1600 us)");
  Serial.println("  fc       Muestra si el FC-51 detecta un objeto");
  Serial.println("  reloj    Lee la hora del DS3231 cada segundo");
  Serial.println("Escribe menu para salir del modo actual.");
}

bool configurarRfPn532(uint8_t* comando, uint8_t longitud) {
  // Tras el ACK, se consume la respuesta de RFConfiguration (D5 33).
  const uint8_t respuesta[] = {0x01, 0x00, 0x00, 0xFF, 0x02, 0xFE, 0xD5, 0x33, 0xF8, 0x00};
  if (!lector.sendCommandCheckAck(comando, longitud) ||
      Wire1.requestFrom(PN532_I2C_ADDRESS, sizeof(respuesta), true) != sizeof(respuesta)) {
    return false;
  }
  for (uint8_t esperado : respuesta) {
    if (Wire1.read() != esperado) return false;
  }
  return true;
}

void cambiarModo(Modo siguiente) {
  if (modo == siguiente) return;

  if (pinServoActivo != 0) {
    ledcDetach(pinServoActivo);
    pinMode(pinServoActivo, OUTPUT);
    digitalWrite(pinServoActivo, LOW);
    pinServoActivo = 0;
  }

  if (modo == Modo::Rfid) {
    uint8_t apagarCampo[] = {PN532_COMMAND_RFCONFIGURATION, 0x01, 0x00};
    if (!configurarRfPn532(apagarCampo, sizeof(apagarCampo))) {
      Serial.println("PN532: no se pudo confirmar que el campo RFID se apago.");
    }
  }

  modo = siguiente;
}

void iniciarRfid() {
  if (modo == Modo::Rfid) {
    longitudUltimoUid = 0;
    Serial.println("PN532: acerca una etiqueta.");
    return;
  }

  cambiarModo(Modo::Menu);
  if (!busRfidIniciado) busRfidIniciado = Wire1.begin(GPIO_RFID_SDA, GPIO_RFID_SCL, FRECUENCIA_I2C_HZ);
  if (!busRfidIniciado) {
    Serial.println("PN532: no se pudo iniciar I2C en GPIO16 y GPIO17.");
    return;
  }
  if (!lector.begin() || !lector.getFirmwareVersion()) {
    Serial.println("PN532 sin respuesta por I2C. Revisa selector (1 ON, 2 OFF), SDA16 y SCL17.");
    return;
  }

  // Los reintentos finitos permiten volver al menu sin acercar una etiqueta.
  uint8_t reintentos[] = {PN532_COMMAND_RFCONFIGURATION, 0x05, 0xFF, 0x01, 0x02};
  if (!lector.SAMConfig() || !configurarRfPn532(reintentos, sizeof(reintentos))) {
    Serial.println("PN532 responde, pero no se pudo configurar la lectura.");
    return;
  }

  cambiarModo(Modo::Rfid);
  longitudUltimoUid = 0;
  ultimaConsulta = millis() - INTERVALO_RFID_MS;
  Serial.println("PN532 listo por I2C. Acerca una etiqueta.");
}

void probarRfid(uint32_t ahora) {
  if (ahora - ultimaConsulta < INTERVALO_RFID_MS) return;
  ultimaConsulta = ahora;

  uint8_t uid[sizeof(ultimoUid)];
  uint8_t longitud = 0;
  if (!lector.readPassiveTargetID(PN532_MIFARE_ISO14443A, uid, &longitud, 350) ||
      longitud == 0 || longitud > sizeof(uid)) {
    return;
  }

  const uint32_t lectura = millis();
  if (longitud != longitudUltimoUid || memcmp(uid, ultimoUid, longitud) != 0 ||
      lectura - ultimoTagVisto >= AUSENCIA_TAG_MS) {
    Serial.print("PN532: etiqueta detectada, UID ");
    for (uint8_t i = 0; i < longitud; ++i) {
      if (i != 0) Serial.print(':');
      Serial.printf("%02X", static_cast<unsigned>(uid[i]));
    }
    Serial.println();
  }
  memcpy(ultimoUid, uid, longitud);
  longitudUltimoUid = longitud;
  ultimoTagVisto = lectura;
}

void imprimirFc(bool detecta) {
  Serial.println(detecta ? "FC-51: objeto detectado." : "FC-51: libre.");
}

void iniciarFc() {
  cambiarModo(Modo::Fc);
  pinMode(GPIO_FC, INPUT_PULLDOWN);
  fcBruto = digitalRead(GPIO_FC) == LOW;
  fcEstable = fcBruto;
  fcCambio = millis();
  imprimirFc(fcEstable);
}

void probarFc(uint32_t ahora) {
  const bool detecta = digitalRead(GPIO_FC) == LOW;
  if (detecta != fcBruto) {
    fcBruto = detecta;
    fcCambio = ahora;
  }
  if (fcBruto != fcEstable && ahora - fcCambio >= ESTABILIDAD_FC_MS) {
    fcEstable = fcBruto;
    imprimirFc(fcEstable);
  }
}

uint8_t desdeBcd(uint8_t valor) {
  return (valor >> 4) * 10 + (valor & 0x0F);
}

void iniciarReloj() {
  cambiarModo(Modo::Menu);
  if (!busRelojIniciado) busRelojIniciado = Wire.begin(GPIO_RELOJ_SDA, GPIO_RELOJ_SCL, FRECUENCIA_I2C_HZ);
  if (!busRelojIniciado) {
    Serial.println("DS3231: no se pudo iniciar I2C en GPIO21 y GPIO22.");
    return;
  }
  cambiarModo(Modo::Reloj);
  ultimaConsulta = millis() - INTERVALO_RELOJ_MS;
}

void probarReloj(uint32_t ahora) {
  if (ahora - ultimaConsulta < INTERVALO_RELOJ_MS) return;
  ultimaConsulta = ahora;

  // Se lee la hora (0x00-0x02) junto con el estado del oscilador (0x0F).
  uint8_t registros[16];
  Wire.beginTransmission(DIRECCION_DS3231);
  Wire.write(0x00);
  if (Wire.endTransmission(false) != 0 ||
      Wire.requestFrom(DIRECCION_DS3231, sizeof(registros), true) != sizeof(registros)) {
    Serial.println("DS3231 sin respuesta. Revisa SDA, SCL y la alimentacion.");
    return;
  }

  for (uint8_t& registro : registros) registro = Wire.read();
  const uint8_t segundos = desdeBcd(registros[0] & 0x7F);
  const uint8_t minutos = desdeBcd(registros[1] & 0x7F);
  const uint8_t hora = registros[2];
  const unsigned horas = (hora & 0x40)
      ? desdeBcd(hora & 0x1F) % 12 + ((hora & 0x20) ? 12 : 0)
      : desdeBcd(hora & 0x3F);
  Serial.printf("DS3231: %02u:%02u:%02u%s\n", horas,
                static_cast<unsigned>(minutos), static_cast<unsigned>(segundos),
                (registros[0x0F] & 0x80) ? " (hora sin validar: oscilador detenido previamente)" : "");
}

void probarServo(bool pesado, const char* argumento) {
  const char* comando = pesado ? "sp" : "sl";
  const uint8_t pin = pesado ? GPIO_PESADO : GPIO_LIVIANO;
  const uint16_t minimo = pesado ? PESADO_MIN_US : LIVIANO_MIN_US;
  const uint16_t maximo = pesado ? PESADO_MAX_US : LIVIANO_MAX_US;
  const Modo modoServo = pesado ? Modo::Pesado : Modo::Liviano;

  if (argumento == nullptr) {
    cambiarModo(modoServo);
    Serial.printf("%s seleccionado. Escribe %s <pulso>, de %u a %u us.\n",
                  comando, comando, static_cast<unsigned>(minimo), static_cast<unsigned>(maximo));
    return;
  }

  char* fin = nullptr;
  const long pulso = strtol(argumento, &fin, 10);
  if (fin == argumento || *fin != '\0' || pulso < minimo || pulso > maximo) {
    Serial.printf("Usa %s seguido de un pulso entre %u y %u us.\n",
                  comando, static_cast<unsigned>(minimo), static_cast<unsigned>(maximo));
    return;
  }

  cambiarModo(modoServo);
  if (pinServoActivo == 0) {
    if (!ledcAttach(pin, 1000000 / PERIODO_PWM_US, RESOLUCION_PWM)) {
      Serial.println("No se pudo iniciar el PWM del servo.");
      return;
    }
    pinServoActivo = pin;
  }

  const uint32_t duty = (static_cast<uint32_t>(pulso) * (1UL << RESOLUCION_PWM)
                         + PERIODO_PWM_US / 2) / PERIODO_PWM_US;
  if (ledcWrite(pin, duty)) {
    Serial.printf("%s: %ld us en GPIO%u.\n", comando, pulso, static_cast<unsigned>(pin));
  } else {
    cambiarModo(Modo::Menu);
    Serial.println("No se pudo enviar el pulso al servo.");
  }
}

void procesarComando(char* entrada) {
  const char* comando = strtok(entrada, " \t");
  if (comando == nullptr) return;

  const char* argumento = strtok(nullptr, " \t");
  if (strcmp(comando, "sp") == 0 || strcmp(comando, "sl") == 0) {
    if (strtok(nullptr, " \t") != nullptr) {
      Serial.println("Envia un solo valor despues de sp o sl.");
      return;
    }
    probarServo(strcmp(comando, "sp") == 0, argumento);
  } else if (argumento != nullptr) {
    Serial.println("Comando invalido. Escribe menu para ver las opciones.");
  } else if (strcmp(comando, "rfid") == 0) {
    iniciarRfid();
  } else if (strcmp(comando, "fc") == 0) {
    iniciarFc();
  } else if (strcmp(comando, "reloj") == 0) {
    iniciarReloj();
  } else if (strcmp(comando, "menu") == 0) {
    cambiarModo(Modo::Menu);
    mostrarMenu();
  } else {
    Serial.println("Comando desconocido. Escribe menu para ver las opciones.");
  }
}

void leerComandos() {
  while (Serial.available()) {
    const char caracter = static_cast<char>(Serial.read());
    if (caracter == '\n' || caracter == '\r') {
      if (lineaLarga) {
        Serial.println("Comando demasiado largo. Escribe menu para ver las opciones.");
      } else if (longitudLinea != 0) {
        linea[longitudLinea] = '\0';
        procesarComando(linea);
      }
      longitudLinea = 0;
      lineaLarga = false;
    } else if (longitudLinea < sizeof(linea) - 1) {
      linea[longitudLinea++] = caracter;
    } else {
      lineaLarga = true;
    }
  }
}

void setup() {
  Serial.begin(115200);
  mostrarMenu();
}

void loop() {
  leerComandos();
  const uint32_t ahora = millis();
  switch (modo) {
    case Modo::Rfid:  probarRfid(ahora); break;
    case Modo::Fc:    probarFc(ahora); break;
    case Modo::Reloj: probarReloj(ahora); break;
    default: break;
  }
  delay(1);
}
