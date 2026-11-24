import { Pet } from '../../../../domain/entities/Pet.js';
import { PetModel } from '../models/pet.model.js';

export class PetMapper {
  static toDomain(row: PetModel): Pet {
    const pet = new Pet(row.id, row.ownerId, row.name);
    pet.changeSpecies(row.species);
    if (row.dailyLimitGrams !== null) pet.setDailyLimit(row.dailyLimitGrams);
    pet.setBirthDate(row.birthYear, row.birthMonth, row.birthDay, new Date());
    return pet;
  }

  static toModel(pet: Pet): PetModel {
    const row = new PetModel();
    row.id = pet.id;
    row.ownerId = pet.ownerId;
    row.name = pet.name;
    row.species = pet.species;
    row.dailyLimitGrams = pet.dailyLimitGrams;
    row.birthYear = pet.birthYear;
    row.birthMonth = pet.birthMonth;
    row.birthDay = pet.birthDay;
    return row;
  }
}
