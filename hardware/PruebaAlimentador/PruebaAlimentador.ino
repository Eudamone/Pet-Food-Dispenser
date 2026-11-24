#include <Arduino.h>
#include <Adafruit_PN532.h>
#include <Wire.h>
#include <freertos/FreeRTOS.h>
#include <freertos/queue.h>
#include <freertos/task.h>

constexpr uint8_t GPIO_ACCESO = 25;
constexpr uint8_t GPIO_TOLVA = 26;
constexpr uint8_t GPIO_PRESENCIA = 33;
constexpr uint8_t GPIO_RFID_SDA = 16;
constexpr uint8_t GPIO_RFID_SCL = 17;
constexpr uint8_t NIVEL_PRESENCIA = LOW;

constexpr uint16_t ACCESO_CERRADO_US = 2500;
constexpr uint16_t ACCESO_ABIERTO_US = 1500;
constexpr uint16_t TOLVA_CERRADA_US = 1600;
constexpr uint16_t TOLVA_ABIERTA_US = 800;

constexpr uint32_t ESPERA_APERTURA_MS = 1200;  // Ajustar con el mecanismo real.
constexpr uint32_t MOVIMIENTO_TOLVA_MS = 600;
constexpr uint32_t DOSIFICACION_MS = 10000;
constexpr uint32_t PRESENCIA_ESTABLE_MS = 100;
constexpr uint32_t AUSENCIA_CONTINUA_MS = 2000;
constexpr uint32_t PASO_CIERRE_MS = 20;
constexpr uint16_t PASO_CIERRE_US = 20;
constexpr uint32_t ASENTAR_CIERRE_MS = 600;
constexpr uint32_t AUSENCIA_TAG_MS = 1200;
constexpr uint32_t MUESTRA_RFID_MAX_MS = 800;
constexpr uint16_t LECTURA_RFID_MS = 400;

constexpr uint32_t PWM_HZ = 50;
constexpr uint8_t PWM_BITS = 16;
constexpr uint32_t PWM_PERIODO_US = 20000;

enum class Estado {
  Arranque,
  Listo,
  Abriendo,
  BajandoTolva,
  Dosificando,
  CerrandoTolva,
  EsperandoSalida,
  CerrandoAcceso
};

enum class EstadoRfid { Iniciando, Disponible, Error };

struct LecturaRfid {
  EstadoRfid estado = EstadoRfid::Iniciando;
  uint32_t version = 0;
  uint32_t momento = 0;
  uint32_t ultimoTag = 0;
  bool hayTag = false;
  uint8_t longitudUid = 0;
  uint8_t uid[10] = {};
};

void pasarA(Estado siguiente, uint32_t ahora, const char* mensaje);
void imprimirUid(const LecturaRfid& lectura);

Adafruit_PN532 lector(-1, -1, &Wire1);
QueueHandle_t colaRfid = nullptr;
LecturaRfid lecturaRfid;

Estado estado = Estado::Arranque;
uint32_t estadoDesde = 0;
bool salidasListas = false;
bool presenciaBruta = false;
bool presenciaEstable = false;
bool presenciaVista = false;
uint32_t sensorDesde = 0;
bool aceptaEtiqueta = true;
uint16_t pulsoCierre = ACCESO_CERRADO_US;
uint32_t ultimoPasoCierre = 0;

bool transcurrio(uint32_t ahora, uint32_t desde, uint32_t duracion) {
  return uint32_t(ahora - desde) >= duracion;
}

void pasarA(Estado siguiente, uint32_t ahora, const char* mensaje) {
  estado = siguiente;
  estadoDesde = ahora;
  Serial.println(mensaje);
}

void mover(uint8_t pin, uint16_t pulso) {
  const uint32_t duty =
      (uint32_t(pulso) * (1UL << PWM_BITS) + PWM_PERIODO_US / 2) / PWM_PERIODO_US;
  if (!ledcWrite(pin, duty)) {
    salidasListas = false;
    Serial.printf("Error de PWM en GPIO%u. Prueba detenida.\n", unsigned(pin));
  }
}

void imprimirUid(const LecturaRfid& lectura) {
  Serial.print("Etiqueta detectada. UID");
  for (uint8_t i = 0; i < lectura.longitudUid; ++i) {
    Serial.printf(" %02X", unsigned(lectura.uid[i]));
  }
  Serial.println();
}

void tareaRfid(void*) {
  LecturaRfid dato;
  vTaskDelay(pdMS_TO_TICKS(200));
  if (Wire1.begin(GPIO_RFID_SDA, GPIO_RFID_SCL, 100000) && lector.begin()) {
    dato.version = lector.getFirmwareVersion();
  }

  const uint8_t respuesta[] = {0x01, 0x00, 0x00, 0xFF, 0x02, 0xFE, 0xD5, 0x33, 0xF8, 0x00};
  bool configurado = dato.version && lector.SAMConfig() &&
      lector.setPassiveActivationRetries(0x02) &&
      Wire1.requestFrom(PN532_I2C_ADDRESS, sizeof(respuesta), true) == sizeof(respuesta);
  if (configurado) {
    for (uint8_t esperado : respuesta) if (Wire1.read() != esperado) configurado = false;
  }
  if (!configurado) {
    dato.estado = EstadoRfid::Error;
    xQueueOverwrite(colaRfid, &dato);
    vTaskDelete(nullptr);
    return;
  }

  dato.estado = EstadoRfid::Disponible;
  for (;;) {
    dato.longitudUid = 0;
    dato.hayTag = lector.readPassiveTargetID(
        PN532_MIFARE_ISO14443A, dato.uid, &dato.longitudUid, LECTURA_RFID_MS);
    dato.momento = millis();
    dato.hayTag = dato.hayTag && dato.longitudUid > 0 &&
                  dato.longitudUid <= sizeof(dato.uid);
    if (dato.hayTag) dato.ultimoTag = dato.momento;
    xQueueOverwrite(colaRfid, &dato);
    vTaskDelay(pdMS_TO_TICKS(75));
  }
}

void muestrearPresencia(uint32_t ahora) {
  const bool lectura = digitalRead(GPIO_PRESENCIA) == NIVEL_PRESENCIA;
  if (lectura != presenciaBruta) {
    presenciaBruta = lectura;
    sensorDesde = ahora;
  }
  if (presenciaEstable != presenciaBruta &&
      transcurrio(ahora, sensorDesde, PRESENCIA_ESTABLE_MS)) {
    presenciaEstable = presenciaBruta;
    Serial.println(presenciaEstable ? "FC-51 detecta un objeto." : "FC-51 sin deteccion.");
  }
  // Solo cuenta una muestra estable tomada durante la visita.
  if (estado != Estado::Arranque && estado != Estado::Listo &&
      presenciaBruta && transcurrio(ahora, sensorDesde, PRESENCIA_ESTABLE_MS)) {
    presenciaVista = true;
  }
}

void setup() {
  Serial.begin(115200);
  pinMode(GPIO_PRESENCIA, NIVEL_PRESENCIA == LOW ? INPUT_PULLDOWN : INPUT_PULLUP);
  presenciaBruta = digitalRead(GPIO_PRESENCIA) == NIVEL_PRESENCIA;
  presenciaEstable = presenciaBruta;
  sensorDesde = millis();
  Serial.println(presenciaBruta ? "FC-51 al arrancar: detecta." : "FC-51 al arrancar: libre.");

  salidasListas = ledcAttach(GPIO_ACCESO, PWM_HZ, PWM_BITS) &&
                 ledcAttach(GPIO_TOLVA, PWM_HZ, PWM_BITS);
  if (!salidasListas) {
    Serial.println("No se pudo configurar el PWM de ambos servos.");
    return;
  }

  colaRfid = xQueueCreate(1, sizeof(LecturaRfid));
  if (!colaRfid || xTaskCreate(tareaRfid, "PN532", 4096, nullptr, 1, nullptr) != pdPASS) {
    salidasListas = false;
    Serial.println("No se pudo iniciar la tarea del PN532.");
    return;
  }

  mover(GPIO_TOLVA, TOLVA_CERRADA_US);
  pasarA(Estado::Arranque, millis(), "Arranque: esperando lector y abertura libre.");
}

void loop() {
  delay(1);
  if (!salidasListas) return;

  const EstadoRfid estadoAnteriorRfid = lecturaRfid.estado;
  if (xQueueReceive(colaRfid, &lecturaRfid, 0) == pdTRUE &&
      estadoAnteriorRfid != lecturaRfid.estado) {
    if (lecturaRfid.estado == EstadoRfid::Disponible) {
      Serial.printf("PN532 listo. Version: %08lX\n", static_cast<unsigned long>(lecturaRfid.version));
    } else if (lecturaRfid.estado == EstadoRfid::Error) {
      Serial.println("Fallo al iniciar el PN532. Revisa 3V3, GND, SDA/SCL y el modo I2C.");
    }
  }

  const uint32_t ahora = millis();
  muestrearPresencia(ahora);
  const bool rfidDisponible = lecturaRfid.estado == EstadoRfid::Disponible &&
      !transcurrio(ahora, lecturaRfid.momento, MUESTRA_RFID_MAX_MS);
  const bool aberturaLibre = !presenciaBruta &&
      transcurrio(ahora, sensorDesde, AUSENCIA_CONTINUA_MS);

  switch (estado) {
    case Estado::Arranque:
      if (rfidDisponible && aberturaLibre &&
          transcurrio(ahora, estadoDesde, MOVIMIENTO_TOLVA_MS)) {
        mover(GPIO_ACCESO, ACCESO_CERRADO_US);
        ultimoPasoCierre = ahora;
        pasarA(Estado::CerrandoAcceso, ahora, "Colocando el acceso en 2500 us.");
      }
      break;

    case Estado::Listo:
      if (!rfidDisponible) break;
      if (!aceptaEtiqueta && !lecturaRfid.hayTag &&
          transcurrio(ahora, lecturaRfid.ultimoTag, AUSENCIA_TAG_MS)) {
        aceptaEtiqueta = true;
        Serial.println("RFID rearmado. Presenta otra etiqueta.");
      }
      if (aceptaEtiqueta && lecturaRfid.hayTag) {
        aceptaEtiqueta = false;
        presenciaVista = false;
        imprimirUid(lecturaRfid);
        mover(GPIO_ACCESO, ACCESO_ABIERTO_US);
        pasarA(Estado::Abriendo, ahora, "Abriendo acceso a 1500 us.");
      }
      break;

    case Estado::Abriendo:
      if (transcurrio(ahora, estadoDesde, ESPERA_APERTURA_MS)) {
        mover(GPIO_TOLVA, TOLVA_ABIERTA_US);
        pasarA(Estado::BajandoTolva, ahora, "Tiempo de apertura cumplido. Bajando tolva a 800 us.");
      }
      break;

    case Estado::BajandoTolva:
      if (transcurrio(ahora, estadoDesde, MOVIMIENTO_TOLVA_MS)) {
        pasarA(Estado::Dosificando, ahora, "Tolva en posicion por tiempo. Esperando 5 segundos.");
      }
      break;

    case Estado::Dosificando:
      if (transcurrio(ahora, estadoDesde, DOSIFICACION_MS)) {
        mover(GPIO_TOLVA, TOLVA_CERRADA_US);
        pasarA(Estado::CerrandoTolva, ahora, "Regresando tolva a 1600 us.");
      }
      break;

    case Estado::CerrandoTolva:
      if (transcurrio(ahora, estadoDesde, MOVIMIENTO_TOLVA_MS)) {
        pasarA(Estado::EsperandoSalida, ahora, "Acceso abierto. Esperando salida confirmada por el FC-51.");
      }
      break;

    case Estado::EsperandoSalida:
      if (presenciaVista && aberturaLibre &&
          transcurrio(ahora, estadoDesde, AUSENCIA_CONTINUA_MS)) {
        pulsoCierre = ACCESO_ABIERTO_US;
        ultimoPasoCierre = ahora;
        pasarA(Estado::CerrandoAcceso, ahora, "Cerrando el acceso gradualmente.");
      }
      break;

    case Estado::CerrandoAcceso:
      if (presenciaBruta) {
        mover(GPIO_ACCESO, ACCESO_ABIERTO_US);
        pasarA(Estado::EsperandoSalida, ahora, "FC-51 detecto un objeto durante el cierre. Reabriendo.");
      } else if (pulsoCierre == ACCESO_CERRADO_US) {
        if (transcurrio(ahora, ultimoPasoCierre, ASENTAR_CIERRE_MS)) {
          pasarA(Estado::Listo, ahora, aceptaEtiqueta ?
                 "Listo. Presenta una etiqueta." : "Ciclo terminado. Retira la etiqueta para rearmar.");
        }
      } else if (transcurrio(ahora, ultimoPasoCierre, PASO_CIERRE_MS)) {
        const uint16_t siguiente = pulsoCierre + PASO_CIERRE_US;
        pulsoCierre = siguiente < ACCESO_CERRADO_US ? siguiente : ACCESO_CERRADO_US;
        mover(GPIO_ACCESO, pulsoCierre);
        ultimoPasoCierre = ahora;
      }
      break;
  }
}
