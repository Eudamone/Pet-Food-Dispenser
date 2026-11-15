#pragma once

#include <Arduino.h>
#include <HX711.h>
#include <RTClib.h>
#include <VL53L0X.h>
#include <optional>

class DeviceMemory {
 public:
  std::optional<float> loadCalibration() const;
  std::optional<long> loadTare() const;
  bool saveTare(long offset) const;
};

class WeightSensor {
 public:
  explicit WeightSensor(const DeviceMemory& memory) : memory_(memory) {}
  void begin();
  void tick(uint32_t now);
  void tareEmptyPlate(uint32_t now);
  std::optional<float> readStable(uint32_t now) const;

 private:
  const DeviceMemory& memory_;
  HX711 scale_;
  std::optional<float> factor_;
  std::optional<long> zero_;
  long samples_[5]{};
  uint8_t count_ = 0;
  uint8_t cursor_ = 0;
  uint32_t sampledAt_ = 0;
  bool taring_ = false;
  uint32_t tareStartedAt_ = 0;
  int64_t tareSum_ = 0;
  uint8_t tareCount_ = 0;
};

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
  DeviceMemory memory_;
  WeightSensor weight_{memory_};
  RfidReader rfid_;
  PresenceSensor presence_;
  Clock clock_;
  Gate gate_;
  Dispenser dispenser_;
  uint32_t reportedAt_ = 0;
};