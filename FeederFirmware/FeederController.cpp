#include "FeederController.h"

#include <Adafruit_PN532.h>
#include <ESPmDNS.h>
#include <Wire.h>
#include <cmath>
#include <sys/time.h>
#include <memory>
#include <new>

#if __has_include("Secrets.h")
#include "Secrets.h"
#else
inline constexpr char FEEDER_WIFI_SSID[] = "";
inline constexpr char FEEDER_WIFI_PASSWORD[] = "";
inline constexpr char FEEDER_MQTT_HOST[] = "petfeeder.local";
inline constexpr uint16_t FEEDER_MQTT_PORT = 1883;
inline constexpr bool FEEDER_MQTT_TLS = false;
inline constexpr char FEEDER_MQTT_USERNAME[] = "";
inline constexpr char FEEDER_MQTT_PASSWORD[] = "";
inline constexpr char FEEDER_MQTT_CA[] = "";
#endif

namespace {
using namespace DeviceConfig;

bool pulse(uint8_t pin, uint16_t us) {
  if (us < 500 || us > 2500) return false;
  return ledcWrite(pin, (uint32_t(us) * 65536UL + 10000UL) / 20000UL);
}

bool identifier(const String& value, size_t maximum = 120) {
  if (value.isEmpty() || value.length() > maximum) return false;
  for (char c : value)
    if (!isalnum(static_cast<unsigned char>(c)) && c != ':' && c != '_' && c != '-') return false;
  return true;
}

bool uuid(const String& value) {
  if (value.length() != 36) return false;
  for (size_t i = 0; i < 36; ++i) {
    if (i == 8 || i == 13 || i == 18 || i == 23) {
      if (value[i] != '-') return false;
    } else if (!isxdigit(static_cast<unsigned char>(value[i]))) return false;
  }
  return true;
}

bool positive(JsonVariantConst value, float maximum = 10000) {
  if (!value.is<float>() && !value.is<int>()) return false;
  const float number = value.as<float>();
  return std::isfinite(number) && number > 0 && number <= maximum;
}

uint32_t parseUtc(const String& value) {
  if (value.length() < 20 || value.length() > 32 || !value.endsWith("Z")) return 0;
  if (value[4] != '-' || value[7] != '-' || value[10] != 'T' || value[13] != ':' || value[16] != ':') return 0;
  const DateTime at(value.c_str());
  return at.isValid() && at.year() >= 2024 ? at.unixtime() : 0;
}

String iso(uint32_t value) {
  if (!value) return "";
  return DateTime(value).timestamp() + "Z";
}
}

void RfidReader::begin() {
  scans_ = xQueueCreate(1, sizeof(char[30]));
  if (!scans_) return;
  if (xTaskCreate(readTags, "pn532", 4096, scans_, 1, nullptr) != pdPASS) {
    vQueueDelete(scans_);
    scans_ = nullptr;
    Serial.println("PN532: no se pudo crear la tarea de lectura.");
  }
}

void RfidReader::readTags(void* queue) {
  Adafruit_PN532 reader(-1, -1, &Wire1);
  const uint8_t reply[] = {0x01, 0x00, 0x00, 0xFF, 0x02, 0xFE, 0xD5, 0x33, 0xF8, 0x00};
  uint8_t retries[] = {PN532_COMMAND_RFCONFIGURATION, 0x05, 0xFF, 0x01, 0x02};
  while (true) {
    if (Wire1.begin(RFID_SDA_PIN, RFID_SCL_PIN, 100000) && reader.begin() &&
        reader.getFirmwareVersion() && reader.SAMConfig() &&
        reader.sendCommandCheckAck(retries, sizeof(retries)) &&
        Wire1.requestFrom(PN532_I2C_ADDRESS, sizeof(reply), true) == sizeof(reply)) {
      bool configured = true;
      for (uint8_t expected : reply) if (Wire1.read() != expected) configured = false;
      if (configured) break;
    }
    Serial.println("PN532 sin respuesta; revisa modo I2C y GPIO16/17.");
    vTaskDelay(pdMS_TO_TICKS(2000));
  }
  Serial.println("PN532 listo por I2C.");
  while (true) {
    uint8_t uid[10];
    uint8_t length = 0;
    if (reader.readPassiveTargetID(PN532_MIFARE_ISO14443A, uid, &length, 350) &&
        length > 0 && length <= sizeof(uid)) {
      char tag[30]{};
      for (uint8_t i = 0; i < length; ++i)
        snprintf(tag + 3 * i, sizeof(tag) - 3 * i, i ? ":%02X" : "%02X", unsigned(uid[i]));
      xQueueOverwrite(static_cast<QueueHandle_t>(queue), tag);
    }
    vTaskDelay(pdMS_TO_TICKS(100));
  }
}

void RfidReader::tick(uint32_t now) {
  char tag[30];
  if (!scans_ || xQueueReceive(scans_, tag, 0) != pdTRUE) return;
  frame_ = tag;
  frameAt_ = now;
  ++sequence_;
}

String RfidReader::readRecent(uint32_t now, uint32_t maxAgeMs) const {
  return sequence_ && now - frameAt_ <= maxAgeMs ? frame_ : String();
}

uint32_t RfidReader::sequence() const { return sequence_; }

void PresenceSensor::begin() {
  pinMode(PRESENCE_PIN, INPUT_PULLDOWN);
  present_ = lastReading_ = digitalRead(PRESENCE_PIN) == LOW;
}

void PresenceSensor::tick(uint32_t now) {
  const bool reading = digitalRead(PRESENCE_PIN) == LOW;
  if (reading != lastReading_) {
    lastReading_ = reading;
    changedAt_ = now;
  }
  if (now - changedAt_ >= PRESENCE_DEBOUNCE_MS) present_ = reading;
}

bool PresenceSensor::present() const { return present_; }

void Clock::begin() {
  ready_ = rtc_.begin(&Wire);
  tick(millis());
}

void Clock::tick(uint32_t now) {
  if (localEpoch_ && now - epochAt_ >= 1000) {
    const uint32_t seconds = (now - epochAt_) / 1000;
    localEpoch_ += seconds;
    epochAt_ += seconds * 1000;
  }
  if (!ready_ || (checkedAt_ && now - checkedAt_ < 1000)) return;
  checkedAt_ = now;
  if (rtc_.lostPower()) return;
  const DateTime local = rtc_.now();
  if (!local.isValid() || local.year() < 2024) return;
  const bool wasUnset = !localEpoch_;
  localEpoch_ = local.unixtime();
  epochAt_ = now;
  if (wasUnset) {
    timeval value{static_cast<time_t>(utc()), 0};
    settimeofday(&value, nullptr);
  }
}

uint32_t Clock::utc() const { return localEpoch_ ? localEpoch_ + BOGOTA_TO_UTC_SECONDS : 0; }

bool Clock::setUtc(uint32_t utc) {
  if (utc < 1704067200UL || utc > 4102444800UL) return false;
  timeval value{static_cast<time_t>(utc), 0};
  if (settimeofday(&value, nullptr) != 0) return false;
  localEpoch_ = utc - BOGOTA_TO_UTC_SECONDS;
  epochAt_ = millis();
  if (ready_) rtc_.adjust(DateTime(localEpoch_));
  return true;
}

std::optional<DateTime> Clock::nowLocal(uint32_t) const {
  if (!localEpoch_) return std::nullopt;
  return DateTime(localEpoch_);
}

void Gate::initialize() {
  ready_ = ledcAttach(DeviceConfig::ACCESS_PIN, 50, 16);
  if (ready_) ledcWrite(DeviceConfig::ACCESS_PIN, 0);
  if (DeviceConfig::CLOSED_SENSOR_PIN >= 0 && DeviceConfig::CLOSED_SENSOR_PIN != DeviceConfig::FOOD_PIN &&
      DeviceConfig::CLOSED_SENSOR_PIN != DeviceConfig::ACCESS_PIN)
    pinMode(DeviceConfig::CLOSED_SENSOR_PIN, INPUT);
}

bool Gate::setPulse(uint16_t value) {
  return ready_ && pulse(DeviceConfig::ACCESS_PIN, value);
}

bool Gate::requestOpen(uint32_t now) {
  if (!setPulse(DeviceConfig::ACCESS_OPEN_US)) return false;
  state_ = State::Opening;
  changedAt_ = now;
  return true;
}

bool Gate::requestClose(uint32_t now) {
  if (!setPulse(DeviceConfig::ACCESS_CLOSED_US)) return false;
  state_ = State::Closing;
  changedAt_ = now;
  return true;
}

bool Gate::closedSignal() const {
  return DeviceConfig::CLOSED_SENSOR_PIN >= 0 &&
    DeviceConfig::CLOSED_SENSOR_PIN != DeviceConfig::ACCESS_PIN &&
    DeviceConfig::CLOSED_SENSOR_PIN != DeviceConfig::FOOD_PIN &&
    (digitalRead(DeviceConfig::CLOSED_SENSOR_PIN) == HIGH) == DeviceConfig::CLOSED_SENSOR_HIGH;
}

void Gate::tick(uint32_t now) {
  if (state_ == State::Opening && now - changedAt_ >= DeviceConfig::ACCESS_TRAVEL_MS) state_ = State::Open;
  if (state_ != State::Closing) return;
  if (now - changedAt_ < DeviceConfig::ACCESS_TRAVEL_MS) return;
  if (DeviceConfig::CLOSED_SENSOR_PIN < 0 || closedSignal()) state_ = State::Closed;
  else if (now - changedAt_ >= DeviceConfig::ACCESS_TRAVEL_MS + DeviceConfig::CLOSED_SENSOR_TIMEOUT_MS) {
    ledcWrite(DeviceConfig::ACCESS_PIN, 0);
    state_ = State::Blocked;
  }
}

bool Gate::moving() const { return state_ == State::Opening || state_ == State::Closing; }
bool Gate::closing() const { return state_ == State::Closing; }
bool Gate::closed() const { return state_ == State::Closed; }
bool Gate::open() const { return state_ == State::Open; }
bool Gate::blocked() const { return state_ == State::Blocked; }

const char* Gate::observedState() const {
  if (blocked()) return "blocked";
  if (moving()) return "moving";
  if (DeviceConfig::CLOSED_SENSOR_PIN < 0) return "unknown";
  if (closedSignal()) return "closed";
  return open() ? "open" : "unknown";
}

void Gate::stop() {
  if (ready_) ledcWrite(DeviceConfig::ACCESS_PIN, 0);
  state_ = State::Unknown;
}

void Dispenser::initialize() {
  if (!ready_) ready_ = ledcAttach(DeviceConfig::FOOD_PIN, 50, 16);
  changedAt_ = millis();
  state_ = ready_ && setPulse(DeviceConfig::FOOD_CLOSED_US) ? State::BootClosing : State::Failed;
}

bool Dispenser::setPulse(uint16_t value) { return ready_ && pulse(DeviceConfig::FOOD_PIN, value); }

bool Dispenser::start(uint16_t cycles, uint32_t openMs, uint32_t now) {
  if (isRunning() || manualOpen() || !cycles || cycles > MAX_CYCLES_PER_ORDER ||
      !openMs || openMs > MAX_FOOD_OPEN_SECONDS * 1000) return false;
  if (!setPulse(DeviceConfig::FOOD_CLOSED_US)) return false;
  cycles_ = cycles;
  completed_ = 0;
  openMs_ = openMs;
  changedAt_ = now;
  state_ = State::Priming;
  return true;
}

void Dispenser::tick(uint32_t now) {
  const uint32_t elapsed = now - changedAt_;
  switch (state_) {
    case State::ManualOpen:
      if (elapsed < openMs_) return;
      state_ = setPulse(FOOD_CLOSED_US) ? State::BootClosing : State::Failed;
      break;
    case State::BootClosing:
      if (elapsed < DeviceConfig::FOOD_TRAVEL_MS) return;
      state_ = State::Idle;
      break;
    case State::Priming:
    case State::Pausing:
      if (elapsed < (state_ == State::Priming ? DeviceConfig::FOOD_TRAVEL_MS : DeviceConfig::FOOD_PAUSE_MS)) return;
      if (!setPulse(DeviceConfig::FOOD_OPEN_US)) { state_ = State::Failed; return; }
      state_ = State::Opening;
      break;
    case State::Opening:
      if (elapsed < DeviceConfig::FOOD_TRAVEL_MS) return;
      state_ = State::Holding;
      break;
    case State::Holding:
      if (elapsed < openMs_) return;
      if (!setPulse(DeviceConfig::FOOD_CLOSED_US)) { state_ = State::Failed; return; }
      state_ = State::Closing;
      break;
    case State::Closing:
      if (elapsed < DeviceConfig::FOOD_TRAVEL_MS) return;
      state_ = ++completed_ >= cycles_ ? State::Finished : State::Pausing;
      break;
    default:
      return;
  }
  changedAt_ = now;
}

bool Dispenser::isRunning() const {
  return state_ != State::Idle && state_ != State::Finished &&
    state_ != State::Failed && state_ != State::ManualOpen;
}

bool Dispenser::manualOpen() const { return state_ == State::ManualOpen; }

bool Dispenser::setManualPosition(bool open, uint32_t duration, uint32_t now) {
  if ((open && isRunning()) || !setPulse(open ? FOOD_OPEN_US : FOOD_CLOSED_US)) return false;
  state_ = open ? State::ManualOpen : State::BootClosing;
  openMs_ = duration + FOOD_TRAVEL_MS;
  changedAt_ = now;
  return true;
}
bool Dispenser::finished() const { return state_ == State::Finished; }
bool Dispenser::failed() const { return state_ == State::Failed; }
void Dispenser::reset() { if (state_ != State::BootClosing) state_ = State::Idle; }
void Dispenser::stop() {
  if (ready_) ledcWrite(DeviceConfig::FOOD_PIN, 0);
  state_ = State::Idle;
}

FeederController::FeederController() : mqtt_(plain_) {}

void FeederController::initialize() {
  Serial.begin(115200);
  gate_.initialize();
  dispenser_.initialize();
  Wire.begin(DeviceConfig::I2C_SDA_PIN, DeviceConfig::I2C_SCL_PIN, 100000);
  Wire.setTimeOut(50);
  rfid_.begin();
  presence_.begin();
  clock_.begin();
  storageReady_ = preferences_.begin("feeder-v2", false);
  if (storageReady_) {
    const size_t length = preferences_.getBytesLength("state");
    if (length) {
      std::unique_ptr<char[]> stored(new (std::nothrow) char[length]);
      if (length > DeviceConfig::MAX_SAVED_BYTES || !stored ||
          preferences_.getBytes("state", stored.get(), length) != length ||
          deserializeJson(saved_, stored.get(), length)) {
        storageReady_ = false;
        fault_ = "Memoria invalida. Movimiento automatico deshabilitado.";
      }
    }
  }
  if (storageReady_) {
    if (!saved_["deviceId"].isNull() && saved_["deviceId"].as<String>() != DeviceConfig::DEVICE_ID) {
      storageReady_ = false;
      fault_ = "El UUID no coincide con la memoria del equipo.";
    } else {
      saved_["deviceId"] = DeviceConfig::DEVICE_ID;
      saved_["version"] = 1;
      if (!saved_["events"].is<JsonArray>()) saved_["events"].to<JsonArray>();
      if (!saved_["requests"].is<JsonArray>()) saved_["requests"].to<JsonArray>();
      if (!saved_["scheduled"].is<JsonObject>()) saved_["scheduled"].to<JsonObject>();
      if (!saved_["gramsPerCycle"].is<float>()) saved_["gramsPerCycle"] = DeviceConfig::ESTIMATED_GRAMS_PER_CYCLE;
      if (save()) recover();
    }
  } else if (fault_.isEmpty()) fault_ = "No se pudo abrir la memoria del equipo.";
  loadNetwork();
  networkReady_ = !wifiSsid_.isEmpty() && FEEDER_MQTT_HOST[0] && uuid(DeviceConfig::DEVICE_ID);
  if (FEEDER_MQTT_TLS) {
    if (!FEEDER_MQTT_CA[0]) {
      networkReady_ = false;
      fault_ = "Falta el certificado del broker TLS.";
    } else {
      tls_.setCACert(FEEDER_MQTT_CA);
      tls_.setHandshakeTimeout(3);
      mqtt_.setClient(tls_);
    }
  }
  mqtt_.setServer(FEEDER_MQTT_HOST, FEEDER_MQTT_PORT);
  mqtt_.setSocketTimeout(1);
  mqtt_.setKeepAlive(600);
  if (!mqtt_.setBufferSize(DeviceConfig::MAX_MQTT_BYTES)) {
    networkReady_ = false;
    fault_ = "No hay memoria para MQTT.";
  }
  mqtt_.setCallback([this](char* topic, uint8_t* payload, unsigned int length) { receive(topic, payload, length); });
  if (networkReady_) {
    WiFi.mode(WIFI_STA);
    WiFi.setAutoReconnect(true);
    WiFi.begin(wifiSsid_.c_str(), wifiPassword_.c_str());
  }
  Serial.printf("Equipo: %s | Acceso GPIO%u | Alimento GPIO%u\n", DeviceConfig::DEVICE_ID,
    DeviceConfig::ACCESS_PIN, DeviceConfig::FOOD_PIN);
  Serial.println("Ordenes: estado, p 2500, l 1600, off, on, ciclo, cal 20, hora <Unix UTC>");
  if (!networkReady_) Serial.println("Configura Secrets.h para conectar WiFi y MQTT.");
  if (!fault_.isEmpty()) Serial.println(fault_);
}

void FeederController::loadNetwork() {
  wifiSsid_ = FEEDER_WIFI_SSID;
  wifiPassword_ = FEEDER_WIFI_PASSWORD;
  Preferences config;
  if (!config.begin("feeder-net", true)) return;
  const String stored = config.getString("wifi");
  config.end();
  JsonDocument wifi;
  if (stored.isEmpty() || deserializeJson(wifi, stored) ||
      !wifi["ssid"].is<const char*>() || !wifi["password"].is<const char*>()) return;
  wifiSsid_ = wifi["ssid"].as<String>();
  wifiPassword_ = wifi["password"].as<String>();
  brokerFallback_ = wifi["fallback"].as<String>();
}

void FeederController::configureWifi(const String& json) {
  if (gate_.moving() || accessHeldOpen_ || dispenser_.isRunning() || dispenser_.manualOpen() ||
      !saved_["access"].isNull() || !saved_["active"].isNull()) {
    Serial.println("WIFI_BUSY");
    return;
  }
  JsonDocument wifi;
  IPAddress fallback;
  if (deserializeJson(wifi, json) || !wifi["ssid"].is<const char*>() ||
      !wifi["password"].is<const char*>() ||
      !fallback.fromString(wifi["fallback"] | "")) {
    Serial.println("WIFI_INVALID");
    return;
  }
  const String ssid = wifi["ssid"].as<String>();
  const String password = wifi["password"].as<String>();
  if (ssid.isEmpty() || ssid.length() > 32 || password.length() > 64 ||
      (!password.isEmpty() && password.length() < 8)) {
    Serial.println("WIFI_INVALID");
    return;
  }
  Preferences config;
  if (!config.begin("feeder-net", false) || config.putString("wifi", json) != json.length()) {
    Serial.println("WIFI_SAVE_ERROR");
    return;
  }
  config.end();
  Serial.println("WIFI_SAVED");
  Serial.flush();
  ESP.restart();
}

bool FeederController::save() {
  if (!storageReady_) return false;
  String json;
  if (measureJson(saved_) > DeviceConfig::MAX_SAVED_BYTES || !serializeJson(saved_, json) ||
      preferences_.putBytes("state", json.c_str(), json.length()) != json.length()) {
    storageReady_ = false;
    fault_ = "No se pudo guardar el estado. Movimiento deshabilitado.";
    dispenser_.initialize();
    gate_.stop();
    Serial.println(fault_);
    return false;
  }
  return true;
}

String FeederController::eventId() const {
  char value[32];
  snprintf(value, sizeof(value), "e-%08lx-%08lx", static_cast<unsigned long>(esp_random()),
    static_cast<unsigned long>(esp_random()));
  return value;
}

String FeederController::timestamp() const { return iso(clock_.utc()); }

String FeederController::date() const {
  const auto local = clock_.nowLocal(millis());
  if (!local) return "";
  return local->timestamp(DateTime::TIMESTAMP_DATE);
}

bool FeederController::queueResult(JsonObjectConst event) {
  JsonArray events = saved_["events"].as<JsonArray>();
  for (JsonObjectConst queued : events)
    if (queued["id"].as<String>() == event["id"].as<String>()) return true;
  if (events.size() >= DeviceConfig::MAX_PENDING_RESULTS) {
    fault_ = "Hay resultados pendientes. Esperando confirmacion del servidor.";
    return false;
  }
  if (!events.add(event)) return false;
  return save();
}

void FeederController::transientResult(JsonObjectConst event, const char* key) {
  transient_[key].set(event);
}

void FeederController::receive(char* topic, uint8_t* payload, unsigned int length) {
  if (!length || length > DeviceConfig::MAX_MQTT_BYTES - 128 || !incoming_.isEmpty()) return;
  incoming_.reserve(length + 1);
  incoming_ = "";
  incoming_.concat(reinterpret_cast<const char*>(payload), length);
  incomingTopic_ = topic;
}

void FeederController::connect(uint32_t now) {
  if (!networkReady_ || gate_.moving()) return;
  if (WiFi.status() != WL_CONNECTED) {
    if (mdnsReady_) {
      MDNS.end();
      mdnsReady_ = false;
    }
    if (now - wifiAt_ >= 15000 && !dispenser_.isRunning() && !gate_.moving()) {
      wifiAt_ = now;
      Serial.printf("WiFi pendiente: %d\n", int(WiFi.status()));
      WiFi.reconnect();
    }
    return;
  }
  if (mqtt_.connected()) { mqtt_.loop(); return; }
  if (dispenser_.isRunning() || gate_.moving() || now - connectionAt_ < 5000) return;
  if (FEEDER_MQTT_TLS && !clock_.utc()) return;
  connectionAt_ = now;
  if (!FEEDER_MQTT_TLS && strcmp(FEEDER_MQTT_HOST, "petfeeder.local") == 0) {
    if (!mdnsReady_) mdnsReady_ = MDNS.begin("petfeeder-esp32");
    auto address = mdnsReady_ ? MDNS.queryHost("petfeeder", 500) : IPAddress();
    if (!address && !brokerFallback_.isEmpty()) address.fromString(brokerFallback_);
    if (!address) {
      Serial.println("MQTT: petfeeder.local aun no responde.");
      return;
    }
    mqtt_.setServer(address, FEEDER_MQTT_PORT);
  }
  const bool connected = FEEDER_MQTT_USERNAME[0]
    ? mqtt_.connect(DeviceConfig::DEVICE_ID, FEEDER_MQTT_USERNAME, FEEDER_MQTT_PASSWORD)
    : mqtt_.connect(DeviceConfig::DEVICE_ID);
  if (!connected) { Serial.printf("MQTT pendiente: %d\n", mqtt_.state()); return; }
  const String base = String("feeders/") + DeviceConfig::DEVICE_ID;
  if (!mqtt_.subscribe((base + "/cmd/configuration").c_str()) ||
      !mqtt_.subscribe((base + "/cmd/dispense").c_str()) ||
      !mqtt_.subscribe((base + "/cmd/servo").c_str()) ||
      !mqtt_.subscribe((base + "/cmd/confirmations").c_str())) {
    mqtt_.disconnect();
    return;
  }
  observedAt_ = 0;
  Serial.println("MQTT conectado.");
}

void FeederController::processIncoming() {
  if (incoming_.isEmpty()) return;
  JsonDocument command;
  const auto error = deserializeJson(command, incoming_, DeserializationOption::NestingLimit(8));
  incoming_ = "";
  const String topic = incomingTopic_;
  incomingTopic_ = "";
  if (error || !command.is<JsonObject>()) { fault_ = "Comando MQTT invalido."; return; }
  const String base = String("feeders/") + DeviceConfig::DEVICE_ID;
  if (topic == base + "/cmd/confirmations") confirm(command["eventIds"].as<JsonArrayConst>());
  else if (topic == base + "/cmd/configuration") applyConfiguration(command.as<JsonObjectConst>());
  else if (topic == base + "/cmd/dispense") acceptManual(command.as<JsonObjectConst>());
  else if (topic == base + "/cmd/servo") acceptServo(command.as<JsonObjectConst>());
}

bool FeederController::validateConfiguration(JsonObjectConst command) const {
  if (command["kind"] != "feedingPlan" || command["deviceId"].as<String>() != DeviceConfig::DEVICE_ID ||
      !command["revision"].is<uint32_t>() || command["revision"].as<uint32_t>() < 1 ||
      command["revision"].as<uint32_t>() > 2147483647UL || !command["enabled"].is<bool>() ||
      !positive(command["maxBowlGrams"]) || !command["maxDailyDispensedGrams"].is<float>() ||
      !std::isfinite(command["maxDailyDispensedGrams"].as<float>()) || command["maxDailyDispensedGrams"].as<float>() < 0 ||
      !command["slots"].is<JsonArrayConst>() || command["slots"].size() > DeviceConfig::MAX_SLOTS ||
      (!command["authorizedPets"].isNull() && !command["authorizedPets"].is<JsonArrayConst>()) ||
      command["authorizedPets"].size() > DeviceConfig::MAX_PETS) return false;
  if (!command["foodOpenSeconds"].isNull() &&
      (!command["foodOpenSeconds"].is<uint32_t>() ||
       command["foodOpenSeconds"].as<uint32_t>() < 1 ||
       command["foodOpenSeconds"].as<uint32_t>() > MAX_FOOD_OPEN_SECONDS)) return false;
  for (JsonObjectConst slot : command["slots"].as<JsonArrayConst>()) {
    const String time = slot["time"].as<String>();
    if (!identifier(slot["id"].as<String>()) || time.length() != 5 || time[2] != ':' ||
        !isdigit(time[0]) || !isdigit(time[1]) || !isdigit(time[3]) || !isdigit(time[4]) ||
        time.substring(0, 2).toInt() > 23 || time.substring(3).toInt() > 59 ||
        !positive(slot["targetGrams"], command["maxBowlGrams"].as<float>()) ||
        !slot["enabled"].is<bool>()) return false;
    JsonArrayConst days = slot["days"].is<JsonArrayConst>() ? slot["days"].as<JsonArrayConst>() : slot["_days"].as<JsonArrayConst>();
    if (days.isNull() || !days.size() || days.size() > 7) return false;
    uint8_t used = 0;
    for (JsonVariantConst day : days) {
      if (!day.is<unsigned>() || day.as<unsigned>() > 6 || (used & (1 << day.as<unsigned>()))) return false;
      used |= 1 << day.as<unsigned>();
    }
    for (JsonObjectConst other : command["slots"].as<JsonArrayConst>())
      if (other != slot && other["id"].as<String>() == slot["id"].as<String>()) return false;
  }
  for (JsonObjectConst pet : command["authorizedPets"].as<JsonArrayConst>())
    if (!uuid(pet["petId"].as<String>()) || (!pet["tagUid"].isNull() && !identifier(pet["tagUid"].as<String>()))) return false;
  return true;
}

void FeederController::applyConfiguration(JsonObjectConst command) {
  if (!storageReady_ || !validateConfiguration(command)) {
    fault_ = "Configuracion invalida o fuera de capacidad.";
    return;
  }
  const uint32_t revision = command["revision"].as<uint32_t>();
  const uint32_t previous = saved_["plan"]["revision"] | 0UL;
  if (revision < previous) return;
  if (!clock_.utc()) {
    const uint32_t serverTime = parseUtc(command["sentAt"].as<String>());
    if (serverTime) clock_.setUtc(serverTime);
  }
  if (revision > previous) {
    saved_["plan"].set(command);
    if (!save()) return;
  }
  JsonDocument event;
  event["id"] = String("configuration-") + revision;
  event["kind"] = "configurationApplied";
  event["revision"] = revision;
  transientResult(event.as<JsonObjectConst>(), "configuration");
  fault_ = "";
  Serial.printf("Configuracion aplicada: %lu\n", static_cast<unsigned long>(revision));
}

void FeederController::confirm(JsonArrayConst ids) {
  if (ids.isNull()) return;
  bool changed = false;
  JsonArray events = saved_["events"].as<JsonArray>();
  for (JsonVariantConst value : ids) {
    if (!value.is<const char*>()) continue;
    const String id = value.as<String>();
    for (size_t i = events.size(); i > 0; --i) {
      if (events[i - 1]["id"].as<String>() == id) { events.remove(i - 1); changed = true; }
    }
    for (const char* key : {"configuration", "observation", "rfid", "servo"})
      if (transient_[key]["id"].as<String>() == id) transient_.remove(key);
  }
  if (changed) save();
}

void FeederController::publishResults(uint32_t now) {
  if (!mqtt_.connected() || dispenser_.isRunning() || gate_.moving() || now - publishedAt_ < 500) return;
  publishedAt_ = now;
  JsonArrayConst events = saved_["events"].as<JsonArrayConst>();
  const size_t count = events.size() + 4;
  for (size_t tried = 0; tried < count; ++tried) {
    const size_t index = resultIndex_++ % count;
    JsonObjectConst event;
    if (index < events.size()) event = events[index].as<JsonObjectConst>();
    else {
      const char* keys[] = {"configuration", "observation", "rfid", "servo"};
      event = transient_[keys[index - events.size()]].as<JsonObjectConst>();
    }
    if (event.isNull()) continue;
    String payload;
    serializeJson(event, payload);
    const String topic = String("feeders/") + DeviceConfig::DEVICE_ID + "/evt/result";
    if (!mqtt_.publish(topic.c_str(), payload.c_str(), false)) Serial.println("Resultado pendiente de envio.");
    return;
  }
}

void FeederController::observe(uint32_t now) {
  if (!clock_.utc() || (observedAt_ && now - observedAt_ < 10000)) return;
  observedAt_ = now;
  JsonDocument event;
  event["id"] = eventId();
  event["kind"] = "observation";
  event["at"] = timestamp();
  event["gate"] = gate_.observedState();
  if (!fault_.isEmpty()) event["fault"] = fault_;
  else if (DeviceConfig::CLOSED_SENSOR_PIN < 0) event["fault"] = "Sin sensor de cierre; posicion de acceso estimada.";
  else event["fault"] = nullptr;
  event["measurementMode"] = "estimated";
  event["estimatedGramsPerCycle"] = saved_["gramsPerCycle"];
  event["commandedGate"] = gate_.closed() ? "closed" : gate_.open() ? "open" : "unknown";
  event["presence"] = presence_.present();
  transientResult(event.as<JsonObjectConst>(), "observation");
}

void FeederController::recover() {
  if (!saved_["active"].isNull()) finishDispense("interrupted", "El equipo se reinicio durante la dosis; no se repetira automaticamente.");
  if (!saved_["access"].isNull()) {
    JsonDocument event;
    event.set(saved_["access"]);
    event["kind"] = "access";
    event["status"] = "interrupted";
    event["issue"] = "El equipo se reinicio durante la visita.";
    if (queueResult(event.as<JsonObjectConst>())) {
      saved_.remove("access");
      save();
    }
  }
}

void FeederController::updateBudget() {
  const String day = date();
  const String previous = saved_["budgetDay"].as<String>();
  if (day.isEmpty() || (!previous.isEmpty() && day <= previous)) return;
  saved_["budgetDay"] = day;
  saved_["budgetGrams"] = 0.0f;
  save();
}

bool FeederController::rememberRequest(const String& id, uint32_t now) {
  JsonArray requests = saved_["requests"].as<JsonArray>();
  if (saved_["active"]["id"].as<String>() == id) return false;
  for (JsonObjectConst event : saved_["events"].as<JsonArrayConst>())
    if (event["id"].as<String>() == id) return false;
  for (JsonObjectConst request : requests)
    if (request["id"].as<String>() == id) return false;
  if (requests.size() >= DeviceConfig::MAX_RECENT_REQUESTS) requests.remove(0);
  JsonObject request = requests.add<JsonObject>();
  request["id"] = id;
  request["at"] = now;
  return true;
}

void FeederController::acceptManual(JsonObjectConst command) {
  const String id = command["requestId"].as<String>();
  if (!storageReady_ || command["kind"] != "manualDispense" ||
      command["deviceId"].as<String>() != DeviceConfig::DEVICE_ID || !identifier(id) ||
      !positive(command["targetGrams"])) { fault_ = "Orden de dosis invalida."; return; }
  if (saved_["events"].size() >= DeviceConfig::MAX_PENDING_RESULTS - 2) {
    fault_ = "Esperando confirmacion de resultados antes de aceptar otra orden.";
    return;
  }
  const uint32_t requested = parseUtc(command["requestedAt"].as<String>());
  const uint32_t utc = clock_.utc();
  if (!requested || !utc || requested > utc + 60 ||
      (utc > requested && utc - requested > DeviceConfig::MANUAL_ORDER_MAX_AGE_SECONDS)) {
    fault_ = "Orden vencida o equipo sin hora valida.";
    Serial.println(fault_);
    return;
  }
  if (!rememberRequest(id, utc)) return;
  beginDispense(id, command["targetGrams"].as<float>(), "manual", "", "");
}

void FeederController::acceptServo(JsonObjectConst command) {
  const String id = command["requestId"].as<String>();
  const String servo = command["servo"].as<String>();
  const String position = command["position"].as<String>();
  if (!storageReady_ || command["kind"] != "servoPosition" ||
      command["deviceId"] != DEVICE_ID || !uuid(id) ||
      (servo != "access" && servo != "food") ||
      (position != "open" && position != "closed")) return;
  const uint32_t utc = clock_.utc();
  const uint32_t requested = parseUtc(command["requestedAt"].as<String>());
  if (!utc || !requested || requested > utc + 5 || (utc > requested && utc - requested > 10)) return;
  if (!rememberRequest(id, utc) || !save()) return;

  const bool open = position == "open";
  const uint32_t now = millis();
  const char* reason = nullptr;
  const bool stopDose = servo == "food" && !open && !saved_["active"].isNull();
  if (override_ || gate_.moving() || !saved_["access"].isNull() ||
      (!stopDose && (dispenser_.isRunning() || !saved_["active"].isNull()))) {
    reason = "El alimentador esta ocupado.";
  } else if (servo == "food") {
    if (!dispenser_.setManualPosition(open, foodOpenMs(), now))
      reason = "No se pudo mover la tolva.";
    else if (stopDose)
      finishDispense("interrupted", "La tolva se cerro desde la app.");
  } else if (!open && presence_.present()) {
    reason = "El FC-51 indica presencia en el acceso.";
  } else {
    const bool moved = open ? gate_.requestOpen(now) : gate_.requestClose(now);
    if (moved) accessHeldOpen_ = open;
    else reason = "No se pudo mover la compuerta de acceso.";
  }
  JsonDocument result;
  result["id"] = id;
  result["kind"] = "servoResult";
  result["applied"] = reason == nullptr;
  if (reason) result["reason"] = reason;
  transientResult(result.as<JsonObjectConst>(), "servo");
}

uint32_t FeederController::foodOpenMs() const {
  const uint32_t seconds = saved_["plan"]["foodOpenSeconds"] | FOOD_OPEN_SECONDS;
  return (seconds >= 1 && seconds <= MAX_FOOD_OPEN_SECONDS ? seconds : FOOD_OPEN_SECONDS) * 1000;
}

bool FeederController::beginDispense(const String& id, float grams, const char* source,
    const String& slotId, const String& scheduleKey) {
  const float gramsPerCycle = saved_["gramsPerCycle"] | DeviceConfig::ESTIMATED_GRAMS_PER_CYCLE;
  const uint32_t openMs = foodOpenMs();
  const float cyclesValue = gramsPerCycle > 0 ? ceilf(grams / gramsPerCycle) : 0;
  const uint16_t cycles = cyclesValue > DeviceConfig::MAX_CYCLES_PER_ORDER ? 0 : uint16_t(cyclesValue);
  const float estimated = cycles * gramsPerCycle;
  const float bowl = saved_["plan"]["maxBowlGrams"] | 0.0f;
  const float daily = saved_["plan"]["maxDailyDispensedGrams"] | 0.0f;
  const float used = saved_["budgetGrams"] | 0.0f;
  const char* reason = nullptr;
  if (!storageReady_) return false;
  if (!clock_.utc()) reason = "El equipo no tiene hora valida.";
  else if (date() < saved_["budgetDay"].as<String>()) reason = "El reloj retrocedio. Corrige la hora antes de dosificar.";
  else if (override_) reason = "El equipo esta en control manual por puerto serie.";
  else if (!saved_["active"].isNull() || dispenser_.isRunning() || dispenser_.manualOpen() ||
           !saved_["access"].isNull()) reason = "El equipo esta ocupado.";
  else if (!gate_.closed()) reason = "La compuerta de acceso no esta en posicion de cierre.";
  else if (!saved_["plan"].is<JsonObject>()) reason = "Falta recibir la configuracion del servidor.";
  else if (!cycles || !std::isfinite(estimated)) reason = "La calibracion no permite esta dosis.";
  else if (grams > bowl || estimated > bowl) reason = "La dosis estimada supera la capacidad configurada.";
  else if (daily > 0 && used + estimated > daily + 0.001f) reason = "La dosis estimada supera el limite diario.";
  else if (saved_["events"].size() >= DeviceConfig::MAX_PENDING_RESULTS - 2) reason = "Hay resultados pendientes de confirmacion.";

  if (!scheduleKey.isEmpty()) saved_["scheduled"][slotId] = scheduleKey;
  if (reason) {
    JsonDocument event;
    event["id"] = id;
    event["kind"] = "dispensing";
    event["source"] = source;
    event["targetGrams"] = grams;
    event["status"] = "skipped";
    event["reason"] = reason;
    if (!slotId.isEmpty()) event["slotId"] = slotId;
    if (clock_.utc()) event["finishedAt"] = timestamp();
    if (!queueResult(event.as<JsonObjectConst>())) save();
    Serial.println(reason);
    return false;
  }
  JsonObject active = saved_["active"].to<JsonObject>();
  active["id"] = id;
  active["kind"] = "dispensing";
  active["source"] = source;
  active["targetGrams"] = grams;
  active["estimatedGrams"] = estimated;
  active["measurementMode"] = "estimated";
  active["startedAt"] = timestamp();
  if (!slotId.isEmpty()) active["slotId"] = slotId;
  saved_["budgetGrams"] = used + estimated;
  if (!save()) return false;
  if (!dispenser_.start(cycles, openMs, millis())) {
    finishDispense("failed", "No se pudo activar el dosificador.");
    return false;
  }
  Serial.printf("Dosis iniciada: objetivo %.1f g, estimacion %.1f g, %u ciclos.\n", grams, estimated, cycles);
  return true;
}

void FeederController::finishDispense(const char* status, const char* reason) {
  if (saved_["active"].isNull()) return;
  JsonDocument event;
  event.set(saved_["active"]);
  event["status"] = status;
  if (reason) event["reason"] = reason;
  if (clock_.utc()) event["finishedAt"] = timestamp();
  else if (String(status) == "completed") return;
  if (queueResult(event.as<JsonObjectConst>())) {
    saved_.remove("active");
    save();
    dispenser_.reset();
    Serial.printf("Dosis finalizada: %s.\n", status);
  }
}

void FeederController::checkSchedules(uint32_t now) {
  if (now - schedulesAt_ < 1000 || !storageReady_ || override_ || !clock_.utc()) return;
  schedulesAt_ = now;
  const auto local = clock_.nowLocal(now);
  if (!local || !(saved_["plan"]["enabled"] | false)) return;
  const String day = date();
  if (day < saved_["budgetDay"].as<String>()) return;
  char hhmm[6];
  snprintf(hhmm, sizeof(hhmm), "%02u:%02u", local->hour(), local->minute());
  for (JsonObjectConst slot : saved_["plan"]["slots"].as<JsonArrayConst>()) {
    if (!(slot["enabled"] | false) || slot["time"].as<String>() != hhmm) continue;
    const String id = slot["id"].as<String>();
    if (saved_["scheduled"][id].as<String>() >= day) continue;
    bool matches = false;
    JsonArrayConst days = slot["days"].is<JsonArrayConst>() ? slot["days"].as<JsonArrayConst>() : slot["_days"].as<JsonArrayConst>();
    for (JsonVariantConst weekday : days) if (weekday.as<uint8_t>() == local->dayOfTheWeek()) matches = true;
    if (!matches) continue;
    if (saved_["events"].size() >= DeviceConfig::MAX_PENDING_RESULTS - 2) return;
    const String resultId = String("s-") + id + "-" + day;
    beginDispense(resultId, slot["targetGrams"].as<float>(), "schedule", id, day);
    return;
  }
}

void FeederController::checkRfid(uint32_t now) {
  if (tagSequence_ == rfid_.sequence()) return;
  tagSequence_ = rfid_.sequence();
  const String tag = rfid_.readRecent(now, DeviceConfig::TAG_RECENT_MS);
  if (tag.isEmpty() || !clock_.utc()) return;
  if (tag != lastTag_ || now - tagReportedAt_ >= DeviceConfig::RFID_REPORT_MS) {
    lastTag_ = tag;
    tagReportedAt_ = now;
    JsonDocument event;
    event["id"] = eventId();
    event["kind"] = "rfidScanned";
    event["tagUid"] = tag;
    event["at"] = timestamp();
    transientResult(event.as<JsonObjectConst>(), "rfid");
    Serial.printf("RFID: %s\n", tag.c_str());
  }
  if (!storageReady_ || override_ || !saved_["access"].isNull() || !saved_["active"].isNull() ||
      dispenser_.isRunning() || !gate_.closed() || saved_["events"].size() >= DeviceConfig::MAX_PENDING_RESULTS - 2) return;
  for (JsonObjectConst pet : saved_["plan"]["authorizedPets"].as<JsonArrayConst>()) {
    String authorized = pet["tagUid"].as<String>();
    authorized.toUpperCase();
    if (authorized != tag) continue;
    JsonObject access = saved_["access"].to<JsonObject>();
    access["id"] = eventId();
    access["tagUid"] = tag;
    access["petId"] = pet["petId"];
    access["accountingDay"] = date();
    if (!save()) return;
    if (!gate_.requestOpen(now)) {
      fault_ = "No se pudo abrir la compuerta de acceso.";
      JsonDocument event;
      event.set(access);
      event["kind"] = "access";
      event["status"] = "interrupted";
      event["issue"] = fault_;
      if (queueResult(event.as<JsonObjectConst>())) { saved_.remove("access"); save(); }
    }
    clearAt_ = 0;
    return;
  }
}

void FeederController::closeAccess() {
  if (saved_["access"].isNull() || !clock_.utc()) return;
  JsonDocument event;
  event.set(saved_["access"]);
  event["kind"] = "access";
  event["status"] = "closed";
  event["closedAt"] = timestamp();
  if (queueResult(event.as<JsonObjectConst>())) { saved_.remove("access"); save(); }
}

void FeederController::checkAccess(uint32_t now) {
  if (override_ || !storageReady_ || dispenser_.isRunning() || !saved_["active"].isNull()) return;
  const bool clear = !presence_.present();
  if (clear) { if (!clearAt_) clearAt_ = now; }
  else clearAt_ = 0;
  if (gate_.closing() && !clear) {
    if (!gate_.requestOpen(now)) { gate_.stop(); fault_ = "No se pudo retirar la compuerta."; }
  }
  gate_.tick(now);
  if (gate_.blocked()) { fault_ = "No se pudo confirmar el cierre de la compuerta."; return; }
  if (accessHeldOpen_) return;
  if (gate_.open() && !saved_["access"].isNull() && saved_["access"]["openedAt"].isNull()) {
    saved_["access"]["openedAt"] = timestamp();
    save();
  }
  if (gate_.closed()) {
    if (!saved_["access"].isNull()) closeAccess();
    return;
  }
  if (gate_.moving() || !clearAt_ || now - clearAt_ < DeviceConfig::CLEAR_BEFORE_CLOSE_MS) return;
  const String recentTag = rfid_.readRecent(now, DeviceConfig::TAG_RECENT_MS);
  if (!saved_["access"].isNull() && !recentTag.isEmpty() && saved_["access"]["tagUid"].as<String>() == recentTag) return;
  if (!gate_.requestClose(now)) { fault_ = "No se pudo activar la compuerta de acceso."; gate_.stop(); }
}

void FeederController::serialCommand() {
  for (uint8_t i = 0; i < 48 && Serial.available(); ++i) {
    const char c = char(Serial.read());
    if (c == '\r') continue;
    if (c != '\n') {
      if (serialLine_.length() < 320) serialLine_ += c;
      else serialLine_ = "";
      continue;
    }
    String command = serialLine_;
    serialLine_ = "";
    command.trim();
    if (command.startsWith("wifi ")) {
      configureWifi(command.substring(5));
      continue;
    }
    command.toLowerCase();
    if (command.isEmpty()) continue;
    if (command == "estado") { report(millis()); continue; }
    if (command == "off") {
      override_ = true;
      if (!saved_["active"].isNull()) finishDispense("interrupted", "La dosis fue detenida por puerto serie.");
      if (!saved_["access"].isNull()) {
        JsonDocument event;
        event.set(saved_["access"]);
        event["kind"] = "access";
        event["status"] = "interrupted";
        event["issue"] = "La visita fue detenida por puerto serie.";
        if (queueResult(event.as<JsonObjectConst>())) { saved_.remove("access"); save(); }
      }
      dispenser_.stop();
      gate_.stop();
      accessHeldOpen_ = false;
      benchCycle_ = false;
      Serial.println("PWM desactivado. No confirma una posicion fisica de cierre.");
      continue;
    }
    if (command == "on") {
      if (!storageReady_ || !saved_["active"].isNull() || dispenser_.isRunning()) {
        Serial.println("Hay una operacion o un problema de memoria pendiente.");
        continue;
      }
      override_ = false;
      dispenser_.initialize();
      gate_.stop();
      accessHeldOpen_ = false;
      clearAt_ = 0;
      fault_ = "";
      Serial.println("Control automatico habilitado. Esperando zona de acceso despejada.");
      continue;
    }
    if (!saved_["active"].isNull() || !saved_["access"].isNull() || dispenser_.isRunning()) {
      Serial.println("El equipo esta ocupado. Usa off para detener la dosis.");
      continue;
    }
    char name = 0;
    char extra = 0;
    long value = 0;
    if (sscanf(command.c_str(), "%c %ld %c", &name, &value, &extra) == 2 && (name == 'p' || name == 'l')) {
      if (value < 500 || value > 2500) { Serial.println("Usa un pulso entre 500 y 2500 us."); continue; }
      override_ = true;
      gate_.stop();
      const bool done = name == 'p' ? gate_.setPulse(value) : dispenser_.setPulse(value);
      Serial.printf("%s: %ld us. Usa on para volver al control automatico.\n", done ? "Pulso enviado" : "Error PWM", value);
      continue;
    }
    if (command == "ciclo") {
      override_ = true;
      benchCycle_ = dispenser_.start(1, foodOpenMs(), millis());
      Serial.println(benchCycle_ ? "Un ciclo de prueba. La cantidad no esta medida." : "No se pudo iniciar el ciclo.");
      continue;
    }
    float grams = 0;
    if (sscanf(command.c_str(), "cal %f %c", &grams, &extra) == 1) {
      if (!std::isfinite(grams) || grams <= 0 || grams > 1000) {
        Serial.println("Usa cal <gramos estimados por ciclo>.");
        continue;
      }
      saved_["gramsPerCycle"] = grams;
      if (save()) Serial.printf("Calibracion guardada: %.2f g estimados por ciclo.\n", grams);
      continue;
    }
    if (command.startsWith("hora ")) {
      char* end = nullptr;
      const String number = command.substring(5);
      const unsigned long epoch = strtoul(number.c_str(), &end, 10);
      if (end != number.c_str() && !*end && clock_.setUtc(epoch)) Serial.println("Hora UTC configurada.");
      else Serial.println("La hora debe ser una marca Unix UTC valida.");
      continue;
    }
    Serial.println("Usa estado, p 2500, l 1600, off, on, ciclo, cal 20 u hora <Unix UTC>.");
  }
}

void FeederController::report(uint32_t now) {
  Serial.printf("WiFi:%d MQTT:%d UUID:%s Hora:%s Acceso:%s PWM:%s Resultados:%u\n", int(WiFi.status()),
    mqtt_.connected(), DeviceConfig::DEVICE_ID, timestamp().c_str(), gate_.observedState(),
    override_ ? "manual" : "automatico", unsigned(saved_["events"].size()));
  Serial.printf("Presencia:%s RFID:%s Calibracion:%.2f g/ciclo estimados, %lu ms\n",
    presence_.present() ? "si" : "no", rfid_.readRecent(now, DeviceConfig::TAG_RECENT_MS).c_str(),
    saved_["gramsPerCycle"].as<float>(), static_cast<unsigned long>(foodOpenMs()));
  if (!fault_.isEmpty()) Serial.println(fault_);
}

void FeederController::tick() {
  const uint32_t now = millis();
  rfid_.tick(now);
  presence_.tick(now);
  clock_.tick(now);
  dispenser_.tick(now);
  serialCommand();
  if (storageReady_) {
    updateBudget();
    if (!saved_["active"].isNull() && dispenser_.finished()) finishDispense("completed");
    else if (!saved_["active"].isNull() && dispenser_.failed()) finishDispense("failed", "Fallo del dosificador.");
    if (benchCycle_ && (dispenser_.finished() || dispenser_.failed())) {
      Serial.println(dispenser_.finished() ? "Ciclo de prueba terminado." : "Fallo durante el ciclo de prueba.");
      dispenser_.reset();
      benchCycle_ = false;
    }
    checkAccess(now);
    checkRfid(now);
    checkSchedules(now);
  }
  connect(now);
  processIncoming();
  observe(now);
  publishResults(now);
  if (now - reportedAt_ >= 5000) { reportedAt_ = now; report(now); }
}
