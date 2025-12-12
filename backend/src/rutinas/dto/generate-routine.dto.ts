import { IsString, IsNumber, IsOptional, IsEnum } from 'class-validator';

export enum TrainingGoal {
  HYPERTROPHY = 'hypertrophy',
  STRENGTH = 'strength',
  ENDURANCE = 'endurance',
}

export class GenerateRoutineDto {
  @IsString()
  userId: string;

  @IsOptional()
  @IsEnum(TrainingGoal)
  goal?: TrainingGoal = TrainingGoal.HYPERTROPHY;

  @IsOptional()
  @IsNumber()
  availableTimeMinutes?: number = 120; // Límite temporal estricto de 2 horas

  @IsOptional()
  @IsNumber()
  currentStamina?: number; // Stamina disponible del día (se obtiene del usuario si no se proporciona)
}
