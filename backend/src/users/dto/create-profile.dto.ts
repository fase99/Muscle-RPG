import { IsNumber, IsEnum, IsBoolean, IsOptional } from 'class-validator';


export enum Genero {
    Male = 1,
    Female= 0
}


export enum NivelActividad {
    SEDENTARY = 'sedentary',
    ACTIVE = 'active',
    SPORT = 'sport',
}

export class CreateProfileDto{
    @IsOptional()
    userId?: string;

    @IsOptional()
    @IsNumber()
    age?: number;

    @IsEnum(Genero)
    gender: Genero;

    @IsNumber()
    experienceMonths: number;

    @IsNumber()
    weight: number; //kg

    @IsNumber()
    height: number //estatura

    @IsEnum(NivelActividad)
    nivelactividad: NivelActividad;

    @IsBoolean()
    condicionmedica: boolean;


    @IsOptional()
    @IsNumber()
    knownBodyFat?: number; // Porcentaje de grasa corporal conocido (método directo)

    // Método B: 7 Pliegues Cutáneos (Gold Standard) - todos en mm
    @IsOptional()
    @IsNumber()
    pliegue_triceps?: number;

    @IsOptional()
    @IsNumber()
    pliegue_deltoides?: number; // punto clavicular

    @IsOptional()
    @IsNumber()
    pliegue_pectoral?: number;

    @IsOptional()
    @IsNumber()
    pliegue_cintura?: number;

    @IsOptional()
    @IsNumber()
    pliegue_gluteo?: number;

    @IsOptional()
    @IsNumber()
    pliegue_cuadriceps?: number; // vasto externo

    @IsOptional()
    @IsNumber()
    pliegue_gastronemio?: number; // gemelar
}