#pragma once

#include <Arduino.h>
#include <RTClib.h>
#include <VL53L0X.h>
#include <optional>

class RfidReader {
 public:
  void begin();
  void tick(uint32_t now);
  String readRecent(uint32_t now, uint32_t maxAgeMs) const;

 private:
  uint8_t bytes_[32]{};
  size_t used_ = 0;
  uint32_t receivedAt_ = 0;
  uint32_t frameAt_ = 0;
  bool overflow_ = false;
  String frame_;
};

class PresenceSensor {
 public:
  void begin();
  void tick(uint32_t now);
  std::optional<uint16_t> distance(uint32_t now) const;

 private:
  VL53L0X sensor_;
  bool ready_ = false;
  uint32_t checkedAt_ = 0;
  uint32_t sampledAt_ = 0;
  std::optional<uint16_t> distance_;
};

class Clock {
 public:
  void begin();
  void tick(uint32_t now);
  std::optional<DateTime> nowLocal(uint32_t now) const;
  uint32_t monotonicMs() const;

 private:
  RTC_DS3231 rtc_;
  bool ready_ = false;
  uint32_t checkedAt_ = 0;
  std::optional<DateTime> reading_;
};

class Gate {
 public:
  void initialize();
  bool closedSignal() const;
  void stop();
};

class Dispenser {
 public:
  void initialize();
  void stop();
};

class FeederController {
 public:
  void initialize();
  void tick();

 private:
  void report(uint32_t now);
  RfidReader rfid_;
  PresenceSensor presence_;
  Clock clock_;
  Gate gate_;
  Dispenser dispenser_;
  uint32_t reportedAt_ = 0;
};