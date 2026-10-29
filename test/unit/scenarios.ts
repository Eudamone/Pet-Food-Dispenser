// scenarios.ts
// Escenarios de prueba compartidos: los mismos tests se ejecutan con la
// persistencia en memoria (test/unit/memory) y contra la BD de prueba
// (test/unit/db), para que ambos entornos validen exactamente lo mismo.
//
// Cada escenario recibe una fábrica de contextos: un contexto limpio por test
// (módulo nuevo en memoria, tablas vaciadas en la BD).

import { ConflictException, ForbiddenException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import type { EmailMessage } from '@/repositories/email.client.js';
import { AuthService } from '@/services/auth.service.js';
import { DeviceService } from '@/services/device.service.js';
import { FeedingService } from '@/services/feeding.service.js';
import { PetService } from '@/services/pet.service.js';
import { DomainError } from '@/helpers/domain.error.js';
import { Day } from '@/helpers/local-date.vo.js';
import { LocalTime } from '@/helpers/local-time.vo.js';
import { PartialDate } from '@/helpers/partial-date.vo.js';
import type { FeederDevice } from '@/models/feeder-device.model.js';
import { FeedingSlot } from '@/models/feeding-slot.model.js';
import type { User } from '@/models/user.model.js';

export interface TestContext {
  auth: AuthService;
  pets: PetService;
  feeding: FeedingService;
  devices: DeviceService;
  // Correos capturados: el cliente SMTP se reemplaza por un doble en pruebas.
  sent: EmailMessage[];
}

export type ContextFactory = () => Promise<TestContext>;

// Código de vínculo único por test: el cliente de conexión (en memoria dentro
// del módulo) recuerda los vínculos entre tests, sobre todo en la BD.
function bindingCode(): string {
  return `BIND-${randomUUID()}`;
}

async function signUp(ctx: TestContext): Promise<User> {
  const registered = await ctx.auth.register('Ana', 'ana@mail.com', 'secret1');
  expect(registered.isOk).toBe(true);
  return registered.value.user;
}

function resetToken(text: string): string {
  const match = /[?&]token=([^\s]+)/.exec(text);
  if (!match) {
    throw new Error('El correo de recuperación no contiene el enlace.');
  }
  return decodeURIComponent(match[1]);
}

function breakfastSlot(): FeedingSlot {
  return FeedingSlot.create({
    id: randomUUID(),
    time: LocalTime.parse('08:00'),
    days: [Day.MONDAY, Day.FRIDAY],
    targetGrams: 120,
  });
}

export function registerSuite(create: ContextFactory): void {
  describe('registro de usuario', () => {
    let ctx: TestContext;

    beforeEach(async () => {
      ctx = await create();
    });

    it('crea el usuario, emite un token y envía la confirmación', async () => {
      const registered = await ctx.auth.register('Ana', 'ana@mail.com', 'secret1');

      expect(registered.isOk).toBe(true);
      const { user, accessToken } = registered.value;
      expect(user.email.value).toBe('ana@mail.com');

      // El token identifica al usuario (lo que hace el JwtAuthGuard).
      const authenticated = await ctx.auth.authenticate(accessToken);
      expect(authenticated?.id).toBe(user.id);

      expect(ctx.sent).toHaveLength(1);
      expect(ctx.sent[0].to).toBe('ana@mail.com');
      expect(ctx.sent[0].subject).toContain('Confirma tu registro');
    });

    it('rechaza el registro de un correo ya usado', async () => {
      await signUp(ctx);
      const duplicate = await ctx.auth.register('Otro', 'ana@mail.com', 'otra123');

      expect(duplicate.isFailure).toBe(true);
      expect(duplicate.error).toContain('already registered');
      expect(ctx.sent).toHaveLength(1);
    });

    it('valida las credenciales al iniciar sesión', async () => {
      await signUp(ctx);

      expect((await ctx.auth.signIn('ana@mail.com', 'wrong-password')).isFailure).toBe(true);
      const signIn = await ctx.auth.signIn('ana@mail.com', 'secret1');
      expect(signIn.isOk).toBe(true);
      expect(signIn.value.user.email.value).toBe('ana@mail.com');
    });
  });
}

export function userFeederPetSuite(create: ContextFactory): void {
  describe('usuario + comedero + mascota', () => {
    let ctx: TestContext;

    beforeEach(async () => {
      ctx = await create();
    });

    it('crea la mascota y el comedero a nombre del usuario', async () => {
      const user = await signUp(ctx);

      const pet = await ctx.pets.registerPet(user, 'Firulais', 'dog', PartialDate.empty());
      expect(pet.ownerId).toBe(user.id);
      expect(pet.name).toBe('Firulais');
      expect(await ctx.pets.countPets(user)).toBe(1);

      const device = await ctx.devices.registerDevice(user, bindingCode());
      expect(device.ownerId).toBe(user.id);
      expect(device.maxBowlGrams).toBeGreaterThan(0);
      expect(await ctx.devices.listDevices(user)).toHaveLength(1);
    });

    it('vincula la mascota con el comedero', async () => {
      const user = await signUp(ctx);
      const pet = await ctx.pets.registerPet(user, 'Misu', 'cat', PartialDate.empty());
      const device = await ctx.devices.registerDevice(user, bindingCode());

      const revision = await ctx.devices.grantAccess(user, device.id, pet.id);
      expect(revision).toBeGreaterThan(0);

      const granted = await ctx.devices.getDevice(user, device.id);
      expect(granted.authorizedPetIds.has(pet.id)).toBe(true);
    });

    it('impide que otro usuario acceda al comedero', async () => {
      const owner = await signUp(ctx);
      const device = await ctx.devices.registerDevice(owner, bindingCode());

      const intruder = await ctx.auth.register('Intruso', 'intruso@mail.com', 'clave12');
      expect(intruder.isOk).toBe(true);

      await expect(ctx.devices.getDevice(intruder.value.user, device.id)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });
}

export function passwordSuite(create: ContextFactory): void {
  describe('cambio de contraseña', () => {
    let ctx: TestContext;

    beforeEach(async () => {
      ctx = await create();
      // El enlace del correo depende de estas variables; se fijan para que las
      // aserciones no dependan del entorno.
      process.env.PASSWORD_RESET_URL = 'dispensador://reset-password';
      process.env.PASSWORD_RESET_TOKEN_TTL_MINUTES = '15';
    });

    it('permite cambiar la contraseña y usar la nueva', async () => {
      const user = await signUp(ctx);

      const changed = await ctx.auth.changePassword(user.id, 'newsecret');
      expect(changed.isOk).toBe(true);

      expect((await ctx.auth.signIn('ana@mail.com', 'secret1')).isFailure).toBe(true);
      expect((await ctx.auth.signIn('ana@mail.com', 'newsecret')).isOk).toBe(true);
    });

    it('recupera la contraseña por correo y el token sirve una sola vez', async () => {
      await signUp(ctx);
      ctx.sent.length = 0;

      const requested = await ctx.auth.requestPasswordReset('ana@mail.com');
      expect(requested.isOk).toBe(true);
      expect(ctx.sent).toHaveLength(1);
      expect(ctx.sent[0].text).toContain('dispensador://reset-password?token=');

      const token = resetToken(ctx.sent[0].text);
      // El token de recuperación no sirve como token de acceso.
      expect(await ctx.auth.authenticate(token)).toBeNull();

      const confirmed = await ctx.auth.confirmPasswordReset(token, 'newsecret');
      expect(confirmed.isOk).toBe(true);
      expect((await ctx.auth.signIn('ana@mail.com', 'secret1')).isFailure).toBe(true);
      expect((await ctx.auth.signIn('ana@mail.com', 'newsecret')).isOk).toBe(true);

      const reused = await ctx.auth.confirmPasswordReset(token, 'again123');
      expect(reused.isFailure).toBe(true);
    });

    it('no revela si el correo está registrado', async () => {
      const requested = await ctx.auth.requestPasswordReset('nobody@mail.com');
      expect(requested.isOk).toBe(true);
      expect(ctx.sent).toHaveLength(0);
    });
  });
}

export function scheduleSuite(create: ContextFactory): void {
  describe('horario de alimentación', () => {
    let ctx: TestContext;
    let user: User;
    let device: FeederDevice;

    beforeEach(async () => {
      ctx = await create();
      user = await signUp(ctx);
      device = await ctx.devices.registerDevice(user, bindingCode());
    });

    it('crea el plan y guarda un horario', async () => {
      const plan = await ctx.feeding.createPlan(user, device.id, 300);
      expect(plan.deviceId).toBe(device.id);
      expect(plan.maxDailyDispensedGrams).toBe(300);
      expect(plan.enabled).toBe(false);

      const slot = breakfastSlot();
      const revision = await ctx.feeding.saveSlot(user, device.id, slot);
      expect(revision).toBeGreaterThan(0);

      const stored = await ctx.feeding.getPlan(user, device.id);
      expect(stored?.slots).toHaveLength(1);
      expect(stored?.slots[0].id).toBe(slot.id);
      expect(stored?.slots[0].time.toString()).toBe('08:00');
      expect(stored?.slots[0].days).toEqual([Day.MONDAY, Day.FRIDAY]);
      expect(stored?.slots[0].targetGrams).toBe(120);
    });

    it('activa el horario cuando entra en la ración diaria', async () => {
      await ctx.feeding.createPlan(user, device.id, 300);
      await ctx.feeding.saveSlot(user, device.id, breakfastSlot());

      const revision = await ctx.feeding.setPlanEnabled(user, device.id, true);
      expect(revision).toBeGreaterThan(0);
      expect((await ctx.feeding.getPlan(user, device.id))?.enabled).toBe(true);
    });

    it('rechaza activar el horario si excede la ración diaria', async () => {
      // El turno de 120 g supera la ración diaria de 100 g.
      await ctx.feeding.createPlan(user, device.id, 100);
      await ctx.feeding.saveSlot(user, device.id, breakfastSlot());

      await expect(ctx.feeding.setPlanEnabled(user, device.id, true)).rejects.toThrow(DomainError);
      expect((await ctx.feeding.getPlan(user, device.id))?.enabled).toBe(false);
    });

    it('rechaza un horario que supere la capacidad del plato', async () => {
      await ctx.feeding.createPlan(user, device.id, 2000);
      const slot = FeedingSlot.create({
        id: randomUUID(),
        time: LocalTime.parse('18:00'),
        days: [Day.TUESDAY],
        targetGrams: device.maxBowlGrams + 100,
      });

      await expect(ctx.feeding.saveSlot(user, device.id, slot)).rejects.toThrow(DomainError);
      expect((await ctx.feeding.getPlan(user, device.id))?.slots).toHaveLength(0);
    });

    it('no permite dos planes para el mismo comedero', async () => {
      await ctx.feeding.createPlan(user, device.id, 300);

      await expect(ctx.feeding.createPlan(user, device.id, 400)).rejects.toThrow(
        ConflictException,
      );
    });

    it('elimina un horario del plan', async () => {
      await ctx.feeding.createPlan(user, device.id, 300);
      const slot = breakfastSlot();
      await ctx.feeding.saveSlot(user, device.id, slot);

      await ctx.feeding.removeSlot(user, device.id, slot.id);

      expect((await ctx.feeding.getPlan(user, device.id))?.slots).toHaveLength(0);
    });
  });
}
