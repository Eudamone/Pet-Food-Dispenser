# Pet-Food-Dispenser

Muchas personas no pueden alimentar a sus mascotas en horarios constantes debido a sus responsabilidades. Esto provoca comidas olvidadas, horarios irregulares y porciones inadecuadas, lo que puede generar sobrealimentación y afectar su bienestar. Por ello, se requiere un dispensador automático que controle horarios y cantidades.

## Backend (API)

Backend REST en NestJS + TypeScript para el comedero inteligente.

```bash
npm install
npm run start:dev                 # PostgreSQL/Supabase (usa DATABASE_URL)
PERSISTENCE=memory npm run start:dev   # sin base de datos (datos en memoria)
```

El servidor escucha en `http://localhost:3000` (configurable con `PORT`).

Copia `.env.example` a `.env` y completa las credenciales. La recuperación de
contraseña envía un enlace por correo usando nodemailer con Gmail como host
SMTP; configura `MAIL_USER`, `MAIL_PASSWORD` (una contraseña de aplicación de
Google) y, opcionalmente, `MAIL_FROM`.

La documentación completa de endpoints, cuerpos de petición, respuestas y
ejemplos `curl` (para front y firmware) está en:

- [`docs/ENDPOINTS.md`](docs/ENDPOINTS.md)
