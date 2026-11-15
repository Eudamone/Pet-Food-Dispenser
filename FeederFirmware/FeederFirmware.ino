#include "FeederController.h"

FeederController feeder;

void setup() {
  feeder.initialize();
}

void loop() {
  feeder.tick();
  delay(1);
}