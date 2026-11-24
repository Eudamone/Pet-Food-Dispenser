# Prueba del alimentador por RFID

Abre [PruebaAlimentador.ino](PruebaAlimentador.ino) en Arduino IDE, selecciona **ESP32 Dev Module** e instala **Adafruit PN532** y **Adafruit BusIO** desde el gestor de bibliotecas.

## Conexiones

| Equipo | Conexión |
|---|---|
| PN532 en modo I²C | Selector 1 en ON y 2 en OFF. SDA a GPIO16 en azul, SCL a GPIO17 en morado. VCC directo a `U23` y GND a `X23`. |
| FC-51 | OUT a GPIO33 en amarillo. VCC directo a `U24` y GND a `X24`. Debe dar nivel bajo al detectar. |
| Servo pesado D2000St | PWM desde GPIO25 en blanco. Potencia desde los tornillos 2 (+5 V) y 6 (GND). |
| Servo liviano D1090PL | PWM desde GPIO26 en rojo. Potencia desde los tornillos 3 (+5 V) y 7 (GND). |
| ESP32 | GND común desde el tornillo 8 a `X26` de la tira GND. Para usar el Monitor serie, desconecta el cable rojo de VIN y alimenta el ESP32 por micro-USB. Para la prueba por VIN, retira el USB y conecta el cable del tornillo 4 a VIN con la fuente apagada. |

## Prueba de banco

1. Empieza con las paletas libres y sin mascota en la trayectoria. Abre el Monitor serie a **115200**. Deja libre el FC-51 hasta ver **Listo. Presenta una etiqueta.** Durante el arranque el programa coloca cada servo en su pulso inicial.
2. Presenta una etiqueta ISO14443A. El PN532 imprime su UID, y el servo pesado abre de **2500 µs a 1500 µs**. Cada etiqueta mantiene bloqueado un segundo ciclo hasta que se retira del alcance del lector.
3. Simula la presencia de la mascota ante el FC-51 manteniendo despejada la trayectoria. Una vez transcurrido el tiempo de apertura, la tolva baja de **1600 µs a 800 µs**, permanece abierta **10 segundos** después de la espera de movimiento y vuelve a **1600 µs**.
4. El acceso permanece abierto si el FC-51 sigue detectando o si todavía no detectó presencia en ese ciclo. Tras terminar la dosificación, y después de **2 segundos continuos sin detección**, empieza a cerrar hacia **2500 µs**. Si acercas el objeto durante el cierre, el acceso vuelve a **1500 µs** y espera otra salida.

Ajusta ESPERA_APERTURA_MS y MOVIMIENTO_TOLVA_MS al tiempo medido con cada mecanismo. Los **1200 ms** y **600 ms** iniciales son tiempos de prueba. Los servos reciben una orden de posición y el montaje carece de realimentación de fin de carrera. Verifica la apertura real en banco y conserva la protección mecánica contra atrapamiento para el uso con una mascota.
