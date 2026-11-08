import { Pet } from '../dist/domain/Pet.js';
import { RfidTag } from '../dist/domain/RfidTag.js';

describe('Reglas de mascota y collar', () => {
  const today = new Date(2026, 10, 5);

  it('conserva como desconocidos la especie y el límite sin configurar', () => {
    const pet = new Pet('pet-1', 'user-1', 'Luna');
    expect(pet.species).toBeNull();
    expect(pet.dailyLimitGrams).toBeNull();
    expect(pet.formatBirthDate()).toBe('Desconocida');
  });

  it('conserva la precisión del nacimiento y rechaza fechas inexistentes', () => {
    const pet = new Pet('pet-1', 'user-1', 'Luna');
    pet.setBirthDate(2022, null, null, today);
    expect(pet.formatBirthDate()).toBe('2022');
    pet.setBirthDate(2022, 5, null, today);
    expect(pet.formatBirthDate()).toBe('05/2022');
    expect(() => pet.setBirthDate(2023, 2, 29, today)).toThrow();
    expect(pet.formatBirthDate()).toBe('05/2022');
    expect(() => pet.setBirthDate(2027, null, null, today)).toThrow();
  });

  it.each([0, -1, NaN, Infinity])(
    'rechaza el límite inválido %s sin perder el anterior',
    (grams) => {
      const pet = new Pet('pet-1', 'user-1', 'Luna');
      pet.setDailyLimit(60);
      expect(() => pet.setDailyLimit(grams)).toThrow();
      expect(pet.dailyLimitGrams).toBe(60);
    },
  );

  it('conserva ceros del UID y exige desasignar antes de cambiar de mascota', () => {
    const tag = new RfidTag(' 00ab ', 'user-1');
    expect(tag.uid).toBe('00AB');
    tag.assignTo('pet-1');
    expect(() => tag.assignTo('pet-2')).toThrow();
    tag.unassign();
    tag.assignTo('pet-2');
    tag.deactivate();
    expect(tag.petId).toBe('pet-2');
    expect(tag.active).toBe(false);
  });
});
