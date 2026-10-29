# API del backend — Pet Food Dispenser

Backend REST (NestJS + TypeScript) para el comedero inteligente. Expone las
operaciones que consumen la app (front) y el dispositivo (firmware).

- URL base: `http://localhost:3000`
- Puerto: variable `PORT` (por defecto `3000`)
- CORS: habilitado (`origin: true`, `credentials: true`)
- Formato: `Content-Type: application/json`

## Cómo levantar el servidor

```bash
npm install
npm run start:dev          # desarrollo (Espera que la BD en Supabase este habilitada)
#o tambien
PERSISTENCE=memory npm run start:dev # Desarrollo, todo se guarda en memoria, los datos existen mientras el backend ente on
# o
npm run build && npm run start:prod #Producción
```

Persistencia:

| Modo | Requisito | Cómo activarlo |
|------|-----------|----------------|
| PostgreSQL / Supabase (por defecto) | `DATABASE_URL` válida en `.env` | `npm run start:dev` |
| En memoria (sin base de datos) | ninguno | `PERSISTENCE=memory npm run start:dev` |

El modo en memoria usa `PersistenceMemoryModule`; el modo normal usa
`PersistenceModule` (TypeORM + PostgreSQL). Al arrancar se imprime
`Backend escuchando en http://localhost:3000`.

## Autenticación (importante)

La autenticación es **real** y basada en **JWT** (HS256, `@nestjs/jwt`). El
registro y el inicio de sesión devuelven un `accessToken`; enviarlo en cada
petición protegida con la cabecera `Authorization: Bearer <accessToken>`. Las
contraseñas se guardan con hash **bcrypt** (nunca en texto plano) y el token
incluye `sub` (id de usuario), `iat` y `exp` (vigencia = `JWT_EXPIRES_IN`, por
defecto `1d`).

Endpoints **protegidos** (requieren `Authorization: Bearer …`): `/auth/me`,
`/auth/email-change`, `/auth/change-password`, `/auth/sign-out`, todo `/pets/*`,
todo `/feeding/*` y todo `/devices/*`. Sin token válido responden `401`.

Los secretos `JWT_SECRET` y `JWT_EXPIRES_IN` se leen de `.env` (en producción
`JWT_SECRET` es obligatorio). El token es *stateless*: `sign-out` no lo invalida,
el front simplemente lo descarta.

## Convenciones

- `Instant` (fechas `from`/`to`): ISO-8601, por ej: `2026-10-18T13:00:00.000Z`.
- `day`: `YYYY-MM-DD`.
- Hora de horario (`time`): `HH:mm`.
- `days`: array de `MONDAY | TUESDAY | WEDNESDAY | THURSDAY | FRIDAY | SATURDAY | SUNDAY`.
- Objetos de dominio: `email` se serializa como string y `password` como `"[REDACTED]"`.

### Contrato para la UI

- Todas las rutas de abajo se concatenan con la URL base. Los ejemplos de cuerpos
  son JSON; los números deben enviarse como números, no como texto (`150`, no
  `"150"`). Las propiedades desconocidas se ignoran por el servidor.
- Los identificadores son strings opacos. No generar IDs para mascotas,
  dispositivos o tags, usar los IDs devueltos. El único ID que se puede generar es
  `requestId` al solicitar un dispensado, para poder repetir esa solicitud con
  la misma clave si hay un timeout.
- En las respuestas JSON, fechas `Instant` son strings ISO-8601 UTC, fechas
  calendario son `YYYY-MM-DD`, horas de horario son `HH:mm`, y los valores nulos
  se representan como `null`. El backend no pagina listas.
- Los endpoints `204` no tienen cuerpo. No intentar parsear JSON en esas
  respuestas. `POST` responde `201` salvo rutas indicadas explícitamente como
  `204`; `GET` y `PATCH` responden `200`.
- Una mutación de horario, límite, acceso autorizado o aplicación devuelve una
  `revision`. Indica la revisión solicitada al dispositivo, no confirma que el
  ESP32 ya la aplicó. Compara `desiredRevision` con `appliedRevision` al mostrar
  sincronización.

### Errores HTTP para formularios

El backend devuelve el formato estándar NestJS. Por ejemplo:

```json
{"statusCode":400,"message":"Email is already registered","error":"Bad Request"}
```

`message` puede ser texto o una lista de errores de validación. Presenta el
mensaje junto al formulario cuando sea útil; no dependas de coincidencias
exactas de texto para la lógica. Códigos relevantes:

| Código | Uso esperado en UI |
|---|---|
| `400` | Datos inválidos o regla de negocio; conservar el formulario y mostrar el error. |
| `401` | Token ausente, inválido o vencido; limpia la sesión local y vuelve a login. |
| `403` | El usuario no es dueño del recurso. |
| `404` | Recurso/mascota/plan/tag inexistente o no visible para ese usuario. |
| `409` | Email/tag/plan/clave de vinculación en conflicto. |
| `503` | No se pudo conectar con el comedero; permite reintentar según la acción. |

La validación DTO comprueba tipos/formato y algunos límites. Las reglas de
dominio también pueden devolver `400`; por ejemplo, porciones superiores a la
capacidad del bowl o suma diaria excedida.

Códigos de estado usados:

- `200/201` OK / creado
- `204` sin contenido
- `400` DTO inválido (class-validator) o regla de negocio incumplida (`DomainError`)
- `401` sin token o token inválido/expirado · `403` recurso de otro usuario · `404` no encontrado
- `409` conflicto (duplicado) · `503` fallo de conexión con el dispositivo

---

## Salud

| Método | Ruta | Descripción | Respuesta |
|--------|------|-------------|-----------|
| GET | `/` | verificación de arranque | `"Hello World!"` |

```bash
curl http://localhost:3000/
```

---

## Autenticación — `/auth`

| Método | Ruta | Cuerpo | Respuesta |
|--------|------|--------|-----------|
| POST | `/auth/register` | `{ name, email, password }` | `201` `{ accessToken, user }` |
| POST | `/auth/sign-in` | `{ email, password }` | `201` `{ accessToken, user }` |
| GET | `/auth/me` | — (Bearer) | `200` `User` |
| POST | `/auth/email-change` | `{ newEmail }` (Bearer) | `204` |
| POST | `/auth/password-reset` | `{ email }` | `204` (enviar el enlace si la cuenta existe) |
| POST | `/auth/password-reset/confirm` | `{ token, newPassword }` | `204` |
| POST | `/auth/change-password` | `{ newPassword }` (Bearer) | `204` |
| POST | `/auth/sign-out` | — (Bearer) | `204` |

`password`/`newPassword`: mínimo 6 caracteres. `password` se serializa como
`"[REDACTED]"`; el `User` devuelto no incluye el hash.

```bash
# Registro -> { accessToken, user }
TOKEN=$(curl -s -X POST http://localhost:3000/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"name":"Ana","email":"ana@mail.com","password":"secret1"}' \
  | node -pe 'JSON.parse(require("fs").readFileSync(0)).accessToken')

# Iniciar sesión -> { accessToken, user }
curl -X POST http://localhost:3000/auth/sign-in \
  -H 'Content-Type: application/json' \
  -d '{"email":"ana@mail.com","password":"secret1"}'

# Usuario actual (requiere token)
curl http://localhost:3000/auth/me -H "Authorization: Bearer $TOKEN"

# Cerrar sesión (el front descarta el token)
curl -X POST http://localhost:3000/auth/sign-out -H "Authorization: Bearer $TOKEN"
```

### Recuperación de contraseña por correo

`POST /auth/password-reset` siempre responde `204`, exista o no el correo, para
no revelar qué cuentas están registradas. Si la cuenta existe, envía un correo
con un enlace que incluye un token de un solo uso.

```bash
curl -X POST http://localhost:3000/auth/password-reset \
  -H 'Content-Type: application/json' \
  -d '{"email":"ana@mail.com"}'
```

El enlace tiene esta forma:

```text
dispensador://reset-password?token=<TOKEN>
```

El front debe extraer `token` y confirmar el cambio:

```bash
curl -X POST http://localhost:3000/auth/password-reset/confirm \
  -H 'Content-Type: application/json' \
  -d '{"token":"<TOKEN>","newPassword":"nuevaClave1"}'
```

El token vence a los 15 minutos por defecto y queda invalidado al cambiar la
contraseña, por lo que no puede reutilizarse. `newPassword` debe tener al menos
6 caracteres.

### Configuración de correo con Gmail

El envío usa **nodemailer** con el host SMTP de Gmail (`smtp.gmail.com`,
puerto 465 con TLS). En `.env`:

```dotenv
# Cuenta de Gmail y "contraseña de aplicación" (Cuenta de Google > Seguridad >
# Contraseñas de aplicación). La contraseña normal de la cuenta no funciona.
MAIL_USER=tu_correo_de_gmail
MAIL_PASSWORD=tu_contrasena_de_aplicacion

# Opcional. Por defecto se usa MAIL_USER como remitente; Gmail solo admite la
# cuenta autenticada o un alias verificado en ella.
MAIL_FROM="Pet Food Dispenser <tu_correo_de_gmail>"

PASSWORD_RESET_URL=dispensador://reset-password
PASSWORD_RESET_TOKEN_TTL_MINUTES=15
# Opcional. Si se omite se usa JWT_SECRET.
PASSWORD_RESET_SECRET=un_secreto_largo_y_aleatorio
```

Las variables antiguas `MAIL_TOKEN`, `MAILTRAP_SANDBOX` e `MAILTRAP_INBOX_ID`
de Mailtrap ya no se usan.

En desarrollo con **Expo Go**, el esquema propio no está registrado; usa el
enlace de Expo (ajusta la IP y el puerto):

```dotenv
PASSWORD_RESET_URL=exp://192.168.40.86:8081/--/reset-password
```

Si faltan `MAIL_USER` o `MAIL_PASSWORD`, o Gmail rechaza el envío, el backend
sigue arrancando y `POST /auth/password-reset` responde `204`, pero el error se
registra en los logs del servidor.

---

## Mascotas y tags — `/pets`

> Requiere `Authorization: Bearer <accessToken>`.

| Método | Ruta | Cuerpo | Respuesta |
|--------|------|--------|-----------|
| POST | `/pets` | `{ name, species?, birthYear?, birthMonth?, birthDay? }` | `201` `Pet` |
| GET | `/pets` | — | `200` `Pet[]` |
| GET | `/pets/count` | — | `200` `{ count }` |
| PATCH | `/pets/:id` | `{ name, species?, birthYear?, birthMonth?, birthDay? }` | `204` |
| PATCH | `/pets/:id/daily-limit` | `{ grams }` | `204` |
| POST | `/pets/tags` | `{ uid }` | `201` `RfidTag` |
| POST | `/pets/:id/tags` | `{ uid }` | `204` (asigna el tag a la mascota) |
| DELETE | `/pets/tags/:uid` | — | `204` (desasigna el tag) |
| DELETE | `/pets/:id/tags` | — | `204` (revoca/inactiva el tag activo) |

`birth*` es una fecha parcial: puedes enviar solo `birthYear`, o
`birthYear + birthMonth`, o los tres. Debe ser una fecha pasada.

```bash
# Registrar mascota
curl -X POST http://localhost:3000/pets \
  -H 'Content-Type: application/json' \
  -d '{"name":"Firulais","species":"dog","birthYear":2021,"birthMonth":5}'

# Definir límite diario (gramos)
curl -X PATCH http://localhost:3000/pets/<PET_ID>/daily-limit \
  -H 'Content-Type: application/json' -d '{"grams":150}'

# Registrar un tag RFID y asignarlo
curl -X POST http://localhost:3000/pets/tags \
  -H 'Content-Type: application/json' -d '{"uid":"AA11BB22"}'

curl -X POST http://localhost:3000/pets/<PET_ID>/tags \
  -H 'Content-Type: application/json' -d '{"uid":"AA11BB22"}'
```

---

## Alimentación y consumo — `/feeding/devices/:deviceId`

> Requiere `Authorization: Bearer <accessToken>`.

Todas las rutas requieren ser dueño del dispositivo. `revision` es la revisión de
configuración que se envió al comedero.

| Método | Ruta | Cuerpo / Query | Respuesta |
|--------|------|----------------|-----------|
| POST | `/plans` | `{ maxDailyDispensedGrams }` | `201` `FeedingPlan` |
| GET | `/plan` | — | `200` `FeedingPlan \| null` |
| POST | `/slots` | `{ id?, time, days, targetGrams, enabled? }` | `201` `{ revision }` |
| DELETE | `/slots/:slotId` | — | `200` `{ revision }` |
| PATCH | `/max-daily` | `{ grams }` | `200` `{ revision }` |
| PATCH | `/enabled` | `{ enabled }` | `200` `{ revision }` |
| GET | `/dispensing` | `?from&to` | `200` `DispensingRecord[]` |
| GET | `/access` | `?from&to` | `200` `AccessSession[]` |
| GET | `/consumption/:petId` | `?day` | `200` `DailyConsumption` |
| GET | `/budget/:petId` | — | `200` `BudgetQueryResult` |

Reglas del plan: `targetGrams` de cada slot ≤ capacidad del bowl del dispositivo,
y la suma de slots habilitados ≤ `maxDailyDispensedGrams`.

```bash
# Crear el plan del dispositivo
curl -X POST http://localhost:3000/feeding/devices/<DEVICE_ID>/plans \
  -H 'Content-Type: application/json' -d '{"maxDailyDispensedGrams":200}'

# Agregar un horario (slot) y aplicar la configuración
curl -X POST http://localhost:3000/feeding/devices/<DEVICE_ID>/slots \
  -H 'Content-Type: application/json' \
  -d '{"time":"08:00","days":["MONDAY","TUESDAY"],"targetGrams":120,"enabled":true}'

# Activar/pausar el plan completo
curl -X PATCH http://localhost:3000/feeding/devices/<DEVICE_ID>/enabled \
  -H 'Content-Type: application/json' -d '{"enabled":true}'

# Historial de dispensado y de accesos (filtros opcionales)
curl "http://localhost:3000/feeding/devices/<DEVICE_ID>/dispensing?from=2026-10-01T00:00:00.000Z"
curl "http://localhost:3000/feeding/devices/<DEVICE_ID>/access"

# Consumo del día de una mascota (por defecto hoy) y presupuesto restante
curl "http://localhost:3000/feeding/devices/<DEVICE_ID>/consumption/<PET_ID>?day=2026-10-18"
curl "http://localhost:3000/feeding/devices/<DEVICE_ID>/budget/<PET_ID>"
```

`BudgetQueryResult` incluye `dailyLimitGrams`, `consumedGrams`,
`remainingGrams` y `completeMeasurements`.

---

## Dispositivos — `/devices`

> Requiere `Authorization: Bearer <accessToken>`.

| Método | Ruta | Cuerpo | Respuesta |
|--------|------|--------|-----------|
| POST | `/devices` | `{ bindingCode }` | `201` `FeederDevice` |
| GET | `/devices` | — | `200` `FeederDevice[]` |
| GET | `/devices/:id` | — | `200` `FeederDevice` |
| GET | `/devices/:id/configuration` | — | `200` `ConfigurationData \| null` |
| POST | `/devices/:id/access/:petId` | — | `201` `{ revision }` (autoriza mascota; `409` si el comedero ya tiene otra mascota o si la mascota ya está en otro comedero) |
| DELETE | `/devices/:id/access/:petId` | — | `200` `{ revision }` (revoca) |
| POST | `/devices/:id/apply` | — | `201` `{ revision }` (envía la configuración) |
| POST | `/devices/:id/dispense` | `{ requestId?, targetGrams }` | `201` `{ requestId }` |
| POST | `/devices/:id/synchronize` | — | `204` (procesa eventos del comedero) |

```bash
# Vincular un comedero con su código de emparejamiento
curl -X POST http://localhost:3000/devices \
  -H 'Content-Type: application/json' -d '{"bindingCode":"KITCHEN-01"}'

# Autorizar una mascota en el comedero
curl -X POST http://localhost:3000/devices/<DEVICE_ID>/access/<PET_ID>

# Enviar (aplicar) la configuración al dispositivo
curl -X POST http://localhost:3000/devices/<DEVICE_ID>/apply

# Dispensar manualmente 50 g
curl -X POST http://localhost:3000/devices/<DEVICE_ID>/dispense \
  -H 'Content-Type: application/json' -d '{"targetGrams":50}'

# Consultar la configuración aplicada
curl http://localhost:3000/devices/<DEVICE_ID>/configuration

# Sincronizar eventos pendientes del comedero
curl -X POST http://localhost:3000/devices/<DEVICE_ID>/synchronize
```

---

## Flujo típico (front)

```bash
BASE=http://localhost:3000

# 1) registrarse y guardar el token
TOKEN=$(curl -s -X POST $BASE/auth/register -H 'Content-Type: application/json' \
  -d '{"name":"Ana","email":"ana@mail.com","password":"secret1"}' \
  | node -pe 'JSON.parse(require("fs").readFileSync(0)).accessToken')
AUTH="Authorization: Bearer $TOKEN"

# 2) crear mascota y límite
PET=$(curl -s -X POST $BASE/pets -H "$AUTH" -H 'Content-Type: application/json' \
  -d '{"name":"Firulais"}' | node -pe 'JSON.parse(require("fs").readFileSync(0)).id')
curl -X PATCH $BASE/pets/$PET/daily-limit -H "$AUTH" -H 'Content-Type: application/json' -d '{"grams":150}'

# 3) vincular comedero
DEV=$(curl -s -X POST $BASE/devices -H "$AUTH" -H 'Content-Type: application/json' \
  -d '{"bindingCode":"KITCHEN-01"}' | node -pe 'JSON.parse(require("fs").readFileSync(0)).id')

# 4) plan + horario + autorización
curl -X POST $BASE/feeding/devices/$DEV/plans -H "$AUTH" -H 'Content-Type: application/json' \
  -d '{"maxDailyDispensedGrams":200}'
curl -X POST $BASE/feeding/devices/$DEV/slots -H "$AUTH" -H 'Content-Type: application/json' \
  -d '{"time":"08:00","days":["MONDAY"],"targetGrams":120}'
curl -X POST $BASE/devices/$DEV/access/$PET -H "$AUTH"

# 5) dispensar manualmente
curl -X POST $BASE/devices/$DEV/dispense -H "$AUTH" -H 'Content-Type: application/json' \
  -d '{"targetGrams":50}'
```

## Integración con el firmware (ESP32)

- El dispositivo se **vincula** con `POST /devices` (`bindingCode`).
- Obtiene su configuración vigente con `GET /devices/:id/configuration`.
- Reporta/recupera resultados con `POST /devices/:id/synchronize`.
- El backend liga el comedero con **una sola mascota** mediante
  `POST /devices/:id/access/:petId` (relación 1‑1, `409` si el comedero ya tiene
  otra mascota o la mascota ya está en otro; ver `docs/RELACIONES.md`) y consulta
  quién puede comer con el presupuesto diario de `/feeding/.../budget/:petId`.

> Nota: `ConnectionClient` (comunicación con el ESP32) todavía tiene implementación
> **en memoria**; para hardware real hay que implementar esa interfaz (p. ej.
> MQTT/WebSocket). La autenticación ya es JWT real (no en memoria). Actualmente no
> existe un endpoint para que el firmware *empuje* un `DeviceEvent` por HTTP: la
> lectura de eventos pasa por `ConnectionClient`.

---

## Referencia detallada para formularios y pantallas

Las tablas iniciales sirven como índice de rutas. Esta sección precisa los
campos que debe construir cada pantalla y los objetos que conviene guardar en
estado de UI. Todas las rutas bajo `/pets`, `/devices` y `/feeding` requieren
Bearer token y operan dentro de la cuenta autenticada.

### Sesión y navegación de autenticación

Al registrar o iniciar sesión, guarda `accessToken` y el objeto `user` de la
respuesta. En React Native almacena el token en almacenamiento seguro del
dispositivo (por ejemplo, Expo SecureStore), no en AsyncStorage ni en una
constante global persistente. Mantén el usuario en estado de aplicación para
renderizar la UI; al iniciar la app, recupera el token y consulta `/auth/me` para
validarlo antes de mostrar pantallas privadas.

```json
{
  "accessToken": "eyJ...",
  "user": { "id": "uuid", "name": "Ana", "email": "ana@mail.com", "password": "[REDACTED]" }
}
```

`password` siempre es redacted en la serialización; no usar ni guardar
desde la respuesta. Para llamadas protegidas usar:

```js
const headers = {
  Authorization: `Bearer ${accessToken}`,
  'Content-Type': 'application/json',
};
```

El JWT es stateless. La duración la define `JWT_EXPIRES_IN` (por defecto un
día); el payload de acceso contiene `sub`, `iat`, `exp`. No hay refresh token.
Cuando una petición protegida responde `401`, borra el token seguro y el estado
de usuario y navega a login. `POST /auth/sign-out` responde `204`, pero no
revoca el JWT en servidor: la acción de cierre efectiva es eliminar el token
del almacenamiento local. También borra la sesión local tras cambiar la
contraseña si la app quiere forzar un nuevo inicio de sesión. El token de
recuperación es distinto del access token: úsalo solo en
`/auth/password-reset/confirm`, nunca como Bearer.

| Ruta | Campos del formulario | Resultado / comportamiento |
|---|---|---|
| `POST /auth/register` | `name` string (mínimo 2), `email` válido, `password` string (mínimo 6) | `201` `{ accessToken, user }`; email duplicado es `400`. |
| `POST /auth/sign-in` | `email`, `password` | `201` `{ accessToken, user }`; credenciales incorrectas `401`. |
| `GET /auth/me` | sin cuerpo | `200` `User`; útil para rehidratar/validar sesión. |
| `POST /auth/email-change` | `newEmail` válido | `204`; cambia inmediatamente, no existe paso de verificación por email. Email ocupado `400`. |
| `POST /auth/password-reset` | `email` válido | `204` en ambos casos (exista o no); muestra confirmación genérica. |
| `POST /auth/password-reset/confirm` | `token` del enlace, `newPassword` mínimo 6 | `204`; token inválido/vencido/reutilizado `400`. |
| `POST /auth/change-password` | `newPassword` mínimo 6 | `204`; requiere sesión actual. |
| `POST /auth/sign-out` | sin cuerpo | `204`; descartar access token local. |

Solicitud de recuperación de contraseña no revela si el correo existe. Si se
envía el correo, el deep link tiene `?token=...`; extrae ese parámetro y
presenta un formulario de nueva contraseña. El TTL por defecto es 15 minutos
(configurable). El token se invalida después de cambiar la contraseña; solicita
un enlace nuevo si vence o ya se usó. Para `/auth/password-reset` no indiques
“correo enviado” de forma concluyente: muestra “Si la cuenta existe, recibirás
un enlace”.

### Mascotas y RFID

| Ruta | Formulario/cuerpo | Respuesta y notas |
|---|---|---|
| `POST /pets` | `name` requerido (mín. 2); `species` opcional; `birthYear` opcional 1900–2100, `birthMonth` 1–12, `birthDay` 1–31 | `201 Pet`. Fecha parcial permitida: año, año/mes o fecha completa pasada. |
| `GET /pets` | — | `200 Pet[]` del usuario actual. Cada mascota tiene `id`, `ownerId`, `name`, `species`, `dailyLimitGrams`, `birthYear`, `birthMonth`, `birthDay`. Campos no definidos llegan `null`. |
| `GET /pets/count` | — | `200 { "count": number }`. |
| `PATCH /pets/:id` | Mismos campos que crear; `name` sigue requerido | `204`; actualiza mascota. Si omites todos los campos `birth*`, conserva la fecha actual. Si envías un año parcial, reemplaza la fecha por esa precisión (p. ej. solo `birthYear` borra mes/día). No hay operación para borrar toda la fecha. `species` omitida se trata como `null` y limpia la especie. |
| `PATCH /pets/:id/daily-limit` | `{ "grams": number }`, mayor que cero | `204`. |
| `POST /pets/tags` | `{ "uid": "AA11BB22" }` | `201 RfidTag` con `uid`, `ownerId`, `petId: null`, `active: true`. UID duplicado `409`. |
| `POST /pets/:id/tags` | `{ "uid": "AA11BB22" }` | `204`; asigna tag propio sin asignación activa a otra mascota. |
| `DELETE /pets/tags/:uid` | — | `204`; quita asignación y conserva el tag registrado. |
| `DELETE /pets/:id/tags` | — | `204`; revoca/desactiva el tag activo de esa mascota. El flujo de asignación no reactiva explícitamente un tag desactivado; administra tags activos como el flujo RFID vigente y consulta backend ante conflictos. |

Usar un modelo de formulario independiente para `birthYear`, `birthMonth` y
`birthDay`, porque una fecha puede ser parcial. No convertir un año parcial a
una fecha completa inventando mes/día. `dailyLimitGrams: null` significa que no
se configuró límite.

```json
{
  "id": "pet-uuid",
  "ownerId": "user-uuid",
  "name": "Firulais",
  "species": "dog",
  "dailyLimitGrams": 150,
  "birthYear": 2021,
  "birthMonth": 5,
  "birthDay": null
}
```

### Vinculación, acceso y dispensado manual

`POST /devices` recibe el código de emparejamiento entregado por el comedero,
no un ID inventado por la app. Un código repetido/no vinculable produce
`409`. La respuesta `FeederDevice` incluye `id`, `name`, `authorizedPetIds`,
`maxBowlGrams`, `desiredRevision`, `appliedRevision`, `lastSeenAt`,
`lastBowlGrams`, `gateState` y `lastFault`; `ownerId` puede estar incluido en la
respuesta del modelo.

**Regla de negocio (1‑1):** un comedero sirve a **una sola mascota** y una
mascota come en **un solo comedero** (dos mascotas = dos comederos).
`authorizedPetIds` por eso trae **0 o 1 elementos**; la restricción está en la
base de datos (`UNIQUE`) y se explica en el API como `409`:

| Situación | Respuesta |
|---|---|
| Autorizar la mascota que ya tiene el comedero | `201 { revision }` (idempotente) |
| Autorizar una segunda mascota al mismo comedero | `409` |
| Autorizar una mascota que ya está en otro comedero | `409` |
| Revocar y autorizar otra | `200`/`201` (el comedero queda libre) |

| Ruta | Entrada | Resultado |
|---|---|---|
| `POST /devices` | `{ "bindingCode": "KITCHEN-01" }` | `201 FeederDevice`. |
| `GET /devices` | — | `200 FeederDevice[]` del dueño. |
| `GET /devices/:id` | — | `200 FeederDevice`; otro dueño `403`, inexistente `404`. |
| `GET /devices/:id/configuration` | — | `200 ConfigurationData` o `null` si aún no se aplicó configuración. |
| `POST /devices/:id/access/:petId` | IDs en ruta | `201 { "revision": number }`; liga el comedero a esa mascota. `409` si el comedero ya tiene otra mascota o si la mascota ya está en otro comedero; repetir la misma mascota es idempotente. |
| `DELETE /devices/:id/access/:petId` | IDs en ruta | `200 { "revision": number }`; revoca acceso. |
| `POST /devices/:id/apply` | sin cuerpo | `201 { "revision": number }`; solicita aplicar la configuración actual. |
| `POST /devices/:id/dispense` | `targetGrams` positivo; `requestId` UUID opcional | `201 { "requestId": "uuid" }`; el ID identifica la solicitud, no el resultado físico. |
| `POST /devices/:id/synchronize` | sin cuerpo | `204`; procesa eventos del dispositivo. |

`gateState` puede ser `UNKNOWN`, `OPEN`, `CLOSED`, `OPENING`, `CLOSING` o
`FAULT`. El frontend debe tolerar nuevos valores como estado desconocido. La
configuración tiene esta forma:

```json
{
  "deviceId": "device-uuid",
  "revision": 8,
  "maxBowlGrams": 250,
  "authorizedPetIds": ["pet-uuid"],
  "plan": {
    "enabled": true,
    "maxDailyDispensedGrams": 200,
    "slots": [{ "id": "slot-uuid", "time": "08:00", "days": ["MONDAY"], "targetGrams": 100, "enabled": true }]
  }
}
```

Para el botón de dispensado manual, validar visualmente que la cantidad sea
positiva y no supere `maxBowlGrams` del dispositivo, el backend también aplica
ese límite y devuelve `400`. Genera `requestId` con UUID al iniciar una acción
y conserva el mismo al reintentar por timeout para evitar duplicar la orden.
Un `201` solo confirma recepción de la solicitud. El endpoint no devuelve el
estado final; la implementación de conexión/hardware debe reportar luego el
resultado. `503` indica fallo de conexión.

### Plan, horarios y registros

Usar este enum compartido en la UI para el campo `days` (el servidor es
case-sensitive):

```ts
export const WEEK_DAYS = [
  'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY',
  'FRIDAY', 'SATURDAY', 'SUNDAY',
] as const;
export type WeekDay = (typeof WEEK_DAYS)[number];
```

En una pantalla de selección, conserva `days` como array; por ejemplo una
selección lunes/miércoles/viernes es `["MONDAY", "WEDNESDAY", "FRIDAY"]`.
`time` es hora local sin zona horaria en `HH:mm`, de `00:00` a `23:59`. Evita
convertirla a UTC/ISO, porque cambiaría el horario elegido.

| Ruta | Formulario/cuerpo o query | Comportamiento |
|---|---|---|
| `POST /feeding/devices/:deviceId/plans` | `{ "maxDailyDispensedGrams": 200 }` positivo | `201 FeedingPlan`; solo puede existir un plan por dispositivo (`409`). Plan inicial deshabilitado y sin slots. |
| `GET /feeding/devices/:deviceId/plan` | — | `200 FeedingPlan` o `null`. El plan incluye `id`, `deviceId`, `slots`, `enabled`, `maxDailyDispensedGrams`. |
| `POST /feeding/devices/:deviceId/slots` | `{ "id"?: UUID, "time": "08:00", "days": ["MONDAY"], "targetGrams": 100, "enabled"?: true }` | `201 { "revision": number }`; omitir `id` crea uno. Omite `enabled` para que sea `true`. Si envía ID existente reemplaza ese slot; UUID inexistente da `400`. Requiere plan existente. |
| `DELETE /feeding/devices/:deviceId/slots/:slotId` | — | `200 { "revision": number }`. |
| `PATCH /feeding/devices/:deviceId/max-daily` | `{ "grams": 200 }` positivo | `200 { "revision": number }`. |
| `PATCH /feeding/devices/:deviceId/enabled` | `{ "enabled": true }` boolean | `200 { "revision": number }`; al activar valida capacidad y suma diaria. |
| `GET /feeding/devices/:deviceId/dispensing` | `from`, `to` opcionales ISO-8601 | `200 DispensingRecord[]`. |
| `GET /feeding/devices/:deviceId/access` | `from`, `to` opcionales ISO-8601 | `200 AccessSession[]`. |
| `GET /feeding/devices/:deviceId/consumption/:petId` | `day` opcional `YYYY-MM-DD` | `200 DailyConsumption`; omitir usar el día UTC actual del servidor. |
| `GET /feeding/devices/:deviceId/budget/:petId` | — | `200 BudgetQueryResult` para el día UTC actual. |

Un slot requiere `targetGrams > 0` y no puede superar `maxBowlGrams` del
comedero. Al activar el plan, la suma de `targetGrams` de todos los slots
habilitados no puede superar `maxDailyDispensedGrams`. Es posible guardar una
configuración que aún no pase esa validación mientras el plan está pausado;
presenta el error al activar y deja corregir slots o límite. Cada mutación de
slot/max diario/estado aplica automáticamente la configuración y retorna la
revisión. El `POST /devices/:id/apply` permite volver a solicitar la aplicación
de la configuración actual.

Ejemplo de `FeedingPlan`:

```json
{
  "id": "plan-uuid",
  "deviceId": "device-uuid",
  "enabled": false,
  "maxDailyDispensedGrams": 200,
  "slots": [{
    "id": "slot-uuid", "time": "08:00", "days": ["MONDAY", "WEDNESDAY"],
    "targetGrams": 100, "enabled": true
  }]
}
```

Historial de dispensado expone campos como `id`, `deviceId`, `slotId`, `source`
(`SCHEDULE` o `MANUAL`), `targetGrams`, `initialGrams`, `finalGrams`,
`measurementValid`, `status`, `startedAt`, `finishedAt` y `reason`. Estados:
`PENDING`, `IN_PROGRESS`, `COMPLETED`, `SKIPPED`, `FAILED`, `INTERRUPTED`.
`slotId`, mediciones, fechas y `reason` pueden ser `null`.

Sesiones de acceso incluyen `id`, `deviceId`, `tagUid`, `petId`, `accountingDay`,
`openedAt`, `closedAt`, `initialGrams`, `finalGrams`, `measurementValid`,
`status` (`OPEN`, `CLOSED`, `INTERRUPTED`) e `issue`; tolera mediciones/fechas
nulas. `DailyConsumption` devuelve `petId`, `deviceId`, `day`, `measuredGrams` y
`unknownSessions`. `BudgetQueryResult` devuelve `deviceId`, `petId`, `day`,
`dailyLimitGrams` (puede ser `null`), `consumedGrams`, `remainingGrams` (puede
ser `null`) y `completeMeasurements`. Si `completeMeasurements` es falso, al
menos una sesión carece de medición confiable; no presentes el consumo medido
como total exacto. Sin límite configurado `remainingGrams` es `null`.

Para filtrar el historial, envía ambos extremos ISO UTC cuando el usuario elija
un rango. `from` y `to` son opcionales de forma independiente. No hay paginación
ni orden contractual documentado, así que ordena por fecha en la UI si lo
necesitas y considera recargar para traer nuevos registros.

### Secuencia habitual de configuración

1. Registrar/iniciar sesión; guardar token de forma segura.
2. Crear mascota y opcionalmente registrar/asignar un tag RFID.
3. Vincular el comedero con `bindingCode`; guardar el `device.id` recibido.
4. Crear el plan; crear horarios con `days` de enum; autorizar la mascota.
5. Activar el plan y mostrar sincronización pendiente cuando
   `desiredRevision > appliedRevision`.
6. Usar presupuesto/consumo e historial para alimentar las pantallas de estado.

Usa el identificador devuelto por cada operación para la siguiente ruta, añade
`Authorization` a cada petición protegida y trata `204` como respuesta sin
cuerpo.
