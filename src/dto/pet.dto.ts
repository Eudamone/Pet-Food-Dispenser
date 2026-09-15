import { IsNotEmpty, IsString, IsUUID, MinLength } from 'class-validator';

export class CreatePetDto {
  @IsUUID()
  userId: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  name: string;
}

export class UpdatePetDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  name: string;
}
