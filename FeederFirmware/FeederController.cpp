#include "FeederController.h"

#include <Wire.h>

#if __has_include("Secrets.h")
#include "Secrets.h"
#include <PubSubClient.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <ctime>

namespace {
WiFiClientSecure tls;
PubSubClient mqtt(tls);
uint32_t connectionTriedAt = 0;
uint32_t observationSentAt = 0;

void startTelemetry() {
  tls.setCACert(FEEDER_MQTT_CA);
  tls.setHandshakeTimeout(3);
  mqtt.setServer(FEEDER_MQTT_HOST, 8883);
  mqtt.setSocketTimeout(2);
  WiFi.mode(WIFI_STA);
  WiFi.setAutoReconnect(true);
  WiFi.begin(FEEDER_WIFI_SSID, FEEDER_WIFI_PASSWORD);
  configTime(0, 0, "pool.ntp.org");
}

void sendObservation(uint32_t now) {
  if (WiFi.status() != WL_CONNECTED) return;
  const time_t utc = time(nullptr);
  if (utc < 1704067200) return;
  if (!mqtt.connected()) {
    if (now - connectionTriedAt < 10000) return;
    connectionTriedAt = now;
    if (!mqtt.connect(FEEDER_DEVICE_ID, FEEDER_MQTT_USERNAME, FEEDER_MQTT_PASSWORD)) return;
  }
  mqtt.loop();
  if (now - observationSentAt < 10000) return;
  tm parts{};
  if (!gmtime_r(&utc, &parts)) return;
  char at[25];
  if (!strftime(at, sizeof(at), "%Y-%m-%dT%H:%M:%SZ", &parts)) return;
  char topic[80];
  snprintf(topic, sizeof(topic), "feeders/%s/evt/result", FEEDER_DEVICE_ID);
  char payload[216];
  const int count = snprintf(payload, sizeof(payload),
    "{\"id\":\"obs-%lu-%lu\",\"kind\":\"observation\",\"at\":\"%s\",\"gate\":\"unknown\",\"fault\":\"Modo de observacion\"}",
    static_cast<unsigned long>(utc), static_cast<unsigned long>(now), at);
  if (count > 0 && static_cast<size_t>(count) < sizeof(payload) && mqtt.publish(topic, payload, false))
    observationSentAt = now;
}
}
#endif

void RfidReader::begin() {
  Serial2.setRxBufferSize(512);
  Serial2.begin(9600, SERIAL_8N1, 16, -1);
}

void RfidReader::tick(uint32_t now) {
  if ((used_ || overflow_) && now - receivedAt_ >= 30) {
    frame_ = "";
    if (!overflow_) {
      for (size_t i = 0; i < used_; ++i) {
        char hex[3];
        snprintf(hex, sizeof(hex), "%02X", bytes_[i]);
        frame_ += hex;
      }
      frameAt_ = now;
    }
    used_ = 0;
    overflow_ = false;
  }
  for (uint8_t n = 0; n < 8 && Serial2.available(); ++n) {
    const int value = Serial2.read();
    if (value < 0) break;
    receivedAt_ = now;
    if (used_ < sizeof(bytes_)) bytes_[used_++] = value;
    else overflow_ = true;
  }
}

String RfidReader::readRecent(uint32_t now, uint32_t maxAgeMs) const {
  return now - frameAt_ <= maxAgeMs ? frame_ : String();
}

void PresenceSensor::begin() {
  sensor_.setTimeout(50);
  ready_ = sensor_.init() && sensor_.setMeasurementTimingBudget(20000);
  if (ready_) sensor_.startContinuous(50);
}

void PresenceSensor::tick(uint32_t now) {
  if (!ready_ || now - checkedAt_ < 50) return;
  checkedAt_ = now;
  const uint8_t status = sensor_.readReg(VL53L0X::RESULT_INTERRUPT_STATUS);
  if (sensor_.last_status != 0) {
    distance_.reset();
    return;
  }
  if (!(status & 0x07)) return;
  const uint16_t result = sensor_.readRangeContinuousMillimeters();
  sampledAt_ = now;
  if (sensor_.timeoutOccurred() || sensor_.last_status != 0 || result >= 8190)
    distance_.reset();
  else
    distance_ = result;
}

std::optional<uint16_t> PresenceSensor::distance(uint32_t now) const {
  if (now - sampledAt_ > 250) return std::nullopt;
  return distance_;
}

void Clock::begin() {
  ready_ = rtc_.begin(&Wire);
}

void Clock::tick(uint32_t now) {
  if (!ready_ || now - checkedAt_ < 1000) return;
  checkedAt_ = now;
  reading_.reset();
  Wire.beginTransmission(0x68);
  if (Wire.endTransmission() != 0 || rtc_.lostPower()) return;
  const DateTime at = rtc_.now();
  if (at.isValid()) reading_ = at;
}

std::optional<DateTime> Clock::nowLocal(uint32_t now) const {
  if (now - checkedAt_ > 2000) return std::nullopt;
  return reading_;
}

uint32_t Clock::monotonicMs() const {
  return millis();
}

void Gate::initialize() {
  stop();
  pinMode(26, INPUT);
}

bool Gate::closedSignal() const {
  return digitalRead(26) == HIGH;
}

void Gate::stop() {
  digitalWrite(18, LOW);
  pinMode(18, OUTPUT);
}

void Dispenser::initialize() {
  stop();
}

void Dispenser::stop() {
  digitalWrite(19, LOW);
  pinMode(19, OUTPUT);
}

void FeederController::initialize() {
  gate_.initialize();
  dispenser_.initialize();
  Serial.begin(115200);
  Wire.begin(21, 22, 100000);
  Wire.setTimeOut(50);
  rfid_.begin();
  presence_.begin();
  clock_.begin();
#if __has_include("Secrets.h")
  startTelemetry();
#endif
  Serial.println("Banco ESP32. PWM deshabilitado.");
}

void FeederController::tick() {
  const uint32_t now = clock_.monotonicMs();
  rfid_.tick(now);
  presence_.tick(now);
  clock_.tick(now);
  if (now - reportedAt_ >= 1000) {
    reportedAt_ = now;
    report(now);
  }
#if __has_include("Secrets.h")
  sendObservation(now);
#endif
}

void FeederController::report(uint32_t now) {
  const auto distance = presence_.distance(now);
  const auto at = clock_.nowLocal(now);
  const auto rawRfid = rfid_.readRecent(now, 1500);

  Serial.printf("DO26: %d | Distancia: ", gate_.closedSignal());
  if (distance) Serial.printf("%u mm", *distance);
  else Serial.print("sin lectura");
  Serial.print(" | RTC: ");
  if (at) Serial.print(at->timestamp());
  else Serial.print("sin hora");
  Serial.print(" | RFID HEX: ");
  Serial.println(rawRfid.isEmpty() ? "-" : rawRfid);
}
