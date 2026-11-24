#pragma once

#include <Arduino.h>
#include <ArduinoJson.h>
#include <Preferences.h>
#include <PubSubClient.h>
#include <RTClib.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <optional>
#include <freertos/queue.h>

#include "DeviceConfig.h"

class RfidReader {
 public:
  void begin();
  void tick(uint32_t now);
  String readRecent(uint32_t now, uint32_t maxAgeMs) const;
  uint32_t sequence() const;

 private:
  static void readTags(void* queue);
  QueueHandle_t scans_ = nullptr;
  uint32_t frameAt_ = 0;
  uint32_t sequence_ = 0;
  String frame_;
};

class PresenceSensor {
 public:
  void begin();
  void tick(uint32_t now);
  bool present() const;

 private:
  bool lastReading_ = false;
  bool present_ = false;
  uint32_t changedAt_ = 0;
};

class Clock {
 public:
  void begin();
  void tick(uint32_t now);
  uint32_t utc() const;
  bool setUtc(uint32_t utc);
  std::optional<DateTime> nowLocal(uint32_t now) const;

 private:
  RTC_DS3231 rtc_;
  bool ready_ = false;
  uint32_t checkedAt_ = 0;
  uint32_t localEpoch_ = 0;
  uint32_t epochAt_ = 0;
};

class Gate {
 public:
  void initialize();
  bool requestOpen(uint32_t now);
  bool requestClose(uint32_t now);
  void tick(uint32_t now);
  bool closedSignal() const;
  bool moving() const;
  bool closing() const;
  bool closed() const;
  bool open() const;
  bool blocked() const;
  const char* observedState() const;
  void stop();
  bool setPulse(uint16_t pulse);

 private:
  enum class State { Unknown, Opening, Open, Closing, Closed, Blocked };
  State state_ = State::Unknown;
  uint32_t changedAt_ = 0;
  bool ready_ = false;
};

class Dispenser {
 public:
  void initialize();
  bool start(uint16_t cycles, uint32_t now, uint32_t openMs = DeviceConfig::FOOD_OPEN_MS);
  void tick(uint32_t now);
  bool isRunning() const;
  bool finished() const;
  bool failed() const;
  bool manualOpen() const;
  bool setManualPosition(bool open, uint32_t now, uint32_t openMs = 0);
  void reset();
  void stop();
  bool setPulse(uint16_t pulse);

 private:
  enum class State { Idle, BootClosing, Priming, Opening, Holding, Closing, Pausing, Finished, Failed, ManualOpen };
  State state_ = State::Idle;
  uint32_t changedAt_ = 0;
  uint32_t openMs_ = 0;
  uint16_t cycles_ = 0;
  uint16_t completed_ = 0;
  bool ready_ = false;
};

class FeederController {
 public:
  FeederController();
  void initialize();
  void tick();

 private:
  void receive(char* topic, uint8_t* payload, unsigned int length);
  void connect(uint32_t now);
  void processIncoming();
  void applyConfiguration(JsonObjectConst command);
  void acceptManual(JsonObjectConst command);
  void acceptServo(JsonObjectConst command);
  void confirm(JsonArrayConst ids);
  bool validateConfiguration(JsonObjectConst command) const;
  bool save();
  bool queueResult(JsonObjectConst event);
  void transientResult(JsonObjectConst event, const char* key);
  void publishResults(uint32_t now);
  void observe(uint32_t now);
  void recover();
  void updateBudget();
  bool rememberRequest(const String& id, uint32_t now);
  bool beginDispense(const String& id, JsonObjectConst target, const char* source, const String& slotId, const String& scheduleKey);
  void finishDispense(const char* status, const char* reason = nullptr);
  void checkSchedules(uint32_t now);
  void checkAccess(uint32_t now);
  void closeAccess();
  void checkRfid(uint32_t now);
  void serialCommand();
  void loadNetwork();
  void configureWifi(const String& json);
  void report(uint32_t now);
  String date() const;
  String timestamp() const;
  String eventId() const;
  RfidReader rfid_;
  PresenceSensor presence_;
  Clock clock_;
  Gate gate_;
  Dispenser dispenser_;
  Preferences preferences_;
  WiFiClient plain_;
  WiFiClientSecure tls_;
  PubSubClient mqtt_;
  JsonDocument saved_;
  JsonDocument transient_;
  String incoming_;
  String incomingTopic_;
  String serialLine_;
  String wifiSsid_;
  String wifiPassword_;
  String brokerFallback_;
  String fault_;
  String lastTag_;
  String lastAccessTag_;
  String reportedGate_;
  String reportedFault_;
  uint32_t connectionAt_ = 0;
  uint32_t wifiAt_ = 0;
  uint32_t reportedAt_ = 0;
  uint32_t observedAt_ = 0;
  uint32_t publishedAt_ = 0;
  uint32_t schedulesAt_ = 0;
  uint32_t clearAt_ = 0;
  uint32_t manualAccessAt_ = 0;
  uint32_t manualAccessMs_ = 0;
  uint32_t tagSequence_ = 0;
  uint32_t tagReportedAt_ = 0;
  size_t resultIndex_ = 0;
  bool storageReady_ = false;
  bool networkReady_ = false;
  bool override_ = false;
  bool accessHeldOpen_ = false;
  bool mdnsReady_ = false;
  bool benchCycle_ = false;
};
