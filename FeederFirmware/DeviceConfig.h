#pragma once

#include <Arduino.h>

namespace DeviceConfig {
inline constexpr char DEVICE_ID[] = "11111111-1111-4111-8111-111111111111";
inline constexpr uint8_t ACCESS_PIN = 25;
inline constexpr uint8_t FOOD_PIN = 26;
inline constexpr uint16_t ACCESS_CLOSED_US = 2500;
inline constexpr uint16_t ACCESS_OPEN_US = 1600;
inline constexpr uint16_t FOOD_CLOSED_US = 1600;
inline constexpr uint16_t FOOD_OPEN_US = 800;
inline constexpr uint32_t ACCESS_TRAVEL_MS = 1000;
inline constexpr uint32_t FOOD_TRAVEL_MS = 400;
inline constexpr uint32_t FOOD_OPEN_MS = 800;
inline constexpr uint32_t FOOD_PAUSE_MS = 300;
inline constexpr float ESTIMATED_GRAMS_PER_CYCLE = 20.0f;
inline constexpr uint16_t MAX_CYCLES_PER_ORDER = 30;
inline constexpr int CLOSED_SENSOR_PIN = -1;
inline constexpr bool CLOSED_SENSOR_HIGH = true;
inline constexpr uint32_t CLOSED_SENSOR_TIMEOUT_MS = 2500;
inline constexpr uint8_t RFID_RX_PIN = 16;
inline constexpr uint8_t I2C_SDA_PIN = 21;
inline constexpr uint8_t I2C_SCL_PIN = 22;
inline constexpr uint16_t PRESENCE_MM = 180;
inline constexpr uint32_t CLEAR_BEFORE_CLOSE_MS = 2000;
inline constexpr uint32_t TAG_RECENT_MS = 2000;
inline constexpr uint32_t RFID_REPORT_MS = 2000;
inline constexpr int32_t UTC_OFFSET_SECONDS = -5 * 3600;
inline constexpr uint32_t MANUAL_ORDER_MAX_AGE_SECONDS = 300;
inline constexpr size_t MAX_SLOTS = 16;
inline constexpr size_t MAX_PETS = 16;
inline constexpr size_t MAX_PENDING_RESULTS = 12;
inline constexpr size_t MAX_RECENT_REQUESTS = 32;
inline constexpr size_t MAX_MQTT_BYTES = 6144;
inline constexpr size_t MAX_SAVED_BYTES = 14000;
}
